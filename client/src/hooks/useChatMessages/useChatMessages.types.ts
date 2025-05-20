import { Socket } from 'socket.io-client';
import { AxiosInstance } from 'axios';
import { UserKeys } from '../../types/users.types';

export type UseChatMessagesProps = {
    conversationId: string;
    userId: number;
    socket: Socket;
    axiosPrivate: AxiosInstance;
    userKeys: UserKeys;
};

