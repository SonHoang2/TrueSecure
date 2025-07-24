import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConvParticipant } from './convParticipant.entity';

@Entity('conversation')
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
        nullable: true,
    })
    avatar: string;

    @OneToMany(
        () => ConvParticipant,
        (participant) => participant.conversation,
        {
            cascade: true,
        },
    )
    convParticipants: ConvParticipant[];

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
