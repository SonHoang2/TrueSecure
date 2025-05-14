import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { OnlineStatus } from '../../interfaces/online-status.interface';

@Injectable()
export class SocketCacheService {
    private readonly logger = new Logger(SocketCacheService.name);

    constructor(private readonly redisService: RedisService) {}

    async addOnlineUser(
        userId: string | number,
        socketId: string,
    ): Promise<void> {
        await this.redisService.storeValue(
            'onlineUsers',
            userId.toString(),
            socketId,
        );
        this.logger.debug(
            `User ${userId} added to online users with socket ID ${socketId}`,
        );
    }

    async removeOnlineUser(userId: string | number): Promise<void> {
        await this.redisService.deleteValue('onlineUsers', userId.toString());
        this.logger.debug(`User ${userId} removed from online users`);
    }

    async updateLastSeen(userId: string | number): Promise<void> {
        await this.redisService.storeValue(
            'lastSeen',
            userId.toString(),
            new Date().toISOString(),
        );
        this.logger.debug(`Last seen updated for user ${userId}`);
    }

    async getSocketId(userId: string | number): Promise<string | null> {
        return this.redisService.getValue('onlineUsers', userId.toString());
    }

    async getOnlineStatus(): Promise<OnlineStatus> {
        const [onlineUsers, lastSeen] = await Promise.all([
            this.redisService.getAllValues('onlineUsers'),
            this.redisService.getAllValues('lastSeen'),
        ]);

        return { onlineUsers, lastSeen };
    }

    async checkAndRemoveStaleConnections(
        activeSocketIds: Set<string>,
    ): Promise<boolean> {
        const onlineUsers = await this.redisService.getAllValues('onlineUsers');
        let hasChanges = false;

        for (const [userId, socketId] of Object.entries(onlineUsers)) {
            if (!activeSocketIds.has(socketId)) {
                await this.removeOnlineUser(userId);
                await this.updateLastSeen(userId);
                this.logger.log(
                    `Cleaned up stale connection for user ${userId}`,
                );
                hasChanges = true;
            }
        }

        return hasChanges;
    }
}
