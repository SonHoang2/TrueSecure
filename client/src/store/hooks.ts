import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for specific slices
export const useChat = () => useAppSelector((state) => state.chat);

export const useConversations = () => {
    const conversations = useAppSelector(
        (state) => state.conversations.conversations,
    );
    const currentConversation = useAppSelector(
        (state) => state.conversations.currentConversation,
    );
    const currentReceiver = useAppSelector(
        (state) => state.conversations.currentReceiver,
    );
    const participants = useAppSelector(
        (state) => state.conversations.participants,
    );
    const recipientDevices = useAppSelector(
        (state) => state.conversations.recipientDevices,
    );
    const isLoading = useAppSelector((state) => state.conversations.isLoading);
    const error = useAppSelector((state) => state.conversations.error); // Add this line
    const selectedConversationId = useAppSelector(
        (state) => state.conversations.selectedConversationId,
    );

    return {
        conversations,
        currentConversation,
        currentReceiver,
        participants,
        recipientDevices,
        isLoading,
        error,
        selectedConversationId,
    };
};
