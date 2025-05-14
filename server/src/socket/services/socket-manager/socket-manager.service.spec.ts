import { Test, TestingModule } from '@nestjs/testing';
import { SocketManagerService } from './socket-manager.service';

describe('SocketManagerService', () => {
    let service: SocketManagerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SocketManagerService],
        }).compile();

        service = module.get<SocketManagerService>(SocketManagerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
