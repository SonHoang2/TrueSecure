import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
    constructor(private readonly redisService: RedisService) {}

    @Get('redis')
    async checkRedis() {
        try {
            const status = await this.redisService.getConnectionStatus();
            const isConnected = await this.redisService.testConnection();

            return {
                service: 'redis',
                status: isConnected ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                details: status,
            };
        } catch (error) {
            return {
                service: 'redis',
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }

    @Get()
    async checkOverall() {
        const redisCheck = await this.checkRedis();

        return {
            status: redisCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: redisCheck,
            },
        };
    }
}
