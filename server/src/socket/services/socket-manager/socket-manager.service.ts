import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SocketCacheService } from '../socket-cache/socket-cache.service';
import { SocketUser } from 'src/socket/interfaces/socket-user.interface';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class SocketManagerService {
    private readonly logger = new Logger(SocketManagerService.name);
    private server: Server;

    constructor(
        private readonly socketCacheService: SocketCacheService,
        private readonly rabbitmqService: RabbitmqService,
    ) {}

    setServer(server: Server): void {
        this.server = server;
    }

    getServer(): Server {
        return this.server;
    }

    async handleConnection(client: SocketUser): Promise<void> {
        if (!client.user) {
            this.logger.error('Client connected without user data');
            return;
        }

        const user = client.user;

        // Add user to online users
        await this.socketCacheService.addOnlineUser(user.id, client.id);

        await this.rabbitmqService.consumeMessages(user.id, client.id);

        // Clean up stale connections
        await this.cleanupStaleConnections();

        // Broadcast updated online status
        await this.broadcastOnlineStatus();
    }

    async handleDisconnect(client: Socket): Promise<void> {
        const user = (client as any).user as SocketUser;
        if (!user) return;

        // Remove user from online users and update last seen
        await this.socketCacheService.removeOnlineUser(user.id);
        await this.socketCacheService.updateLastSeen(user.id);
        await this.rabbitmqService.cancelConsumeMessages(user.id);
        // Broadcast updated online status
        await this.broadcastOnlineStatus();
    }

    async cleanupStaleConnections(): Promise<void> {
        try {
            const connectedSockets = await this.server.fetchSockets();
            const activeSocketIds = new Set(connectedSockets.map((s) => s.id));

            const hasChanges =
                await this.socketCacheService.checkAndRemoveStaleConnections(
                    activeSocketIds,
                );

            if (hasChanges) {
                await this.broadcastOnlineStatus();
            }
        } catch (error) {
            this.logger.error(
                `Error cleaning stale connections: ${error.message}`,
            );
        }
    }

    async broadcastOnlineStatus(): Promise<void> {
        const onlineStatus = await this.socketCacheService.getOnlineStatus();
        console.log('Online users: ', onlineStatus.onlineUsers);
        this.server.emit('online-users', onlineStatus);
    }

    async emitToUser(
        userId: number | string,
        event: string,
        data: any,
    ): Promise<void> {
        const socketId = await this.socketCacheService.getSocketId(userId);
        if (socketId) {
            this.server.to(socketId).emit(event, data);
        }
    }
}
