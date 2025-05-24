import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PrivateMessageDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsNumber()
    @IsNotEmpty()
    senderId: string;

    @IsNumber()
    @IsNotEmpty()
    receiverId: string;

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
