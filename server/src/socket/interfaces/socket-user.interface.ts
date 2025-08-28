import { Socket } from 'socket.io';

export interface SocketUser extends Socket {
    id: string;
    user: {
        id: string;
    };
    deviceUuid: string;
}
