import { Dispatch, SetStateAction } from 'react';
import { ChatState } from '../../types/chats.types';
import { User } from '../../types/users.types';

export type CreateChatState = {
    createGroupChat: boolean;
    createPrivateChat: boolean;
};

export type CreatePrivateChatProps = {
    setCreateChat: Dispatch<SetStateAction<CreateChatState>>;
    onSearch: (
        searchTerm: string,
        setUsers: Dispatch<SetStateAction<User[]>>,
    ) => Promise<void>;
    setChatState: Dispatch<SetStateAction<ChatState>>;
};
