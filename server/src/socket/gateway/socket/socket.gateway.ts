import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { SocketAuthGuard } from 'src/socket/guards/socket-auth/socket-auth.guard';
import { SocketManagerService } from 'src/socket/services/socket-manager/socket-manager.service';
import { SocketService } from 'src/socket/socket.service';
import {
    PrivateMessageDto,
    MessageSeenDto,
} from '../../dto/message/message.dto';
import {
    OfferDto,
    AnswerDto,
    IceCandidateDto,
    CallActionDto,
} from '../../dto/call/call.dto';
import { Logger } from '@nestjs/common';
import { SocketUser } from 'src/socket/interfaces/socket-user.interface';
import { SocketAuthService } from 'src/socket/services/socket-auth/socket-auth.service';
import { MessageStatus } from 'src/common/enum/message-status.enum';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
})
@UseGuards(SocketAuthGuard)
export class SocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(SocketGateway.name);

    @WebSocketServer() server: Server;

    constructor(
        private readonly socketManagerService: SocketManagerService,
        private readonly socketService: SocketService,
        private readonly socketAuthService: SocketAuthService,
        private readonly rabbitmqService: RabbitmqService,
    ) {}

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
        this.socketManagerService.setServer(server);
        this.rabbitmqService.setSocketServer(server);
        // Set up periodic cleanup (every 5 minutes)
        setInterval(() => {
            this.socketManagerService.cleanupStaleConnections();
        }, 300000); // 5 minutes
    }

    async handleConnection(@ConnectedSocket() client: SocketUser) {
        try {
            await this.socketAuthService.validateSocket(client);
            await this.socketManagerService.handleConnection(client);
        } catch (error) {
            this.logger.error(`Error handling connection: ${error.message}`);
            client.disconnect();
        }
    }

    async handleDisconnect(@ConnectedSocket() client: SocketUser) {
        try {
            await this.socketManagerService.handleDisconnect(client);
        } catch (error) {
            this.logger.error(`Error handling disconnect: ${error.message}`);
        }
    }

    @SubscribeMessage('offer')
    async handleOffer(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: OfferDto,
    ) {
        try {
            const user = (client as any).user;
            data.sender = user;

            await this.socketManagerService.emitToUser(
                data.receiverId,
                'offer',
                {
                    offer: data.offer,
                    sender: user,
                    isVideo: data.isVideo,
                },
            );
        } catch (error) {
            this.logger.error(`Error handling offer: ${error.message}`);
        }
    }

    @SubscribeMessage('answer')
    async handleAnswer(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: AnswerDto,
    ) {
        try {
            await this.socketManagerService.emitToUser(
                data.receiverId,
                'answer',
                { answer: data.answer },
            );
        } catch (error) {
            this.logger.error(`Error handling answer: ${error.message}`);
        }
    }

    @SubscribeMessage('ice-candidate')
    async handleIceCandidate(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: IceCandidateDto,
    ) {
        try {
            await this.socketManagerService.emitToUser(
                data.receiverId,
                'ice-candidate',
                { candidate: data.candidate },
            );
        } catch (error) {
            this.logger.error(`Error handling ICE candidate: ${error.message}`);
        }
    }

    @SubscribeMessage('call-rejected')
    async handleCallRejected(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: CallActionDto,
    ) {
        try {
            await this.socketManagerService.emitToUser(
                data.receiverId,
                'call-rejected',
                {},
            );
        } catch (error) {
            this.logger.error(
                `Error handling call rejection: ${error.message}`,
            );
        }
    }

    @SubscribeMessage('call-ended')
    async handleCallEnded(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: CallActionDto,
    ) {
        try {
            await this.socketManagerService.emitToUser(
                data.receiverId,
                'call-ended',
                {},
            );
        } catch (error) {
            this.logger.error(`Error handling call end: ${error.message}`);
        }
    }

    @SubscribeMessage('send-private-message')
    async handlePrivateMessage(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: PrivateMessageDto,
    ) {
        try {
            await this.socketService.sendPrivateMessage(data);
        } catch (error) {
            this.logger.error(
                `Error handling private message: ${error.message}`,
            );
        }
    }

    @SubscribeMessage('private-message-seen')
    async handlePrivateMessageSeen(
        @ConnectedSocket() client: SocketUser,
        @MessageBody() data: MessageSeenDto,
    ) {
        try {
            await this.socketManagerService.emitToUser(
                data.senderId,
                'private-message-status-update',
                {
                    messageId: data.messageId,
                    status: MessageStatus.SEEN,
                },
            );
        } catch (error) {
            this.logger.error(
                `Error handling private message seen: ${error.message}`,
            );
        }
    }

    // @SubscribeMessage('send-group-message')
    // async handleGroupMessage(
    //     @ConnectedSocket() client: SocketUser,
    //     @MessageBody() data: GroupMessageDto,
    // ) {
    //     try {
    //         await this.socketService.sendGroupMessage(data);
    //     } catch (error) {
    //         this.logger.error(`Error handling group message: ${error.message}`);
    //     }
    // }

    // @SubscribeMessage('group-message-seen')
    // async handleGroupMessageSeen(
    //     @ConnectedSocket() client: SocketUser,
    //     @MessageBody() data: GroupMessageSeenDto,
    // ) {
    //     try {
    //         await this.socketService.updateGroupMessageStatus(data);
    //     } catch (error) {
    //         this.logger.error(
    //             `Error handling group message seen: ${error.message}`,
    //         );
    //     }
    // }
}
