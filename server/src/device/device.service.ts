import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DeviceService {
    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
    ) {}

    async create(
        userId: number,
        createDeviceDto: CreateDeviceDto,
    ): Promise<string> {
        const { publicKey } = createDeviceDto;

        const uuid = this.generateDeviceUuid();
        const device = this.deviceRepository.create({
            uuid,
            publicKey,
            userId,
            lastSeen: new Date(),
        });

        await this.deviceRepository.save(device);
        return device.uuid;
    }

    async findAllByUser(userId: number): Promise<Device[]> {
        return await this.deviceRepository.find({
            where: { userId },
            order: { lastSeen: 'DESC' },
        });
    }

    async findOne(id: number): Promise<Device> {
        const device = await this.deviceRepository.findOne({
            where: { id },
        });

        if (!device) {
            throw new NotFoundException('Device not found');
        }

        return device;
    }

    async findByUuid(uuid: string): Promise<Device> {
        const device = await this.deviceRepository.findOne({
            where: { uuid },
        });

        if (!device) {
            throw new NotFoundException('Device not found');
        }

        return device;
    }

    async update(
        id: number,
        updateDeviceDto: UpdateDeviceDto,
    ): Promise<Device> {
        const device = await this.findOne(id);

        Object.assign(device, updateDeviceDto);
        device.lastSeen = new Date();

        return await this.deviceRepository.save(device);
    }

    async updateLastSeen(uuid: string): Promise<void> {
        await this.deviceRepository.update({ uuid }, { lastSeen: new Date() });
    }

    async deactivate(id: number): Promise<Device> {
        const device = await this.findOne(id);
        device.active = false;
        return await this.deviceRepository.save(device);
    }

    async remove(id: number): Promise<void> {
        const device = await this.findOne(id);
        await this.deviceRepository.remove(device);
    }

    async removeByUuid(uuid: string): Promise<void> {
        const device = await this.findByUuid(uuid);
        await this.deviceRepository.remove(device);
    }

    async removeAllByUserId(userId: number): Promise<void> {
        await this.deviceRepository.delete({ userId });
    }

    extractOSFromUserAgent(userAgent: string): string {
        if (!userAgent) return 'Unknown';

        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';

        return 'Unknown';
    }

    extractBrowserFromUserAgent(userAgent: string): string {
        if (!userAgent) return 'Unknown';

        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';

        return 'Unknown';
    }

    generateDeviceUuid(): string {
        return crypto.randomUUID();
    }

    async getAllPublicKeysByUserId(userId: number) {
        const devices = await this.deviceRepository.find({
            where: { userId },
            select: ['uuid', 'publicKey'],
            order: { lastSeen: 'DESC' },
        });

        if (!devices.length) {
            throw new NotFoundException(`No devices found for user ${userId}`);
        }

        return {
            userId,
            devices: devices.map((device) => ({
                deviceUuid: device.uuid,
                publicKey: device.publicKey,
            })),
        };
    }

    async createOrUpdatePublicKey(userId: number, publicKey: string) {
        const devices = await this.deviceRepository.find({
            where: { userId },
        });

        if (!devices.length) {
            throw new NotFoundException(`No devices found for user ${userId}`);
        }

        await this.deviceRepository.update({ userId }, { publicKey });

        return { success: true };
    }
}
