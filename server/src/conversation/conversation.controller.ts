import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { CreateGroupKeyDto } from './dto/create-group-key.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
    constructor(private readonly conversationService: ConversationService) {}

    @Post()
    create(
        @Body() createConversationDto: CreateConversationDto,
        @Req() req: RequestWithUser,
    ) {
        const userId = req.user.id;
        return this.conversationService.createConversation(
            createConversationDto,
            userId,
        );
    }

    @Get('me')
    findUserConversations(@Req() req: RequestWithUser) {
        const userId = req.user.id;
        return this.conversationService.getUserConversations(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
        const userId = req.user.id;
        return this.conversationService.getConversation(+id, userId);
    }

    @Post('key')
    createGroupKey(@Body() createGroupKeyDto: CreateGroupKeyDto) {
        return this.conversationService.createGroupKey(createGroupKeyDto);
    }

    @Get(':conversationId/key')
    getConversationKey(
        @Param('conversationId') conversationId: string,
        @Req() req: RequestWithUser,
    ) {
        const userId = req.user.id;
        return this.conversationService.getConversationKey(
            +conversationId,
            userId,
        );
    }
}
