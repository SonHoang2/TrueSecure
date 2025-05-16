import { Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';

@Module({
    providers: [RabbitmqService],
})
export class RabbitmqModule {}
