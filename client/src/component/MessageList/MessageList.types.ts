import { User } from '../../types/users.types';
import { Message } from '../../types/messages.types';
import {
    Conversation,
    ConversationParticipant,
} from '../../types/conversations.types';

export interface GroupSeenStatus {
    id: string;
    messageId: string;
    avatar: string;
}

export interface LastSeenStatus extends GroupSeenStatus {}

export interface MessageListProps {
    messages: Message[];
    userId: number;
    conversation: Conversation;
    lastSeenStatus: LastSeenStatus[] | LastSeenStatus;
    receiver: User;
    convParticipants: ConversationParticipant[];
}
