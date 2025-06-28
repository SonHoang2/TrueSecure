import { Module } from '@nestjs/common';
import { DeepfakeService } from './deepfake.service';
import { DeepfakeController } from './deepfake.controller';

@Module({
    controllers: [DeepfakeController],
    providers: [DeepfakeService],
})
export class DeepfakeModule {}
