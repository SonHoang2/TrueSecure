import { Conversation, ConversationParticipant } from "./conversations.types";

export type ChatState = {
    message: string;
    messages: any[];
    receiver: any | null;
    convParticipants: ConversationParticipant[] | [];
    conversations: any[];
    conversation: Conversation;
};
