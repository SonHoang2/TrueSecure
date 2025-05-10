import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
    @IsArray()
    @IsNotEmpty()
    users: number[];

    @IsString()
    @IsOptional()
    avatar?: string;

    @IsString()
    @IsOptional()
    title?: string;
}
