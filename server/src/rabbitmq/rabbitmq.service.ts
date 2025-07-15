import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, Connection, connect, ConsumeMessage } from 'amqplib';
import { Server } from 'socket.io';

type Result<T> = { success: true; data: T } | { success: false; error: string };

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private consumerTags: Map<string, string> = new Map();
    private io: Server;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private rabbitmqUrl: string;

    constructor(private configService: ConfigService) {
        this.rabbitmqUrl =
            this.configService.get<string>('RABBITMQ_URL') ||
            'amqp://localhost:5672';
    }

    setSocketServer(io: Server) {
        this.io = io;
    }

    async onModuleInit() {
        try {
            this.connection = await connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            await this.channel.prefetch(1);
            console.log('✅ Connected to RabbitMQ');
        } catch (error) {
            console.error('❌ RabbitMQ connection error:', error);
        }
    }

    getChannel(): Channel | null {
        return this.channel;
    }

    async ensureConnection(): Promise<boolean> {
        if (this.connection && this.channel) {
            return true;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return false;
        }

        try {
            this.reconnectAttempts++;
            console.log(
                `🔄 Attempting to reconnect to RabbitMQ (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            );

            this.connection = await connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            await this.channel.prefetch(1);
            this.reconnectAttempts = 0;
            console.log('✅ Reconnected to RabbitMQ');
            return true;
        } catch (error) {
            console.error('❌ RabbitMQ reconnection failed:', error);
            return false;
        }
    }

    private async safeExecute<T>(
        operation: () => Promise<T>,
        errorContext: string,
    ): Promise<Result<T>> {
        try {
            const data = await operation();
            return { success: true, data };
        } catch (error) {
            console.error(`❌ ${errorContext}:`, error);
            return { success: false, error: error.message };
        }
    }

    private safeParse(content: string): Result<any> {
        try {
            return { success: true, data: JSON.parse(content) };
        } catch (error) {
            return { success: false, error: 'Invalid JSON format' };
        }
    }

    private safeAck(msg: ConsumeMessage, userId: string): void {
        this.safeExecute(
            () => Promise.resolve(this.channel.ack(msg)),
            `Acknowledging message for user ${userId}`,
        );
    }

    private safeNack(
        msg: ConsumeMessage,
        userId: string,
        requeue = true,
    ): void {
        this.safeExecute(
            () => Promise.resolve(this.channel.nack(msg, false, requeue)),
            `Negative acknowledging message for user ${userId}`,
        );
    }

    async sendOfflineMessage(
        receiverId: string,
        message: any,
    ): Promise<Result<void>> {
        const connectionResult = await this.safeExecute(
            () => this.ensureConnection(),
            'Ensuring RabbitMQ connection',
        );

        if (!connectionResult.success || !connectionResult.data) {
            return {
                success: false,
                error: 'RabbitMQ connection not available',
            };
        }

        return this.safeExecute(async () => {
            const queue = `offline_user_${receiverId}`;
            await this.channel.assertQueue(queue, { durable: true });
            this.channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(message)),
                {
                    persistent: true,
                },
            );
        }, `Sending offline message to user ${receiverId}`);
    }

    async consumeMessages(
        userId: string,
        socketId: string,
    ): Promise<Result<void>> {
        if (!this.channel) {
            return {
                success: false,
                error: 'RabbitMQ channel not initialized',
            };
        }

        return this.safeExecute(async () => {
            const queue = `offline_user_${userId}`;
            await this.channel.assertQueue(queue, {
                durable: true,
            });

            const { consumerTag } = await this.channel.consume(
                queue,
                (msg) => this.handleMessage(msg, userId, socketId),
                { noAck: false },
            );

            this.consumerTags.set(userId, consumerTag);
            console.log(`✅ Started consuming messages for user ${userId}`);
        }, `Setting up consumer for user ${userId}`);
    }

    private handleMessage(
        msg: ConsumeMessage | null,
        userId: string,
        socketId: string,
    ): void {
        if (!msg) return;

        const parseResult = this.safeParse(msg.content.toString());
        if (parseResult.success === false) {
            console.error(
                `❌ Parse error for user ${userId}: ${parseResult.error}`,
            );
            this.safeAck(msg, userId);
            return;
        }

        const socket = this.getValidSocket(socketId);
        if (socket.success === false) {
            console.log(
                `❌ Socket validation failed for user ${userId}: ${socket.error}`,
            );
            this.safeNack(msg, userId, true);
            return;
        }

        this.sendMessageWithAck(socket.data, parseResult.data, msg, userId);
    }

    private getValidSocket(socketId: string): Result<any> {
        const socket = this.io.sockets.sockets.get(socketId);

        if (!socket || !socket.connected) {
            return { success: false, error: 'Socket not connected' };
        }

        return { success: true, data: socket };
    }

    private sendMessageWithAck(
        socket: any,
        message: any,
        msg: ConsumeMessage,
        userId: string,
    ): void {
        const timeoutId = setTimeout(() => {
            console.log(
                `⏰ Acknowledgment timeout for user ${userId}, message ${message.id}`,
            );
            this.safeNack(msg, userId, true);
        }, 5000);

        socket.emit('new-private-message', message, (ackResponse: boolean) => {
            clearTimeout(timeoutId);
            if (ackResponse) {
                console.log(`✅ Message acknowledged for user ${userId}`);
                this.safeAck(msg, userId);
            } else {
                console.log(`❌ Message rejected by client for user ${userId}`);
                this.safeNack(msg, userId, true);
            }
        });
    }

    async cancelConsumeMessages(userId: string): Promise<Result<any>> {
        const consumerTag = this.consumerTags.get(userId);

        if (!consumerTag || !this.channel) {
            return { success: false, error: 'No active consumer found' };
        }

        const result = await this.safeExecute(
            () => this.channel.cancel(consumerTag),
            `Canceling consumer for user ${userId}`,
        );

        if (result.success) {
            this.consumerTags.delete(userId);
        }

        return result;
    }

    async onModuleDestroy() {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
        console.log('🔌 Disconnected from RabbitMQ');
    }
}
