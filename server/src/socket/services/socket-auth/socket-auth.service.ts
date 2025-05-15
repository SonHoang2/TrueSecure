import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SocketAuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private userService: UserService,
    ) {}

    async validateSocket(client: Socket): Promise<User> {
        const token = this.extractToken(client);
        if (!token) throw new WsException('Unauthorized');

        const payload = this.jwtService.verify(token, {
            secret: this.configService.get('jwt.secret'),
        });

        const user = await this.userService.findActiveById(payload.id);
        if (!user) throw new WsException('Unauthorized');

        (client as any).user = user;
        return user;
    }

    private extractToken(client: Socket): string | null {
        // Try to extract from handshake headers (cookies)
        if (client.handshake.headers.cookie) {
            const cookies = client.handshake.headers.cookie.split(';');
            const tokenCookie = cookies.find((cookie) =>
                cookie.trim().startsWith('accessToken='),
            );
            if (tokenCookie) {
                return tokenCookie.split('=')[1];
            }
        }

        return null;
    }
}
