import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = async (
    configService: ConfigService,
): Promise<JwtModuleOptions> => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: {
        expiresIn: configService.get<string>('JWT_AT_EXPIRES_IN'),
    },
});

export const jwtConstants = (configService: ConfigService) => ({
    accessToken: {
        expiresIn: configService.get<string>('JWT_AT_EXPIRES_IN'),
        cookieExpiresInDays: parseInt(
            configService.get<string>('JWT_AT_COOKIE_EXPIRES_IN'),
        ),
    },
    refreshToken: {
        expiresIn: configService.get<string>('JWT_RT_EXPIRES_IN'),
        cookieExpiresInDays: parseInt(
            configService.get<string>('JWT_RT_COOKIE_EXPIRES_IN'),
        ),
    },
});
