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
import { Role } from 'src/common/enum/roles.enum';

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
        enum: Role,
        default: Role.MEMBER,
    })
    role: Role;

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
