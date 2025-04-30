import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, redisConfig],
        }),
        AuthModule,
        UserModule,
    ],
})
export class AppModule {}
