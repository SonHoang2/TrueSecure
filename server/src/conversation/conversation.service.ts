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
import { ConvParticipant } from './entities/convParticipant.entity';
import { CreateGroupKeyDto } from './dto/create-group-key.dto';
import { UserService } from 'src/user/user.service';
import { ChatGroupRole } from 'src/common/enum/chat-role.enum';

@Injectable()
export class ConversationService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepo: Repository<Conversation>,
        @InjectRepository(ConvParticipant)
        private convParticipantRepo: Repository<ConvParticipant>,
        private userService: UserService,
    ) {}

    async createConversation(
        createConversationDto: CreateConversationDto,
        currentUserId: number,
    ) {
        const { users, avatar, title } = createConversationDto;

        // Add the current user to the list of users
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

        // Check if this exact conversation already exists
        // First, find conversations where all users participate
        const participantsByConversationQb = this.convParticipantRepo
            .createQueryBuilder('participant')
            .select('participant.conversationId')
            .addSelect('COUNT(participant.userId)', 'userCount')
            .where('participant.userId IN (:...users)', { users })
            .groupBy('participant.conversationId')
            .having('COUNT(participant.userId) = :userCount', {
                userCount: users.length,
            });

        const potentialConversations =
            await participantsByConversationQb.getRawMany();

        let existingConversation = null;

        // Check if any of these conversations have exactly these users (no more, no less)
        for (const conv of potentialConversations) {
            const conversationId = conv.participant_conversationId;

            const totalParticipants = await this.convParticipantRepo.count({
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
                avatar:
                    users.length > 2
                        ? avatar?.trim() || 'group-avatar-default.png'
                        : null,
            });

            await this.conversationRepo.save(conversation);

            for (const userId of users) {
                let role = ChatGroupRole.MEMBER;

                if (userId === currentUserId && users.length > 2) {
                    role = ChatGroupRole.ADMIN;
                }

                const participant = this.convParticipantRepo.create({
                    userId,
                    conversationId: conversation.id,
                    role: role,
                });

                await this.convParticipantRepo.save(participant);
            }
        }

        return {
            conversation,
        };
    }

    async getConversation(id: number, userId: number) {
        const conversation = await this.conversationRepo.findOne({
            where: { id },
            relations: ['convParticipants', 'convParticipants.user'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const currentUserParticipation = conversation.convParticipants.find(
            (participant) => participant.userId === userId,
        );

        if (!currentUserParticipation) {
            throw new ForbiddenException(
                'You are not a participant of this conversation',
            );
        }

        const baseResponse = {
            id: conversation.id,
            title: conversation.title,
            isGroup: conversation.isGroup,
            avatar: conversation.avatar,
            myRole: currentUserParticipation.role,
            myGroupKey: currentUserParticipation.groupKey,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
        };

        if (conversation.isGroup) {
            // For group chats, include all participants
            const participants = conversation.convParticipants.map((p) => ({
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
            // For private chats, just include the other user as receiver
            const otherParticipant = conversation.convParticipants.find(
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
        const userParticipations = await this.convParticipantRepo.find({
            where: { userId },
            relations: [
                'conversation',
                'conversation.convParticipants',
                'conversation.convParticipants.user',
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
                id: conversation.id,
                title: conversation.title,
                isGroup: conversation.isGroup,
                avatar: conversation.avatar,
                myRole: participation.role,
                myGroupKey: participation.groupKey,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            };

            if (conversation.isGroup) {
                // For group chats, include all other participants
                const participants = conversation.convParticipants
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
                // For private chats, just include the other user as receiver
                const otherParticipant = conversation.convParticipants.find(
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

    async createGroupKey(createGroupKeyDto: CreateGroupKeyDto) {
        const { groupKey, userId, conversationId } = createGroupKeyDto;

        await this.convParticipantRepo.update(
            { userId, conversationId },
            { groupKey },
        );

        return {
            groupKey,
        };
    }

    async getConversationKey(conversationId: number, userId: number) {
        if (!conversationId) {
            throw new BadRequestException('Conversation ID is required');
        }

        // Check if conversation exists first
        const conversation = await this.conversationRepo.findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const participants = await this.convParticipantRepo
            .createQueryBuilder('participant')
            .leftJoinAndSelect('participant.user', 'user')
            .select([
                'participant.id as id',
                'participant.userId as userId',
                'participant.role as role',
                'participant.groupKey as groupKey',
                'user.publicKey as publicKey',
            ])
            .where('participant.conversationId = :conversationId', {
                conversationId,
            })
            .getRawMany();

        console.log(
            `Participants for conversation ${conversationId}:`,
            participants,
        );

        const adminPublicKey = participants.find(
            (p) => p.role === ChatGroupRole.ADMIN,
        ).publickey;

        const groupKey = participants.find((p) => p.userid === userId).groupkey;

        if (!groupKey) {
            throw new NotFoundException(
                'You are not a participant of this conversation or group key not found',
            );
        }

        if (!adminPublicKey) {
            throw new NotFoundException(
                'Admin public key not found for this conversation',
            );
        }

        return {
            groupKey,
            adminPublicKey,
        };
    }

    async getOtherParticipants(conversationId: number, userId: number) {
        const participants = await this.convParticipantRepo.find({
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
        const participants = await this.convParticipantRepo.find({
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
            relations: ['convParticipants'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const participant = conversation.convParticipants.find(
            (p) => p.userId === userId,
        );

        if (!participant) {
            throw new ForbiddenException(
                'You are not a participant of this conversation',
            );
        }

        // If the user is an admin, they can delete the conversation
        if (participant.role !== ChatGroupRole.ADMIN) {
            throw new ForbiddenException(
                'Only admins can delete this conversation',
            );
        }

        await this.conversationRepo.remove(conversation);

        return;
    }
}
