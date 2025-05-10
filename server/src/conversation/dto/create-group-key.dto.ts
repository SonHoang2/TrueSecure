import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateGroupKeyDto {
    @IsString()
    @IsNotEmpty()
    groupKey: string;

    @IsNumber()
    @IsNotEmpty()
    userId: number;

    @IsNumber()
    @IsNotEmpty()
    conversationId: number;
}
