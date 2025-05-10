import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from 'src/user/user.service';

interface JwtPayload {
    id: number;
    iat: number;
    exp: number;
}

interface User {
    id: number;
}

interface RequestWithUser extends Request {
    user: User;
}

@Injectable()
export class JwtGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
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
        console.log('Access token verified:', accessToken);
        request.user = user;

        console.log('User found:', user);

        return true;
    }
}
