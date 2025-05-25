import { Injectable } from '@nestjs/common';
import { SocketManagerService } from './services/socket-manager/socket-manager.service';
import { SocketCacheService } from './services/socket-cache/socket-cache.service';
import { ConversationService } from 'src/conversation/conversation.service';
import { MessageStatus } from 'src/common/enum/message-status.enum';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { PrivateMessageDto } from './dto/message/private-message.dto';
import { GroupMessageDto } from './dto/message/group-message.dto';
import { MessageStatusDto } from './dto/message/message-status.dto';

@Injectable()
export class SocketService {
    constructor(
        private readonly socketManagerService: SocketManagerService,
        private readonly socketCacheService: SocketCacheService,
        private readonly conversationService: ConversationService,
        private readonly rabbitmqService: RabbitmqService,
    ) {}

    async sendPrivateMessage(data: PrivateMessageDto): Promise<void> {
        const { receiverId, senderId, id } = data;

        // Notify receiver if online
        const receiverSocketId =
            await this.socketCacheService.getSocketId(receiverId);
        if (receiverSocketId) {
            await this.socketManagerService.emitToUser(
                receiverId,
                'new-private-message',
                data,
            );
        } else {
            // If receiver is offline, store the message in cache
            await this.rabbitmqService.sendOfflineMessage(receiverId, data);
        }

        // Notify sender about message status
        await this.socketManagerService.emitToUser(
            senderId,
            'private-message-status-update',
            {
                messageId: id,
                status: MessageStatus.SENT,
            },
        );
    }

    async sendGroupMessage(data: GroupMessageDto): Promise<void> {
        const { conversationId, senderId, id } = data;

        // Find all participants except sender
        const participants =
            await this.conversationService.getOtherParticipantsInConversation(
                conversationId,
                +senderId,
            );

        // Notify all participants
        for (const participant of participants) {
            await this.socketManagerService.emitToUser(
                participant.userId,
                'new-group-message',
                {
                    ...data,
                },
            );
        }

        // Notify sender
        await this.socketManagerService.emitToUser(
            senderId,
            'group-message-status-update',
            {
                messageId: id,
                status: MessageStatus.SENT,
            },
        );
    }

    async updatePrivateMessageStatus(data: MessageStatusDto): Promise<void> {
        await this.socketManagerService.emitToUser(
            data.senderId,
            'private-message-status-update',
            {
                messageId: data.messageId,
                status: MessageStatus.SEEN,
            },
        );
    }

    async updateGroupMessageStatus(data: MessageStatusDto): Promise<void> {
        const { messageId, senderId, conversationId } = data;

        // Notify all participants in the group
        const participants =
            await this.conversationService.getAllParticipantsInConversation(
                conversationId,
            );

        for (const participant of participants) {
            await this.socketManagerService.emitToUser(
                participant.userId,
                'group-message-status-update',
                {
                    messageId: messageId,
                    status: MessageStatus.SEEN,
                    userId: senderId,
                },
            );
        }
    }
}
