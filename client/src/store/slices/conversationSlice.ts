import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/users.types';
import { axiosPrivate } from '../../api/axios';
import { CONVERSATIONS_URL } from '../../config/config';
import { Conversation } from '../../types/conversations.types';

export interface ConversationState {
    conversations: Conversation[];
    currentConversation: Conversation | null;
    currentReceiver: any | null;
    participants: User[];
    isLoading: boolean;
    error: string | null;
    selectedConversationId: number | null;
}

const initialState: ConversationState = {
    conversations: [],
    currentConversation: null,
    currentReceiver: null,
    participants: [],
    isLoading: false,
    error: null,
    selectedConversationId: null,
};

export const loadConversations = createAsyncThunk(
    'conversations/loadConversations',
    async (_, { rejectWithValue }) => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + '/me');

            return res.data.data.conversations as Conversation[];
        } catch (error) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : 'Failed to load conversations',
            );
        }
    },
);

export const loadConversationDetails = createAsyncThunk(
    'conversations/loadConversationDetails',
    async (conversationId: number, { rejectWithValue }) => {
        try {
            const res = await axiosPrivate.get(
                `${CONVERSATIONS_URL}/${conversationId}`,
            );
            return res.data.data;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : 'Failed to load conversation details',
            );
        }
    },
);

export const createConversation = createAsyncThunk(
    'conversations/createConversation',
    async (
        conversationData: {
            title: string;
            isGroup: boolean;
            participants: string[];
        },
        { rejectWithValue },
    ) => {
        try {
            // Your create conversation API call here
            const newConversation: Conversation = {} as Conversation;
            return newConversation;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : 'Failed to create conversation',
            );
        }
    },
);

const conversationSlice = createSlice({
    name: 'conversations',
    initialState,
    reducers: {
        setCurrentConversation: (
            state,
            action: PayloadAction<Conversation>,
        ) => {
            state.currentConversation = action.payload;
            state.selectedConversationId = action.payload.id;
        },
        setCurrentReceiver: (state, action: PayloadAction<any>) => {
            state.currentReceiver = action.payload;
        },
        setParticipants: (state, action: PayloadAction<User[]>) => {
            state.participants = action.payload;
        },
        selectConversation: (state, action: PayloadAction<number>) => {
            state.selectedConversationId = action.payload;
            const conversation = state.conversations.find(
                (conv) => conv.id === action.payload,
            );
            if (conversation) {
                state.currentConversation = conversation;
            }
        },
        updateConversationLastMessage: (
            state,
            action: PayloadAction<{
                conversationId: number;
                lastMessage: {
                    content: string;
                    senderId: number;
                    createdAt: string;
                    type: 'text' | 'image' | 'file';
                };
            }>,
        ) => {
            const conversationIndex = state.conversations.findIndex(
                (conv) => conv.id === action.payload.conversationId,
            );
            if (conversationIndex !== -1) {
                state.conversations[conversationIndex].lastMessage =
                    action.payload.lastMessage;
                state.conversations[conversationIndex].updatedAt =
                    action.payload.lastMessage.createdAt;
            }
        },
        incrementUnreadCount: (state, action: PayloadAction<number>) => {
            const conversationIndex = state.conversations.findIndex(
                (conv) => conv.id === action.payload,
            );
            if (conversationIndex !== -1) {
                state.conversations[conversationIndex].unreadCount++;
            }
        },
        resetUnreadCount: (state, action: PayloadAction<number>) => {
            const conversationIndex = state.conversations.findIndex(
                (conv) => conv.id === action.payload,
            );
            if (conversationIndex !== -1) {
                state.conversations[conversationIndex].unreadCount = 0;
            }
        },
        addConversation: (state, action: PayloadAction<Conversation>) => {
            const existingIndex = state.conversations.findIndex(
                (conv) => conv.id === action.payload.id,
            );
            if (existingIndex === -1) {
                state.conversations.unshift(action.payload);
            }
        },
        removeConversation: (state, action: PayloadAction<number>) => {
            state.conversations = state.conversations.filter(
                (conv) => conv.id !== action.payload,
            );
            if (state.selectedConversationId === action.payload) {
                state.selectedConversationId = null;
                state.currentConversation = null;
            }
        },
        clearCurrentConversation: (state) => {
            state.currentConversation = null;
            state.currentReceiver = null;
            state.participants = [];
            state.selectedConversationId = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Load conversations cases
            .addCase(loadConversations.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loadConversations.fulfilled, (state, action) => {
                state.isLoading = false;
                state.conversations = action.payload;
            })
            .addCase(loadConversations.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Load conversation details cases
            .addCase(loadConversationDetails.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loadConversationDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentConversation = action.payload;
                state.selectedConversationId = action.payload.id;
                state.participants = action.payload.participants;
                state.currentReceiver = action.payload.receiver;
            })
            .addCase(loadConversationDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Create conversation cases
            .addCase(createConversation.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createConversation.fulfilled, (state, action) => {
                state.isLoading = false;
                state.conversations.unshift(action.payload);
                state.currentConversation = action.payload;
                state.selectedConversationId = action.payload.id;
            })
            .addCase(createConversation.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setCurrentConversation,
    setCurrentReceiver,
    setParticipants,
    selectConversation,
    updateConversationLastMessage,
    incrementUnreadCount,
    resetUnreadCount,
    addConversation,
    removeConversation,
    clearCurrentConversation,
    clearError,
} = conversationSlice.actions;

export default conversationSlice.reducer;
