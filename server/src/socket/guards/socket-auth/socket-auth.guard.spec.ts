import { SocketAuthGuard } from './socket-auth.guard';

describe('SocketAuthGuard', () => {
    it('should be defined', () => {
        expect(new SocketAuthGuard()).toBeDefined();
    });
});
