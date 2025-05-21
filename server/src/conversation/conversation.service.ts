import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

        const user = conversation.convParticipants.find(
            (participant) => participant.userId === userId,
        );

        if (!user) {
            throw new ForbiddenException(
                'You are not a participant of this conversation',
            );
        }

        return {
            conversation,
        };
    }

    async getUserConversations(userId: number) {
        const userParticipations = await this.convParticipantRepo.find({
            where: { userId },
            relations: [
                'conversation',
                'conversation.convParticipants',
                'conversation.convParticipants.user',
            ],
        });

        for (const participation of userParticipations) {
            // Filter other participants to exclude current user
            participation.conversation.convParticipants =
                participation.conversation.convParticipants.filter(
                    (p) => p.userId !== userId,
                );
        }

        return {
            conversations: userParticipations,
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

        const participant = await this.convParticipantRepo.findOne({
            where: {
                userId,
                conversationId,
            },
            select: ['id', 'groupKey'],
        });

        if (!participant) {
            throw new NotFoundException('Conversation not found');
        }

        return {
            groupKey: participant.groupKey,
        };
    }
}
