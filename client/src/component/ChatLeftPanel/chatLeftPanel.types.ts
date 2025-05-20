import { ChatState } from "../../types/chats.types";
import { User, UserStatus } from '../../types/users.types';

export type ChatLeftPanelProps = {
    chatState: ChatState;
    user: User;
    userStatus: UserStatus;
    conversationId: string;
    setChatState: React.Dispatch<React.SetStateAction<ChatState>>;
};
