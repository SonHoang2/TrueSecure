import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';
import { Participant } from './participant.entity';
import { Device } from '../../device/entities/device.entity';

@Entity('participant_devices')
@Unique(['participantId', 'deviceId'])
export class ParticipantDevice {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    participantId: number;

    @Column()
    deviceId: number;

    @Column({ type: 'text' })
    encryptedGroupKey: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(
        () => Participant,
        (participant) => participant.participantDevices,
        {
            onDelete: 'CASCADE',
        },
    )
    participant: Participant;

    @ManyToOne(() => Device, (device) => device.participantDevices, {
        onDelete: 'CASCADE',
    })
    device: Device;
}
