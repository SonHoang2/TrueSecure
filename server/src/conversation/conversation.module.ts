import { forwardRef, Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConvParticipant } from './entities/convParticipant.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    controllers: [ConversationController],
    providers: [ConversationService],
    imports: [
        TypeOrmModule.forFeature([Conversation, ConvParticipant]),
        UserModule,
        forwardRef(() => AuthModule),
    ],
    exports: [ConversationService],
})
export class ConversationModule {}
