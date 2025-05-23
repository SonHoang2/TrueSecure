import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class GroupMessageSeenDto {
    @IsNumber()
    @IsNotEmpty()
    senderId: number;

    @IsString()
    @IsNotEmpty()
    messageId: string;

    @IsNumber()
    @IsNotEmpty()
    conversationId: number;
}
