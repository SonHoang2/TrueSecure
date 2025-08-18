import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateGroupKeyDto {
    @IsString()
    @IsNotEmpty()
    groupKey: string;

    @IsString()
    @IsNotEmpty()
    deviceUuid: string;

    @IsNumber()
    @IsNotEmpty()
    conversationId: number;
}
