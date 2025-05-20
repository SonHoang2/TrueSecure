import { ChatState } from '../../types/useChatMessages.types';
import { User, UserStatus } from '../../types/users.types';

export type ChatLeftPanelProps = {
    chatState: ChatState;
    user: User;
    userStatus: UserStatus;
    conversationId: string;
    setChatState: React.Dispatch<React.SetStateAction<ChatState>>;
};
