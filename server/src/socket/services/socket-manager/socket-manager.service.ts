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
        try {
            if (!client.user) {
                this.logger.error('Client connected without user data');
                return;
            }

            const user = client.user;
            const deviceUuidRaw = client.handshake?.query?.deviceUuid as string;

            const deviceUuid = deviceUuidRaw.replace(/^"|"$/g, '');

            // Add user to online users
            await this.socketCacheService.addOnlineUser(
                user.id,
                deviceUuid,
                client.id,
            );

            await this.rabbitmqService.consumeMessages(user.id, client.id);

            // Clean up stale connections
            await this.cleanupStaleConnections();

            // Broadcast updated online status
            await this.broadcastOnlineStatus();
        } catch (error) {
            this.logger.error(`Error handling connection: ${error.message}`);
            client.disconnect(true);
            return;
        }
    }

    async handleDisconnect(client: Socket): Promise<void> {
        try {
            const user = (client as any).user as SocketUser;
            if (!user) return;

            const deviceUuid = client.handshake?.query?.deviceUuid as string;
            // Remove user from online users and update last seen
            await this.socketCacheService.removeOnlineUser(user.id, deviceUuid);
            await this.socketCacheService.updateLastSeen(user.id);
            await this.rabbitmqService.cancelConsumeMessages(user.id);
            await this.broadcastOnlineStatus();
        } catch (error) {
            this.logger.error(`Error handling disconnect: ${error.message}`);
        }
    }

    async cleanupStaleConnections(): Promise<void> {
        try {
            const connectedSockets = await this.server.fetchSockets();
            const activeSocketIds = new Set(connectedSockets.map((s) => s.id));
            const { onlineUsers } =
                await this.socketCacheService.getOnlineStatus();
            const hasChanges =
                await this.socketCacheService.checkAndRemoveStaleConnections(
                    onlineUsers,
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
        console.log('online users: ', onlineStatus.onlineUsers);
        this.server.emit('online-users', onlineStatus);
    }

    async emitToUser({
        userId,
        event,
        data,
        deviceUuid,
    }: {
        userId: number | string;
        event: string;
        data: any;
        deviceUuid: string;
    }): Promise<void> {
        const socketId = await this.socketCacheService.getSocketId(
            userId,
            deviceUuid,
        );
        console.log('socketId: ', JSON.stringify(socketId), data);

        if (socketId) {
            this.server.to(socketId).emit(event, data);
        }
    }
}
