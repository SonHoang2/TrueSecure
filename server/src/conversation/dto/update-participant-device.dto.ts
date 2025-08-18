import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateParticipantDeviceDto } from './create-participant-device.dto';

export class UpdateParticipantDeviceDto extends PartialType(
    CreateParticipantDeviceDto,
) {
    @IsString()
    @IsOptional()
    encryptedGroupKey?: string;
}
