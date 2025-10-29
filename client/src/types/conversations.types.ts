import { User } from "./users.types";

export interface Conversation {
    id: number;
    title: string;
    isGroup: boolean | null;
    avatar: string;
    lastMessage?: {
        content: string;
        senderId: number;
        createdAt: string;
        type: 'text' | 'image' | 'file';
    };
    unreadCount: number;
    participants: User[];
    receiver?: User;
    createdAt: string;
    updatedAt: string;
    uuid: string;
    groupEpoch?: number;
    rotateNeeded?: boolean;
}
