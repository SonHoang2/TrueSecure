import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateDeviceDto } from './create-device.dto';

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {
    @IsString()
    @IsOptional()
    publicKey?: string;

    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
