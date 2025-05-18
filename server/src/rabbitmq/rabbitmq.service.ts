import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Channel, Connection, connect, ConsumeMessage } from 'amqplib';
import { Server } from 'socket.io';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private consumerTags: Map<string, string> = new Map();
    private io: Server;

    setSocketServer(io: Server) {
        this.io = io;
    }

    async onModuleInit() {
        try {
            this.connection = await connect('amqp://localhost');
            this.channel = await this.connection.createChannel();
            console.log('✅ Connected to RabbitMQ');
        } catch (error) {
            console.error('❌ RabbitMQ connection error:', error);
        }
    }

    getChannel(): Channel | null {
        return this.channel;
    }

    async sendOfflineMessage(receiverId: string, message: any) {
        if (!this.channel) throw new Error('RabbitMQ channel not initialized');

        const queue = `offline_user_${receiverId}`;
        await this.channel.assertQueue(queue, { durable: true });
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });

        // console.log(`📤 Sent message to offline user ${receiverId}`, message);
    }

    async consumeMessages(userId: string, socketId: string) {
        if (!this.channel) throw new Error('RabbitMQ channel not initialized');

        const queue = `offline_user_${userId}`;
        const queueInfo = await this.channel.assertQueue(queue, {
            durable: true,
        });

        console.log(`Queue "${queue}" info:`, queueInfo);

        const { consumerTag } = await this.channel.consume(
            queue,
            async (msg: ConsumeMessage | null) => {
                if (msg !== null) {
                    const message = JSON.parse(msg.content.toString());

                    const [ackResponse] = await this.io
                        .to(socketId)
                        .timeout(10000)
                        .emitWithAck('new-private-message', {
                            ...message,
                            messageId: message.messageId,
                        });

                    if (ackResponse) {
                        this.channel.ack(msg);
                    } else {
                        this.channel.nack(msg, false, true);
                    }
                }
            },
            { noAck: false },
        );

        this.consumerTags.set(userId, consumerTag);
        console.log(`✅ Started consuming messages for user ${userId}`);
    }

    async cancelConsumeMessages(userId: string) {
        const consumerTag = this.consumerTags.get(userId);
        if (consumerTag && this.channel) {
            await this.channel.cancel(consumerTag);
            this.consumerTags.delete(userId);
            console.log(`🛑 Stopped consuming for user ${userId}`);
        }
    }

    async onModuleDestroy() {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
        console.log('🔌 Disconnected from RabbitMQ');
    }
}
