import { User } from '../../types/users.types';
import { Message } from '../../types/messages.types';
import {
    Conversation,
    ConversationParticipant,
} from '../../types/conversations.types';

export interface LastSeenStatus {
    userId: string;
    messageId: string;
    avatar: string;
}

export interface MessageListProps {
    messages: Message[];
    userId: number;
    conversation: Conversation;
    lastSeenStatus: LastSeenStatus[] | LastSeenStatus;
    receiver: User;
    convParticipants: ConversationParticipant[];
}
