import { Expose } from 'class-transformer';

export class ParticipantDeviceResponseDto {
    @Expose()
    id: number;

    @Expose()
    participantId: number;

    @Expose()
    deviceId: number;

    @Expose()
    encryptedGroupKey: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
