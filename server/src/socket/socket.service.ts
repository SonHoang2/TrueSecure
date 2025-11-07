import { Injectable, Logger } from '@nestjs/common';
import { SocketManagerService } from './services/socket-manager/socket-manager.service';
import { SocketCacheService } from './services/socket-cache/socket-cache.service';
import { ConversationService } from 'src/conversation/conversation.service';
import { MessageStatus } from 'src/common/enum/message-status.enum';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { PrivateMessageDto } from './dto/message/private-message.dto';
import { GroupMessageDto } from './dto/message/group-message.dto';
import { MessageStatusDto } from './dto/message/message-status.dto';
import { SocketUser } from './interfaces/socket-user.interface';
import {
    AnswerDto,
    CallActionDto,
    IceCandidateDto,
    OfferDto,
} from './dto/call/call.dto';

const userCallDeviceMap = new Map<number, string>();

@Injectable()
export class SocketService {
    private readonly logger = new Logger(SocketService.name);

    constructor(
        private readonly socketManagerService: SocketManagerService,
        private readonly socketCacheService: SocketCacheService,
        private readonly conversationService: ConversationService,
        private readonly rabbitmqService: RabbitmqService,
    ) {}

    getCleanDeviceUuid(client: SocketUser): string {
        const raw = client.handshake?.query?.deviceUuid as string;
        return raw ? raw.replace(/^"|"$/g, '').trim() : '';
    }

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

        // Notify all participants on all their devices
        for (const participant of participants) {
            const deviceMap = await this.socketCacheService.getDevicesByUserId(
                participant.userId,
            );

            if (Object.keys(deviceMap).length > 0) {
                // User is online on at least one device
                for (const participantDeviceUuid of Object.keys(deviceMap)) {
                    await this.socketManagerService.emitToUser({
                        userId: participant.userId,
                        event: 'new-group-message',
                        data,
                        deviceUuid: participantDeviceUuid,
                    });
                }
            } else {
                // If participant is offline, store the message in cache
                // await this.rabbitmqService.sendOfflineMessage(
                //     String(participant.userId),
                //     data,
                // );
            }
        }

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

    async handleOffer(client: SocketUser, data: OfferDto) {
        const user = (client as any).user;
        const deviceUuid = this.getCleanDeviceUuid(client);
        data.sender = user;

        const deviceMap = await this.socketCacheService.getDevicesByUserId(
            data.receiverId,
        );

        const [firstDeviceUuid] = Object.keys(deviceMap);
        if (firstDeviceUuid) {
            await this.socketManagerService.emitToUser({
                userId: data.receiverId,
                event: 'offer',
                data: {
                    offer: data.offer,
                    sender: user,
                    isVideo: data.isVideo,
                },
                deviceUuid: firstDeviceUuid,
            });

            userCallDeviceMap.set(data.receiverId, firstDeviceUuid);
            userCallDeviceMap.set(user.id, deviceUuid);
        }
    }

    async handleAnswer(client: SocketUser, data: AnswerDto) {
        const user = (client as any).user;
        const deviceUuid = this.getCleanDeviceUuid(client);

        const expectedDeviceUuid = userCallDeviceMap.get(user.id);
        if (expectedDeviceUuid && expectedDeviceUuid !== deviceUuid) {
            this.logger.warn(
                `Device UUID mismatch for user ${user.id}: expected ${expectedDeviceUuid}, got ${deviceUuid}. Ignoring answer.`,
            );
            return;
        }

        userCallDeviceMap.set(user.id, deviceUuid);

        const receiverDeviceUuid = userCallDeviceMap.get(data.receiverId);
        if (!receiverDeviceUuid) {
            console.log('No device UUID found for receiver');
            return;
        }

        await this.socketManagerService.emitToUser({
            userId: data.receiverId,
            event: 'answer',
            data: { answer: data.answer },
            deviceUuid: receiverDeviceUuid,
        });
    }

    async handleIceCandidate(client: SocketUser, data: IceCandidateDto) {
        const receiverDeviceUuid = userCallDeviceMap.get(data.receiverId);
        if (!receiverDeviceUuid) {
            console.log('No device UUID found for receiver');
            return;
        }

        await this.socketManagerService.emitToUser({
            userId: data.receiverId,
            event: 'ice-candidate',
            data: { candidate: data.candidate },
            deviceUuid: receiverDeviceUuid,
        });
    }

    async handleCallRejected(client: SocketUser, data: CallActionDto) {
        const receiverDeviceUuid = userCallDeviceMap.get(data.receiverId);
        if (!receiverDeviceUuid) {
            console.log('No device UUID found for receiver');
            return;
        }

        await this.socketManagerService.emitToUser({
            userId: data.receiverId,
            event: 'call-rejected',
            data: {},
            deviceUuid: receiverDeviceUuid,
        });
    }

    async handleCallEnded(client: SocketUser, data: CallActionDto) {
        const receiverDeviceUuid = userCallDeviceMap.get(data.receiverId);
        if (!receiverDeviceUuid) {
            console.log('No device UUID found for receiver');
            return;
        }

        await this.socketManagerService.emitToUser({
            userId: data.receiverId,
            event: 'call-ended',
            data: {},
            deviceUuid: receiverDeviceUuid,
        });

        userCallDeviceMap.delete(data.receiverId);
        userCallDeviceMap.delete((client as any).user.id);
    }

    async handleUserLeftGroup(
        conversationId: number,
        userId: number,
    ): Promise<void> {
        const participants =
            await this.conversationService.getOtherParticipants(
                conversationId,
                userId,
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
                        event: 'user-left-group',
                        data: {
                            conversationId,
                            userId,
                        },
                        deviceUuid,
                    }),
                );
            }
        }

        await Promise.all(emitPromises);
    }
}
