import { Socket } from 'socket.io-client';
import { AxiosInstance } from 'axios';
import { UserKeys } from '../../types/users.types';
import { MessageStatus } from '../../enums/messageStatus.enum';

export type UseChatMessagesProps = {
    conversationId: string;
    userId: number;
    socket: Socket;
    axiosPrivate: AxiosInstance;
    userKeys: UserKeys;
};

export type PrivateMessageProps = {
    id: string;
    senderId: string;
    conversationId: string;
    content: string;
    iv: string;
    ephemeralPublicKey: string;
    createdAt: string;
    status: MessageStatus;
};

export type PrivateMessageStatusUpdateProps = {
    messageId: string;
    status: MessageStatus;
};

export type GroupMessageProps = {
    id: string;
    senderId: string;
    conversationId: string;
    content: string;
    iv: string;
    createdAt: string;
    status: MessageStatus;
};

export type GroupMessageStatusUpdateProps = {
    messageId: string;
    status: MessageStatus;
    userId: number;
};
