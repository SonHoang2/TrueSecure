import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/users.types';
import { axiosPrivate } from '../../api/axios';
import { CONVERSATIONS_URL, USERS_URL } from '../../config/config';
import { Conversation } from '../../types/conversations.types';
import { AxiosInstance } from 'axios';

export interface RecipientDevice {
    deviceUuid: string;
    publicKey: string;
}

export interface ConversationState {
    conversations: Conversation[];
    currentConversation: Conversation | null;
    currentReceiver: any | null;
    participants: User[];
    recipientDevices: RecipientDevice[];
    isLoading: boolean;
    error: string | null;
    selectedConversationId: number | null;
    groupEpoch: number;
    rotateNeeded: boolean;
}

const initialState: ConversationState = {
    conversations: [],
    currentConversation: null,
    currentReceiver: null,
    participants: [],
    recipientDevices: [],
    isLoading: false,
    error: null,
    selectedConversationId: null,
    groupEpoch: 0,
    rotateNeeded: false,
};

export const completeKeyRotation = createAsyncThunk(
    'conversations/completeKeyRotation',
    async (conversationId: number, { rejectWithValue }) => {
        try {
            await axiosPrivate.patch(
                `${CONVERSATIONS_URL}/${conversationId}/rotate-complete`,
            );
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    'Failed to complete key rotation',
            );
        }
    },
);

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
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const res = await axiosPrivate.get(
                `${CONVERSATIONS_URL}/${conversationId}`,
            );

            return res.data.data;
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Failed to load conversation details';
            return rejectWithValue(errorMessage);
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

export const fetchRecipientDevices = createAsyncThunk(
    'conversations/fetchRecipientDevices',
    async (
        {
            receiverId,
            axiosPrivate,
        }: { receiverId: number; axiosPrivate: AxiosInstance },
        { rejectWithValue },
    ) => {
        try {
            const response = await axiosPrivate.get(
                `${USERS_URL}/${receiverId}/public-keys`,
            );
            return response.data.data.devices;
        } catch (error: any) {
            return rejectWithValue(
                error.message || 'Failed to fetch recipient devices',
            );
        }
    },
);

export const leaveGroup = createAsyncThunk(
    'conversations/leaveGroup',
    async (conversationId: number, { rejectWithValue }) => {
        try {
            await axiosPrivate.delete(
                `${CONVERSATIONS_URL}/${conversationId}/leave`,
            );
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || 'Failed to leave group',
            );
        }
    },
);

export const addUserToConversation = createAsyncThunk(
    'conversations/addUserToConversation',
    async (
        { conversation, userId }: { conversation: string; userId: string },
        { rejectWithValue },
    ) => {
        try {
            const res = await axiosPrivate.post(
                `${CONVERSATIONS_URL}/${conversation}/add-user`,
                { userId },
            );

            return res.data.data.participant;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || 'Failed to add user to group',
            );
        }
    },
);

export const removeUserFromGroup = createAsyncThunk(
    'conversations/removeUserFromGroup',
    async (
        { groupId, userId }: { groupId: number; userId: number },
        { rejectWithValue },
    ) => {
        try {
            await axiosPrivate.delete(
                `${CONVERSATIONS_URL}/${groupId}/remove-user?userId=${userId}`,
            );

            return userId;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    'Failed to remove user from group',
            );
        }
    },
);

export const rotateGroupKeyComplete = createAsyncThunk(
    'conversations/rotateGroupKeyComplete',
    async (conversationId: number, { rejectWithValue }) => {
        try {
            await axiosPrivate.patch(
                `${CONVERSATIONS_URL}/${conversationId}/rotate-complete`,
            );
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    'Failed to complete group key rotation',
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
        setRecipientDevices: (
            state,
            action: PayloadAction<RecipientDevice[]>,
        ) => {
            state.recipientDevices = action.payload;
        },
        clearRecipientDevices: (state) => {
            state.recipientDevices = [];
        },
        clearCurrentConversation: (state) => {
            state.currentConversation = null;
            state.currentReceiver = null;
            state.participants = [];
            state.selectedConversationId = null;
            state.recipientDevices = [];
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
                state.currentConversation = null;
                state.currentReceiver = null;
                state.participants = [];
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
            })
            .addCase(fetchRecipientDevices.fulfilled, (state, action) => {
                state.recipientDevices = action.payload;
            })
            .addCase(fetchRecipientDevices.rejected, (state, action) => {
                state.recipientDevices = [];
                state.error = action.payload as string;
            })
            .addCase(leaveGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(leaveGroup.fulfilled, (state, action) => {
                state.isLoading = false;
                const conversationId = action.payload;
                // Remove the conversation from the list
                state.conversations = state.conversations.filter(
                    (conv) => conv.id !== conversationId,
                );
                // Clear current conversation if it's the one being left
                if (state.selectedConversationId === conversationId) {
                    state.selectedConversationId = null;
                    state.currentConversation = null;
                    state.currentReceiver = null;
                    state.participants = [];
                    state.recipientDevices = [];
                }
            })
            .addCase(leaveGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(addUserToConversation.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(addUserToConversation.fulfilled, (state, action) => {
                state.isLoading = false;
                // Thêm user vào participants list
                if (
                    action.payload &&
                    !state.participants.some((p) => p.id === action.payload.id)
                ) {
                    state.participants.push(action.payload as User);
                }
            })
            .addCase(addUserToConversation.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(removeUserFromGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(removeUserFromGroup.fulfilled, (state, action) => {
                state.isLoading = false;
                // Xóa user khỏi participants list
                state.participants = state.participants.filter(
                    (p) => p.id !== action.payload,
                );
            })
            .addCase(removeUserFromGroup.rejected, (state, action) => {
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
    setRecipientDevices,
    clearRecipientDevices,
    clearCurrentConversation,
    clearError,
} = conversationSlice.actions;

export default conversationSlice.reducer;
