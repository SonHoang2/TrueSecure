import { forwardRef, Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { ParticipantDevice } from './entities/participant-device.entity';
import { AuthModule } from 'src/auth/auth.module';
import { DeviceModule } from 'src/device/device.module';

@Module({
    controllers: [ConversationController],
    providers: [ConversationService],
    imports: [
        TypeOrmModule.forFeature([
            Conversation,
            Participant,
            ParticipantDevice,
        ]),
        UserModule,
        forwardRef(() => AuthModule),
        forwardRef(() => DeviceModule),
    ],
    exports: [ConversationService],
})
export class ConversationModule {}
