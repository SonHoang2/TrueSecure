import { Injectable, Logger } from '@nestjs/common';
import { SocketManagerService } from './services/socket-manager/socket-manager.service';
import { SocketCacheService } from './services/socket-cache/socket-cache.service';
import { ConversationService } from 'src/conversation/conversation.service';
import { MessageStatus } from 'src/common/enum/message-status.enum';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class SocketService {
    private readonly logger = new Logger(SocketService.name);

    constructor(
        private readonly socketManagerService: SocketManagerService,
        private readonly socketCacheService: SocketCacheService,
        private readonly conversationService: ConversationService,
        private readonly rabbitmqService: RabbitmqService,
    ) {}

    async sendPrivateMessage(data: any): Promise<void> {
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

    // async sendGroupMessage(data: any): Promise<void> {
    //     try {
    //         const {
    //             conversationId,
    //             senderId,
    //             content,
    //             iv,
    //             messageType = 'text',
    //         } = data;

    //         // Create message in database
    //         const messageRepository =
    //             this.conversationService.getMessageRepository();
    //         const messageStatusRepository =
    //             this.conversationService.getMessageStatusRepository();
    //         const convParticipantRepository =
    //             this.conversationService.getConvParticipantRepository();

    //         // Create message
    //         const message = messageRepository.create({
    //             conversationId,
    //             senderId,
    //             content,
    //             messageType,
    //             iv,
    //         });

    //         await messageRepository.save(message);

    //         // Find all participants except sender
    //         const participants = await convParticipantRepository.find({
    //             where: {
    //                 conversationId,
    //                 userId: Not(senderId),
    //             },
    //         });

    //         // Create message status entries for each participant
    //         const statusMap = new Map();

    //         for (const participant of participants) {
    //             const status = messageStatusRepository.create({
    //                 messageId: message.id,
    //                 userId: participant.userId,
    //                 status: MessageStatus.SENT,
    //             });

    //             await messageStatusRepository.save(status);
    //             statusMap.set(participant.userId, status.id);
    //         }

    //         // Notify all participants
    //         for (const participant of participants) {
    //             await this.socketManagerService.emitToUser(
    //                 participant.userId,
    //                 'new-group-message',
    //                 {
    //                     ...data,
    //                     messageId: message.id,
    //                     messageStatusId: statusMap.get(participant.userId),
    //                 },
    //             );
    //         }

    //         // Notify sender
    //         await this.socketManagerService.emitToUser(
    //             senderId,
    //             'group-message-status-update',
    //             {
    //                 messageId: message.id,
    //                 status: MessageStatus.SENT,
    //             },
    //         );
    //     } catch (error) {
    //         this.logger.error(`Error sending group message: ${error.message}`);
    //     }
    // }

    // async updateGroupMessageStatus(data: any): Promise<void> {
    //     try {
    //         const { messageStatusId } = data;

    //         const messageStatusRepository =
    //             this.conversationService.getMessageStatusRepository();
    //         const messageRepository =
    //             this.conversationService.getMessageRepository();
    //         const convParticipantRepository =
    //             this.conversationService.getConvParticipantRepository();

    //         // Find and update message status
    //         const status = await messageStatusRepository.findOne({
    //             where: { id: messageStatusId },
    //         });

    //         if (!status) return;

    //         status.status = MessageStatus.SEEN;
    //         await messageStatusRepository.save(status);

    //         // Find the message
    //         const message = await messageRepository.findOne({
    //             where: { id: status.messageId },
    //         });

    //         if (!message) return;

    //         // Get all conversation participants
    //         const participants = await convParticipantRepository.find({
    //             where: { conversationId: message.conversationId },
    //         });

    //         // Notify all participants about the status update
    //         const updateData = {
    //             messageId: message.id,
    //             userId: status.userId,
    //             status: MessageStatus.SEEN,
    //         };

    //         for (const participant of participants) {
    //             await this.socketManagerService.emitToUser(
    //                 participant.userId,
    //                 'group-message-status-update',
    //                 updateData,
    //             );
    //         }
    //     } catch (error) {
    //         this.logger.error(
    //             `Error updating group message status: ${error.message}`,
    //         );
    //     }
    // }
}
