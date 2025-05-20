import { UserStatus, Receiver } from '../../types/users.types';
import { Conversation } from '../../types/useChatMessages.types';

export type ChatHeaderProps = {
    conversation: Conversation;
    userStatus: UserStatus;
    receiver: Receiver;
    startCall: (video?: boolean) => void;
};
