import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';
import { ParticipantDevice } from './participant-device.entity';
import { ChatGroupRole } from 'src/common/enum/chat-role.enum';

@Entity('participants')
@Unique(['userId', 'conversationId'])
export class Participant {
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

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(
        () => Conversation,
        (conversation) => conversation.participants,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'conversationId' })
    conversation: Conversation;

    @OneToMany(
        () => ParticipantDevice,
        (participantDevice) => participantDevice.participant,
    )
    participantDevices: ParticipantDevice[];
}
