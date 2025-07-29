import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MessageStatus } from '../../enums/messageStatus.enum';
import { Message } from '../../types/messages.types';
import {
    getMessagesFromIndexedDB,
    storeMessagesInIndexedDB,
} from '../../utils/indexedDB';

export interface ChatState {
    currentMessage: string;
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    isTyping: boolean;
    typingUsers: string[];
}

const initialState: ChatState = {
    currentMessage: '',
    messages: [],
    isLoading: false,
    error: null,
    isTyping: false,
    typingUsers: [],
};

export const loadMessages = createAsyncThunk(
    'chat/loadMessages',
    async (conversationId: number, { rejectWithValue }) => {
        try {
            const messages = await getMessagesFromIndexedDB(conversationId);
            return messages;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : 'Failed to load messages',
            );
        }
    },
);

export const storeMessage = createAsyncThunk(
    'chat/storeMessage',
    async (message: Message, { dispatch }) => {
        await storeMessagesInIndexedDB(message);
        dispatch(addMessage(message));
    },
);

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setCurrentMessage: (state, action: PayloadAction<string>) => {
            state.currentMessage = action.payload;
        },
        clearCurrentMessage: (state) => {
            state.currentMessage = '';
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
        updateMessage: (
            state,
            action: PayloadAction<{
                messageId: string;
                updates: Partial<Message>;
            }>,
        ) => {
            const messageIndex = state.messages.findIndex(
                (msg) => msg.id === action.payload.messageId,
            );
            if (messageIndex !== -1) {
                state.messages[messageIndex] = {
                    ...state.messages[messageIndex],
                    ...action.payload.updates,
                };
            }
        },
        updateMessageStatus: (
            state,
            action: PayloadAction<{ messageId: string; status: MessageStatus }>,
        ) => {
            const messageIndex = state.messages.findLastIndex(
                (msg) =>
                    msg.status === MessageStatus.SENDING ||
                    msg.id === action.payload.messageId,
            );
            if (messageIndex !== -1) {
                state.messages[messageIndex].status = action.payload.status;
                state.messages[messageIndex].id = action.payload.messageId;
            }

            
        },
        updateGroupMessageStatus: (
            state,
            action: PayloadAction<{
                messageId: string;
                userId: number;
                status: MessageStatus;
            }>,
        ) => {
            const messageIndex = state.messages.findLastIndex(
                (msg) =>
                    msg.status === MessageStatus.SENDING ||
                    msg.id === action.payload.messageId,
            );

            if (messageIndex !== -1) {
                const message = state.messages[messageIndex];

                if (action.payload.status === MessageStatus.SEEN) {
                    if (!message.statuses) {
                        message.statuses = [];
                    }

                    const statusIndex = message.statuses.findIndex(
                        (s) => s.userId === action.payload.userId,
                    );
                    if (statusIndex === -1) {
                        message.statuses.push({
                            userId: action.payload.userId,
                            status: action.payload.status,
                        });
                    } else {
                        message.statuses[statusIndex].status =
                            action.payload.status;
                    }
                    message.status = MessageStatus.DELIVERED; // Reset individual status
                } else {
                    message.status = action.payload.status;
                    message.id = action.payload.messageId;
                }
            }
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        setTyping: (state, action: PayloadAction<boolean>) => {
            state.isTyping = action.payload;
        },
        addTypingUser: (state, action: PayloadAction<string>) => {
            if (!state.typingUsers.includes(action.payload)) {
                state.typingUsers.push(action.payload);
            }
        },
        removeTypingUser: (state, action: PayloadAction<string>) => {
            state.typingUsers = state.typingUsers.filter(
                (userId) => userId !== action.payload,
            );
        },
        clearTypingUsers: (state) => {
            state.typingUsers = [];
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Load messages cases
            .addCase(loadMessages.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loadMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                state.messages = action.payload;
            })
            .addCase(loadMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setCurrentMessage,
    clearCurrentMessage,
    addMessage,
    updateMessage,
    updateMessageStatus,
    updateGroupMessageStatus,
    clearMessages,
    setTyping,
    addTypingUser,
    removeTypingUser,
    clearTypingUsers,
    clearError,
} = chatSlice.actions;

export default chatSlice.reducer;
