import { User } from './users.types';

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
