import { Injectable, Logger } from '@nestjs/common';
import { SocketManagerService } from './services/socket-manager/socket-manager.service';
import { SocketCacheService } from './services/socket-cache/socket-cache.service';
import { ConversationService } from 'src/conversation/conversation.service';
import { MessageStatus } from 'src/common/enum/message-status.enum';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { PrivateMessageDto } from './dto/message/private-message.dto';
import { GroupMessageDto } from './dto/message/group-message.dto';
import { GroupMessageSeenDto } from './dto/message/group-message-seen.dto';

@Injectable()
export class SocketService {
    private readonly logger = new Logger(SocketService.name);

    constructor(
        private readonly socketManagerService: SocketManagerService,
        private readonly socketCacheService: SocketCacheService,
        private readonly conversationService: ConversationService,
        private readonly rabbitmqService: RabbitmqService,
    ) {}

    async sendPrivateMessage(data: PrivateMessageDto): Promise<void> {
        const { receiverId, senderId, messageId } = data;

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
                messageId,
                status: MessageStatus.SENT,
            },
        );
    }

    async sendGroupMessage(data: GroupMessageDto): Promise<void> {
        try {
            const { conversationId, senderId } = data;

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
                    messageId: data.messageId,
                    status: MessageStatus.SENT,
                },
            );
        } catch (error) {
            this.logger.error(`Error sending group message: ${error.message}`);
        }
    }

    async updateGroupMessageStatus(data: GroupMessageSeenDto): Promise<void> {
        try {
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
                        messageId,
                        status: MessageStatus.SEEN,
                        userId: senderId,
                    },
                );
            }
        } catch (error) {
            this.logger.error(
                `Error updating group message status: ${error.message}`,
            );
        }
    }
}
