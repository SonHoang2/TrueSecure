import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { UserService } from 'src/user/user.service';
import { ChatGroupRole } from 'src/common/enum/chat-role.enum';
import { ParticipantDevice } from './entities/participant-device.entity';
import { DeviceService } from 'src/device/device.service';

@Injectable()
export class ConversationService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepo: Repository<Conversation>,
        @InjectRepository(Participant)
        private participantRepo: Repository<Participant>,
        private userService: UserService,
        @InjectRepository(ParticipantDevice)
        private participantDeviceRepo: Repository<ParticipantDevice>,
        private deviceService: DeviceService,
    ) {}

    async createConversation(
        createConversationDto: CreateConversationDto,
        currentUserId: number,
    ) {
        const { users, title } = createConversationDto;

        users.push(currentUserId);

        const existUsers = await this.userService.findUsersByIds(users);

        if (existUsers.length !== users.length) {
            throw new NotFoundException('Users not found');
        }

        if (users.length < 2) {
            throw new BadRequestException(
                'The minimum number of users in a conversation is 2',
            );
        }

        if (users.length > 25) {
            throw new BadRequestException(
                'The maximum number of users in a group conversation is 25',
            );
        }

        if (users.length > 2 && !title) {
            throw new BadRequestException('Group chat must have a title');
        }

        const participantsByConversation = this.participantRepo
            .createQueryBuilder('participant')
            .select('participant.conversationId')
            .addSelect('COUNT(participant.userId)', 'userCount')
            .where('participant.userId IN (:...users)', { users })
            .groupBy('participant.conversationId')
            .having('COUNT(participant.userId) = :userCount', {
                userCount: users.length,
            });

        const potentialConversations =
            await participantsByConversation.getRawMany();

        let existingConversation = null;

        for (const conv of potentialConversations) {
            const conversationId = conv.participant_conversationId;

            const totalParticipants = await this.participantRepo.count({
                where: { conversationId },
            });

            if (totalParticipants === users.length) {
                existingConversation = await this.conversationRepo.findOne({
                    where: { id: conversationId },
                });
                break;
            }
        }

        let conversation = existingConversation;

        if (!conversation) {
            conversation = this.conversationRepo.create({
                isGroup: users.length > 2,
                title: users.length > 2 ? title : null,
            });

            await this.conversationRepo.save(conversation);

            for (const userId of users) {
                let role = ChatGroupRole.MEMBER;

                if (userId === currentUserId && users.length > 2) {
                    role = ChatGroupRole.ADMIN;
                }

                const participant = this.participantRepo.create({
                    userId,
                    conversationId: conversation.id,
                    role: role,
                });

                await this.participantRepo.save(participant);
            }
        }

        return {
            conversation,
        };
    }

    async getConversation(uuid: string, userId: number) {
        const conversation = await this.conversationRepo
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('participants.user', 'user')
            .leftJoinAndSelect(
                'participants.participantDevices',
                'participantDevices',
            )
            .where('conversation.uuid = :uuid', { uuid })
            .getOne();

        if (!conversation) {
            throw new NotFoundException(
                'Conversation not found or you are not a participant',
            );
        }

        const currentUserParticipation = conversation.participants.find(
            (participant) => participant.userId === userId,
        );

        const baseResponse = {
            id: conversation.id,
            uuid: conversation.uuid,
            title: conversation.title,
            isGroup: conversation.isGroup,
            avatar: conversation.avatar,
            myRole: currentUserParticipation.role,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            groupEpoch: conversation.groupEpoch,
            rotateNeeded: conversation.rotateNeeded,
        };

        if (conversation.isGroup) {
            const participants = conversation.participants.map((p) => ({
                id: p.user.id,
                firstName: p.user.firstName,
                lastName: p.user.lastName,
                email: p.user.email,
                avatar: p.user.avatar,
                role: p.role,
            }));

            return {
                ...baseResponse,
                participants,
            };
        } else {
            const otherParticipant = conversation.participants.find(
                (p) => p.userId !== userId,
            );

            if (!otherParticipant) {
                throw new NotFoundException('Other participant not found');
            }
            return {
                ...baseResponse,
                receiver: {
                    id: otherParticipant.user.id,
                    firstName: otherParticipant.user.firstName,
                    lastName: otherParticipant.user.lastName,
                    email: otherParticipant.user.email,
                    avatar: otherParticipant.user.avatar,
                },
            };
        }
    }

    async getUserConversations(userId: number) {
        const userParticipations = await this.participantRepo.find({
            where: { userId },
            relations: [
                'conversation',
                'conversation.participants',
                'conversation.participants.user',
            ],
            order: {
                conversation: {
                    updatedAt: 'DESC',
                },
            },
        });

        const conversations = userParticipations.map((participation) => {
            const conversation = participation.conversation;

            const baseResponse = {
                id: conversation.uuid,
                title: conversation.title,
                isGroup: conversation.isGroup,
                avatar: conversation.avatar,
                myRole: participation.role,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            };

            if (conversation.isGroup) {
                const participants = conversation.participants
                    .filter((p) => p.userId !== userId)
                    .map((p) => ({
                        id: p.user.id,
                        firstName: p.user.firstName,
                        lastName: p.user.lastName,
                        email: p.user.email,
                        avatar: p.user.avatar,
                        role: p.role,
                    }));

                return {
                    ...baseResponse,
                    participants,
                };
            } else {
                const otherParticipant = conversation.participants.find(
                    (p) => p.userId !== userId,
                );

                if (!otherParticipant) {
                    throw new NotFoundException(
                        `Invalid private conversation ${conversation.id}: missing other participant`,
                    );
                }

                return {
                    ...baseResponse,
                    receiver: {
                        id: otherParticipant.user.id,
                        firstName: otherParticipant.user.firstName,
                        lastName: otherParticipant.user.lastName,
                        email: otherParticipant.user.email,
                        avatar: otherParticipant.user.avatar,
                    },
                };
            }
        });

        return {
            conversations,
        };
    }

    async createGroupKeys(createGroupKeysDto: {
        conversationId: number;
        encryptedKeys: {
            deviceUuid: string;
            encryptedGroupKey: string;
        }[];
    }) {
        const { conversationId, encryptedKeys } = createGroupKeysDto;

        if (!conversationId || !encryptedKeys?.length) {
            throw new BadRequestException(
                'Conversation ID and encryptedKeys array are required',
            );
        }

        const conversation = await this.conversationRepo.findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        if (conversation.groupEpoch !== 0 && !conversation.rotateNeeded) {
            throw new BadRequestException(
                'Group keys are already set for the current epoch',
            );
        }

        for (const { deviceUuid, encryptedGroupKey } of encryptedKeys) {
            if (!deviceUuid || !encryptedGroupKey) continue;

            let participantDevice = await this.participantDeviceRepo
                .createQueryBuilder('participantDevice')
                .innerJoin('participantDevice.device', 'device')
                .innerJoin('participantDevice.participant', 'participant')
                .where('device.uuid = :deviceUuid', { deviceUuid })
                .andWhere('participant.conversationId = :conversationId', {
                    conversationId,
                })
                .getOne();

            if (!participantDevice) {
                const device = await this.deviceService.findByUuid(deviceUuid);
                if (!device) continue; // bỏ qua thiết bị không tồn tại

                const participant = await this.participantRepo.findOne({
                    where: {
                        conversationId: conversation.id,
                        userId: device.userId,
                    },
                });

                if (!participant) continue; // bỏ qua user không thuộc cuộc trò chuyện

                participantDevice = this.participantDeviceRepo.create({
                    participantId: participant.id,
                    deviceId: device.id,
                    encryptedGroupKey,
                });
            } else {
                participantDevice.encryptedGroupKey = encryptedGroupKey;
            }

            await this.participantDeviceRepo.save(participantDevice);
        }

        return { message: 'Group keys stored successfully' };
    }

    async getConversationKey(
        conversationId: number,
        userId: number,
        deviceUuid: string,
    ) {
        if (!conversationId) {
            throw new BadRequestException('Conversation ID is required');
        }

        if (!deviceUuid) {
            throw new BadRequestException('Device UUID is required');
        }

        const conversation = await this.conversationRepo.findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const userParticipation = await this.participantRepo.findOne({
            where: {
                conversationId,
                userId,
            },
        });

        if (!userParticipation) {
            throw new ForbiddenException(
                'You are not a participant of this conversation',
            );
        }

        const participantDevice = await this.participantDeviceRepo
            .createQueryBuilder('participantDevice')
            .innerJoin('participantDevice.device', 'device')
            .innerJoin('participantDevice.participant', 'participant')
            .where('device.uuid = :deviceUuid', { deviceUuid })
            .andWhere('participant.conversationId = :conversationId', {
                conversationId,
            })
            .getOne();

        if (!participantDevice) {
            throw new NotFoundException(
                'No encrypted group key found for this device',
            );
        }

        return {
            encryptedGroupKey: participantDevice.encryptedGroupKey,
        };
    }

    async getOtherParticipants(conversationId: number, userId: number) {
        const participants = await this.participantRepo.find({
            where: {
                conversationId,
                userId: Not(userId),
            },
            relations: ['user'],
        });

        if (!participants) {
            throw new NotFoundException('Participants not found');
        }

        return participants;
    }

    async getAllParticipants(conversationId: number) {
        const participants = await this.participantRepo.find({
            where: {
                conversationId,
            },
            relations: ['user'],
        });

        if (!participants) {
            throw new NotFoundException('Participants not found');
        }

        return participants;
    }

    async deleteConversation(conversationId: number, userId: number) {
        const conversation = await this.conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['participants'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const participant = conversation.participants.find(
            (p) => p.userId === userId,
        );

        if (!participant) {
            throw new ForbiddenException(
                'You are not a participant of this conversation',
            );
        }

        if (participant.role !== ChatGroupRole.ADMIN) {
            throw new ForbiddenException(
                'Only admins can delete this conversation',
            );
        }

        await this.conversationRepo.remove(conversation);

        return;
    }

    async leaveGroup(conversationId: number, userId: number) {
        const conversation = await this.conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['participants'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        if (!conversation.isGroup) {
            throw new BadRequestException(
                'Cannot leave a private conversation',
            );
        }

        const participant = conversation.participants.find(
            (p) => p.userId === userId,
        );

        if (!participant) {
            throw new ForbiddenException(
                'You are not a participant of this conversation',
            );
        }

        // Check if user is the only admin
        const admins = conversation.participants.filter(
            (p) => p.role === ChatGroupRole.ADMIN,
        );

        if (participant.role === ChatGroupRole.ADMIN && admins.length === 1) {
            // If only one admin and more than one participant, promote another member
            const members = conversation.participants.filter(
                (p) => p.role === ChatGroupRole.MEMBER,
            );

            if (members.length > 0) {
                // Promote the first member to admin
                members[0].role = ChatGroupRole.ADMIN;
                await this.participantRepo.save(members[0]);
            }
        }

        // Remove participant devices first (due to foreign key constraints)
        await this.participantDeviceRepo.delete({
            participantId: participant.id,
        });

        // Remove the participant
        await this.participantRepo.remove(participant);

        // Check remaining participants
        const remainingParticipants = await this.participantRepo.count({
            where: { conversationId },
        });

        // Delete group if 0 or 1 participants remain
        if (remainingParticipants <= 1) {
            // Clean up any remaining participant devices
            const remainingParticipantIds = await this.participantRepo.find({
                where: { conversationId },
                select: ['id'],
            });

            for (const p of remainingParticipantIds) {
                await this.participantDeviceRepo.delete({
                    participantId: p.id,
                });
            }

            // Remove remaining participants
            await this.participantRepo.delete({ conversationId });

            // Delete the conversation
            await this.conversationRepo.remove(conversation);

            return {
                message:
                    'Successfully left the group. Group was deleted as it had insufficient members.',
                groupDeleted: true,
            };
        }

        await this.conversationRepo.update(
            { id: conversation.id },
            {
                groupEpoch: () => '"groupEpoch" + 1',
                rotateNeeded: true,
            },
        );

        return {
            message: 'Successfully left the group',
            groupDeleted: false,
        };
    }
}
