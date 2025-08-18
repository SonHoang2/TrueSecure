import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { parseTimeToMilliseconds } from 'src/common/utils/time.utils';

@Injectable()
export class RedisService implements OnModuleInit {
    private readonly logger = new Logger(RedisService.name);

    constructor(@InjectRedis() private readonly redis: Redis) {
        this.setupConnectionListeners();
    }

    async onModuleInit() {
        await this.testConnection();
    }

    private setupConnectionListeners() {
        this.redis.on('connect', () => {
            this.logger.log('🔄 Redis connecting...');
        });

        this.redis.on('ready', () => {
            this.logger.log('✅ Redis connected and ready!');
        });

        this.redis.on('error', (error) => {
            this.logger.error('❌ Redis connection error:', error.message);
        });

        this.redis.on('close', () => {
            this.logger.warn('🔴 Redis connection closed');
        });

        this.redis.on('reconnecting', () => {
            this.logger.log('🔄 Redis reconnecting...');
        });

        this.redis.on('end', () => {
            this.logger.warn('🛑 Redis connection ended');
        });
    }

    async testConnection(): Promise<boolean> {
        try {
            const result = await this.redis.ping();
            this.logger.log(`🏓 Redis ping successful: ${result}`);
            return true;
        } catch (error) {
            this.logger.error('❌ Redis ping failed:', error.message);
            return false;
        }
    }

    async getConnectionStatus(): Promise<{
        connected: boolean;
        status: string;
        host: string;
        port: number;
        db: number;
    }> {
        try {
            await this.redis.ping();
            return {
                connected: true,
                status: this.redis.status,
                host: this.redis.options.host,
                port: this.redis.options.port,
                db: this.redis.options.db,
            };
        } catch (error) {
            return {
                connected: false,
                status: 'disconnected',
                host: this.redis.options.host,
                port: this.redis.options.port,
                db: this.redis.options.db,
            };
        }
    }

    // Token storage methods
    async storeRefreshToken(
        token: string,
        userId: string,
        expiresInDays: number,
    ): Promise<void> {
        const ttlSeconds = expiresInDays * 86400;

        await this.redis.set(token, userId, 'EX', ttlSeconds);
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
        expiresInStr: string, // e.g. "7d"
    ): Promise<void> {
        const ttlSeconds = parseTimeToMilliseconds(expiresInStr) / 1000;

        await this.redis
            .multi()
            .set(token, userId, 'EX', ttlSeconds)
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
