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
        const { receiverId, senderId, id, deviceUuid } = data;

        const receiverSocketId = await this.socketCacheService.getSocketId(
            receiverId,
            deviceUuid,
        );

        if (receiverSocketId) {
            await this.socketManagerService.emitToUser({
                userId: receiverId,
                event: 'new-private-message',
                data,
                deviceUuid,
            });
        } else {
            // If receiver is offline, store the message in cache
            await this.rabbitmqService.sendOfflineMessage(receiverId, data);
        }

        // Notify sender about message status
        await this.socketManagerService.emitToUser({
            userId: senderId,
            event: 'private-message-status-update',
            data: {
                messageId: id,
                status: MessageStatus.SENT,
            },
            deviceUuid,
        });
    }

    async sendGroupMessage(data: GroupMessageDto): Promise<void> {
        const { conversationId, senderId, id, deviceUuid } = data;

        // Find all participants except sender
        const participants =
            await this.conversationService.getOtherParticipants(
                conversationId,
                +senderId,
            );

        // Notify all participants
        for (const participant of participants) {
            await this.socketManagerService.emitToUser({
                userId: participant.userId,
                event: 'new-group-message',
                data,
                deviceUuid,
            });
        }

        // Notify sender
        await this.socketManagerService.emitToUser({
            userId: senderId,
            event: 'group-message-status-update',
            data: {
                messageId: id,
                status: MessageStatus.SENT,
            },
            deviceUuid,
        });
    }

    async updatePrivateMessageStatus(data: MessageStatusDto): Promise<void> {
        const deviceMap = await this.socketCacheService.getDevicesByUserId(
            data.senderId,
        );
        for (const [deviceUuid, socketId] of Object.entries(deviceMap)) {
            console.log(deviceUuid, socketId);

            await this.socketManagerService.emitToUser({
                userId: data.senderId,
                event: 'private-message-status-update',
                data: {
                    messageId: data.messageId,
                    status: MessageStatus.SEEN,
                },
                deviceUuid,
                socketId,
            });
        }
    }

    async updateGroupMessageStatus(data: MessageStatusDto): Promise<void> {
        const { messageId, senderId, conversationId } = data;
        const participants =
            await this.conversationService.getAllParticipants(conversationId);

        const emitPromises: Promise<void>[] = [];

        for (const participant of participants) {
            const deviceMap = await this.socketCacheService.getDevicesByUserId(
                participant.userId,
            );
            for (const deviceUuid of Object.keys(deviceMap)) {
                emitPromises.push(
                    this.socketManagerService.emitToUser({
                        userId: participant.userId,
                        event: 'group-message-status-update',
                        data: {
                            messageId,
                            status: MessageStatus.SEEN,
                            userId: senderId,
                        },
                        deviceUuid,
                    }),
                );
            }
        }

        await Promise.all(emitPromises);
    }

    async emitTypingEvent(
        conversationId: number,
        userId: string,
        event: 'user-typing' | 'user-stopped-typing',
    ) {
        const participants =
            await this.conversationService.getOtherParticipants(
                conversationId,
                +userId,
            );
        const emitPromises: Promise<void>[] = [];

        for (const participant of participants) {
            const deviceMap = await this.socketCacheService.getDevicesByUserId(
                participant.userId,
            );
            for (const deviceUuid of Object.keys(deviceMap)) {
                emitPromises.push(
                    this.socketManagerService.emitToUser({
                        userId: participant.userId,
                        event,
                        data: {
                            userId,
                            conversationId,
                        },
                        deviceUuid,
                    }),
                );
            }
        }

        await Promise.all(emitPromises);
    }
}
