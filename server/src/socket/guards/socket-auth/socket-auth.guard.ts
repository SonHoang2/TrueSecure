import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SocketAuthService } from 'src/socket/services/socket-auth/socket-auth.service';

@Injectable()
export class SocketAuthGuard implements CanActivate {
    constructor(private readonly socketAuthService: SocketAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client = context.switchToWs().getClient();
        await this.socketAuthService.validateSocket(client);
        return true;
    }
}
