import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BeforeInsert,
    BeforeUpdate,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppRole } from 'src/common/enum/roles.enum';
import { DEFAULT_AVATAR_URL } from 'src/common/constants/default-avatar';
import { Participant } from 'src/conversation/entities/participant.entity';
import { Device } from 'src/device/entities/device.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
    username: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password: string;

    @Column({
        default: DEFAULT_AVATAR_URL,
    })
    avatar: string;

    @Column({ default: false })
    googleAccount: boolean;

    @Column({ nullable: true })
    passwordChangedAt: Date;

    @Column({ default: true })
    active: boolean;

    @Column({
        type: 'enum',
        enum: AppRole,
        default: AppRole.USER,
    })
    role: AppRole;

    @OneToMany(() => Participant, (participant) => participant.user)
    participants: Participant[];

    @OneToMany(() => Device, (device) => device.user)
    devices: Device[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @BeforeInsert()
    async hashPasswordBeforeInsert() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 12);
        }
    }

    @BeforeUpdate()
    async hashPasswordBeforeUpdate() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 12);
        }
    }

    async validPassword(password: string): Promise<boolean> {
        return await bcrypt.compare(password, this.password);
    }

    changedPasswordAfter(JWTTimestamp: number): boolean {
        if (this.passwordChangedAt) {
            const changedTimestamp = Math.floor(
                this.passwordChangedAt.getTime() / 1000,
            );
            return JWTTimestamp < changedTimestamp;
        }
        return false;
    }
}
