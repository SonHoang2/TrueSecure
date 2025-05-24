import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MessageStatusDto {
    @IsString()
    @IsNotEmpty()
    messageId: string;

    @IsNumber()
    @IsNotEmpty()
    senderId: number;

    @IsNumber()
    @IsNotEmpty()
    conversationId: number;
}
