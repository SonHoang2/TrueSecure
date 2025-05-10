import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtGuard } from './jwt/jwt.guard';

@Module({
    controllers: [AuthController],
    providers: [AuthService, JwtGuard],
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
    ],
    exports: [JwtGuard, JwtModule],
})
export class AuthModule {}
