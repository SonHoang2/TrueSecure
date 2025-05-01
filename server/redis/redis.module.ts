import { Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
        NestRedisModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'single',
                host: configService.get<string>('redis.host'),
                port: configService.get<number>('redis.port'),
            }),
        }),
    ],
    exports: [NestRedisModule],
})
export class RedisModule {}
