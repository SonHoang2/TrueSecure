import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SocketAuthGuard implements CanActivate {
    private readonly logger = new Logger(SocketAuthGuard.name);

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private userService: UserService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();
            const token = this.extractTokenFromClient(client);

            if (!token) {
                throw new WsException(
                    'Unauthorized access - no token provided',
                );
            }

            // Verify token
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('jwt.accessToken.secret'),
            });

            if (!payload || !payload.id) {
                throw new WsException('Unauthorized access - invalid token');
            }

            // Get user
            const user = await this.userService.findActiveById(payload.id);
            if (!user) {
                throw new WsException('User not found or inactive');
            }

            // Attach user to client object
            (client as any).user = user;

            return true;
        } catch (error) {
            this.logger.error(`Socket authentication failed: ${error.message}`);
            throw new WsException('Unauthorized access');
        }
    }

    private extractTokenFromClient(client: Socket): string | null {
        // Try to extract from handshake auth
        if (client.handshake.auth && client.handshake.auth.token) {
            return client.handshake.auth.token;
        }

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
