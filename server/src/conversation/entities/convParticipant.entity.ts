import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';
import { ChatGroupRole } from 'src/common/enum/chat-role.enum';

@Entity('conv_participant')
@Unique(['userId', 'conversationId'])
export class ConvParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    conversationId: number;

    @Column({
        type: 'enum',
        enum: ChatGroupRole,
        default: ChatGroupRole.MEMBER,
    })
    role: ChatGroupRole;

    @Column({
        nullable: true,
    })
    groupKey: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(
        () => Conversation,
        (conversation) => conversation.convParticipants,
        {
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({ name: 'conversationId' })
    conversation: Conversation;
}
