import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
    constructor(@InjectRedis() private readonly redis: Redis) {}

    // Token storage methods
    async storeRefreshToken(
        token: string,
        userId: string,
        expiresInDays: number,
    ): Promise<void> {
        await this.redis.set(token, userId, 'EX', expiresInDays * 86400);
    }

    async getRefreshTokenUserId(token: string): Promise<string | null> {
        return this.redis.get(token);
    }

    async deleteRefreshToken(token: string): Promise<void> {
        await this.redis.del(token);
    }

    // User tokens management
    async addUserToken(userId: number | string, token: string): Promise<void> {
        await this.redis.sadd(`user:${userId}:tokens`, token);
    }

    async removeUserToken(
        userId: number | string,
        token: string,
    ): Promise<void> {
        await this.redis.srem(`user:${userId}:tokens`, token);
    }

    async getUserTokens(userId: number | string): Promise<string[]> {
        return this.redis.smembers(`user:${userId}:tokens`);
    }

    async deleteUserTokens(userId: number | string): Promise<void> {
        const userTokensKey = `user:${userId}:tokens`;
        const tokens = await this.getUserTokens(userId);

        if (tokens.length > 0) {
            await Promise.all(tokens.map((token) => this.redis.del(token)));
            await this.redis.del(userTokensKey);
        }
    }

    // Transaction support
    async storeRefreshTokenWithUserTracking(
        token: string,
        userId: string,
        expiresInDays: number,
    ): Promise<void> {
        await this.redis
            .multi()
            .set(token, userId, 'EX', expiresInDays * 86400)
            .sadd(`user:${userId}:tokens`, token)
            .exec();
    }

    async storeValue(
        collection: string,
        key: string,
        value: string,
    ): Promise<void> {
        await this.redis.hset(collection, key, value);
    }

    async getValue(collection: string, key: string): Promise<string | null> {
        return this.redis.hget(collection, key);
    }

    async deleteValue(collection: string, key: string): Promise<void> {
        await this.redis.hdel(collection, key);
    }

    async getAllValues(collection: string): Promise<Record<string, string>> {
        return this.redis.hgetall(collection);
    }
}
