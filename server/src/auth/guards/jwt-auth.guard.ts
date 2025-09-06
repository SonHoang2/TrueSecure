import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { UserService } from 'src/user/user.service';
import { DeviceService } from 'src/device/device.service';

interface JwtPayload {
    id: number;
    deviceUuid: string;
    iat: number;
    exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly deviceService: DeviceService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const { accessToken, refreshToken } = request.cookies;

        if (refreshToken) {
            return true;
        }

        if (!accessToken) {
            throw new UnauthorizedException('Access token expired');
        }

        let decoded: JwtPayload;
        try {
            decoded = this.jwtService.verify<JwtPayload>(accessToken, {
                secret: process.env.JWT_SECRET,
            });
        } catch (err) {
            throw new UnauthorizedException('Invalid token');
        }

        const user = await this.userService.findActiveById(decoded.id);
        if (!user) {
            throw new UnauthorizedException(
                'User does not exist or is inactive',
            );
        }

        if (user.changedPasswordAfter(decoded.iat)) {
            throw new UnauthorizedException(
                'Password was changed after token issued',
            );
        }

        const deviceUuid = decoded.deviceUuid;
        if (deviceUuid) {
            try {
                await this.deviceService.updateLastSeen(deviceUuid);
            } catch (error) {
                console.log('Failed to update device lastSeen:', error);
            }
        }

        request.user = user;
        request.deviceUuid = deviceUuid;

        return true;
    }
}
