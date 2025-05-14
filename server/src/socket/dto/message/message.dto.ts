import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PrivateMessageDto {
    @IsString()
    @IsNotEmpty()
    messageId: string;

    @IsNumber()
    @IsNotEmpty()
    senderId: number;

    @IsNumber()
    @IsNotEmpty()
    receiverId: number;

    @IsNumber()
    @IsNotEmpty()
    conversationId: number;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    @IsNotEmpty()
    iv: string;

    @IsString()
    @IsNotEmpty()
    ephemeralPublicKey: string;

    @IsString()
    @IsOptional()
    createdAt?: string;
}

export class GroupMessageDto {
    @IsNumber()
    @IsNotEmpty()
    conversationId: number;

    @IsNumber()
    @IsNotEmpty()
    senderId: number;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    @IsNotEmpty()
    iv: string;

    @IsString()
    @IsOptional()
    messageType?: string;
}

export class MessageSeenDto {
    @IsNumber()
    @IsNotEmpty()
    senderId: number;

    @IsString()
    @IsNotEmpty()
    messageId: string;
}

export class GroupMessageSeenDto {
    @IsNumber()
    @IsNotEmpty()
    messageStatusId: number;
}
