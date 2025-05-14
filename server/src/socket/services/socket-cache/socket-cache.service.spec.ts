import { Test, TestingModule } from '@nestjs/testing';
import { SocketCacheService } from './socket-cache.service';

describe('SocketCacheService', () => {
    let service: SocketCacheService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SocketCacheService],
        }).compile();

        service = module.get<SocketCacheService>(SocketCacheService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
