import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ParticipantDevice } from 'src/conversation/entities/participant-device.entity';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column({ type: 'uuid' })
    uuid: string;

    @Column({ type: 'text' })
    publicKey: string;

    @Column({ type: 'timestamp', nullable: true })
    lastSeen: Date;

    @Column({ default: true })
    active: boolean;

    @Column({ nullable: true })
    deviceModel: string;

    @Column({ nullable: true })
    os: string;

    @Column({ nullable: true })
    browser: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(
        () => ParticipantDevice,
        (participantDevice) => participantDevice.device,
    )
    participantDevices: ParticipantDevice[];
}
