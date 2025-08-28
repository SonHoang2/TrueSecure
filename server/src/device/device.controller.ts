import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    ParseIntPipe,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { plainToClass } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
    constructor(private readonly deviceService: DeviceService) {}

    @Post()
    async create(
        @Request() req: any,
        @Body() createDeviceDto: CreateDeviceDto,
    ): Promise<DeviceResponseDto> {
        const device = await this.deviceService.create(
            req.user.id,
            createDeviceDto,
        );
        return plainToClass(DeviceResponseDto, device, {
            excludeExtraneousValues: true,
        });
    }

    @Get()
    async findAll(@Request() req: any): Promise<DeviceResponseDto[]> {
        const devices = await this.deviceService.findAllByUser(req.user.id);
        return devices.map((device) =>
            plainToClass(DeviceResponseDto, device, {
                excludeExtraneousValues: true,
            }),
        );
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ): Promise<DeviceResponseDto> {
        const device = await this.deviceService.findOne(id, req.user.id);
        return plainToClass(DeviceResponseDto, device, {
            excludeExtraneousValues: true,
        });
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
        @Body() updateDeviceDto: UpdateDeviceDto,
    ): Promise<DeviceResponseDto> {
        const device = await this.deviceService.update(
            id,
            req.user.id,
            updateDeviceDto,
        );
        return plainToClass(DeviceResponseDto, device, {
            excludeExtraneousValues: true,
        });
    }

    @Patch(':id/deactivate')
    async deactivate(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ): Promise<DeviceResponseDto> {
        const device = await this.deviceService.deactivate(id, req.user.id);
        return plainToClass(DeviceResponseDto, device, {
            excludeExtraneousValues: true,
        });
    }

    @Delete(':id')
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ): Promise<void> {
        return await this.deviceService.remove(id, req.user.id);
    }
}
