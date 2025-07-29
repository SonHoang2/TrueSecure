import { MessageStatus } from '../enums/messageStatus.enum';

export interface Message {
    id: string;
    senderId: number;
    conversationId: number;
    content: string;
    type: 'text' | 'image' | 'file';
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    status: MessageStatus;
    createdAt: string;
    statuses?: Array<{
        userId: number;
        status: MessageStatus;
    }>;
    iv?: string;
    ephemeralPublicKey?: string;
}

export interface LastSeenStatus {
    userId: number;
    messageId: string;
    avatar: string | any;
}
