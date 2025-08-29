import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SocketCacheService {
    private readonly logger = new Logger(SocketCacheService.name);

    constructor(private readonly redisService: RedisService) {}

    async addOnlineUser(
        userId: string | number,
        deviceUuid: string,
        socketId: string,
    ): Promise<void> {
        if (!userId || !deviceUuid || !socketId) {
            throw new Error('Invalid parameters to add online user');
        }

        console.log(
            `Storing deviceUuid: ${deviceUuid}, socketId: ${socketId} for userId: ${userId}`,
        );

        await this.redisService.storeValue(
            `onlineDevices:${userId}`,
            deviceUuid,
            socketId,
        );
    }

    async removeOnlineUser(
        userId: string | number,
        deviceUuid: string,
    ): Promise<void> {
        await this.redisService.deleteValue(
            `onlineDevices:${userId}`,
            deviceUuid,
        );
    }

    async updateLastSeen(userId: string | number): Promise<void> {
        await this.redisService.storeValue(
            'lastSeen',
            userId.toString(),
            new Date().toISOString(),
        );
    }

    async getSocketId(
        userId: string | number,
        deviceUuid: string,
    ): Promise<string | null> {
        return this.redisService.getValue(
            `onlineDevices:${userId}`,
            deviceUuid,
        );
    }

    async getDevicesByUserId(
        userId: string | number,
    ): Promise<Record<string, string>> {
        return this.redisService.getAllValues(`onlineDevices:${userId}`);
    }

    async getOnlineStatus(): Promise<{
        onlineUsers: number[];
        lastSeen: Record<string, string>;
    }> {
        const lastSeen = await this.redisService.getAllValues('lastSeen');
        const onlineUsersSet = new Set<number>();
        const keys = await this.redisService.scanKeys('onlineDevices:*');
        for (const key of keys) {
            const userId = key.split(':')[1];
            onlineUsersSet.add(Number(userId));
        }
        return { onlineUsers: Array.from(onlineUsersSet), lastSeen };
    }

    async checkAndRemoveStaleConnections(
        userIds: Array<string | number>,
        activeSocketIds: Set<string>,
    ): Promise<boolean> {
        let hasChanges = false;
        for (const userId of userIds) {
            const devices = await this.redisService.getAllValues(
                `onlineDevices:${userId}`,
            );
            for (const [deviceUuid, socketId] of Object.entries(devices)) {
                if (!activeSocketIds.has(socketId)) {
                    await this.removeOnlineUser(userId, deviceUuid);
                    await this.updateLastSeen(userId);
                    hasChanges = true;
                }
            }
        }
        return hasChanges;
    }
}
