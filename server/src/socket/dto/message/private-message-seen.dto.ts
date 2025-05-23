import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PrivateMessageSeenDto {
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
