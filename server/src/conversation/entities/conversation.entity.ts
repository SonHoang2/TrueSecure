import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';
import { DEFAULT_GROUP_AVATAR_URL } from 'src/common/constants/default-avatar';

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    title: string;

    @Column({
        default: false,
    })
    isGroup: boolean;

    @Column({
        default: DEFAULT_GROUP_AVATAR_URL,
    })
    avatar: string;

    @OneToMany(() => Participant, (participant) => participant.conversation, {
        cascade: true,
    })
    participants: Participant[];

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updatedAt: Date;
}
