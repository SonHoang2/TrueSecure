import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [RedisModule],
    controllers: [HealthController],
})
export class HealthModule {}
