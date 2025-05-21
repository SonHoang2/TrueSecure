import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    BeforeInsert,
    BeforeUpdate,
    CreateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
// import { ConvParticipant } from '../../conversation/entities/conv-participant.entity';
import { BadRequestException } from '@nestjs/common';
import { AppRole } from 'src/common/enum/roles.enum';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password: string;

    @Column({ default: 'user-avatar-default.jpg' })
    avatar: string;

    @Column({ default: false })
    googleAccount: boolean;

    @Column({ nullable: true })
    passwordChangedAt: Date;

    @Column({ default: true })
    active: boolean;

    @Column({ nullable: true })
    publicKey: string;

    @Column({ nullable: true })
    passwordResetToken: string;

    @Column({ nullable: true })
    passwordResetExpires: Date;

    @Column({
        type: 'enum',
        enum: AppRole,
        default: AppRole.USER,
    })
    role: AppRole;

    // Relationships
    // @OneToMany(() => ConvParticipant, (participant) => participant.user)
    // participants: ConvParticipant[];

    // Methods
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

    createPasswordResetToken(): string {
        const resetToken = crypto.randomBytes(32).toString('hex');

        this.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        return resetToken;
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
