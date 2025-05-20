import { Socket } from 'socket.io-client';
import { AxiosInstance } from 'axios';
import { User, UserKeys } from './users.types';

export type UseChatMessagesProps = {
    conversationId: string;
    userId: number;
    socket: Socket;
    axiosPrivate: AxiosInstance;
    userKeys: UserKeys;
};

export type Conversation = {
    title: string;
    isGroup: boolean | null;
    avatar: string;
};

export type ConversationParticipant = {
    id: number;
    userId: number;
    conversationId: number;
    role: string;
    groupKey: string | null;
    user: Partial<User>;
};

export type ChatState = {
    message: string;
    messages: any[];
    receiver: any | null;
    convParticipants: ConversationParticipant[] | [];
    conversations: any[];
    conversation: Conversation;
};
