import { MessageStatus } from '../enums/messageStatus.enum';

export interface Message {
    id: string;
    senderId: number;
    content: string;
    status: MessageStatus;
}
