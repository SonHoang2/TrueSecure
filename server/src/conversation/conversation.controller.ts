import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    Delete,
    Request,
    ParseIntPipe,
    Query,
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

    @Get('me')
    findUserConversations(@Req() req: RequestWithUser) {
        const userId = req.user.id;
        return this.conversationService.getUserConversations(userId);
    }

    @Post('key')
    createGroupKey(@Body() createGroupKeyDto: CreateGroupKeyDto) {
        return this.conversationService.createGroupKey(createGroupKeyDto);
    }

    @Get(':conversationId/key')
    getConversationKey(
        @Param('conversationId') conversationId: string,
        @Query('deviceUuid') deviceUuid: string,
        @Req() req: RequestWithUser,
    ) {
        const userId = req.user.id;
        return this.conversationService.getConversationKey(
            +conversationId,
            userId,
            deviceUuid,
        );
    }

    @Get(':id')
    findOne(@Param('id') uuid: string, @Req() req: RequestWithUser) {
        const userId = req.user.id;
        return this.conversationService.getConversation(uuid, userId);
    }

    @Delete(':id')
    deleteConversation(@Param('id') id: string, @Req() req: RequestWithUser) {
        const userId = req.user.id;

        console.log(
            `Deleting conversation with ID: ${id} for user ID: ${userId}`,
        );

        return this.conversationService.deleteConversation(+id, userId);
    }

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

    @Delete(':id/leave')
    @UseGuards(JwtAuthGuard)
    async leaveGroup(
        @Param('id', ParseIntPipe) conversationId: number,
        @Request() req,
    ) {
        return this.conversationService.leaveGroup(conversationId, req.user.id);
    }
}
