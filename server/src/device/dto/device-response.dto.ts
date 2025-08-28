import { Exclude, Expose } from 'class-transformer';

export class DeviceResponseDto {
    @Expose()
    id: number;

    @Expose()
    uuid: string;

    @Expose()
    publicKey: string;

    @Expose()
    lastSeen: Date;

    @Expose()
    active: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Exclude()
    userId: number;
}
