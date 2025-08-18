import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateParticipantDeviceDto {
    @IsNumber()
    @IsNotEmpty()
    participantId: number;

    @IsNumber()
    @IsNotEmpty()
    deviceId: number;

    @IsString()
    @IsNotEmpty()
    encryptedGroupKey: string;
}
