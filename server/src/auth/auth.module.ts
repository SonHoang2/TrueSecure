import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { RedisModule } from 'src/redis/redis.module';
import { DeviceModule } from 'src/device/device.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
    controllers: [AuthController],
    providers: [AuthService, JwtAuthGuard],
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret'),
                signOptions: {
                    expiresIn: configService.get<string>(
                        'jwt.accessToken.expiresIn',
                    ),
                },
            }),
            inject: [ConfigService],
        }),
        forwardRef(() => UserModule),
        RedisModule,
        forwardRef(() => DeviceModule),
    ],
    exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
