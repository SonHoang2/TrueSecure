import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
    // Sidebar and navigation
    isSidebarOpen: boolean;
    activeTab: 'chat' | 'profile' | 'settings';

    // Modals
    isCreateGroupChatModalOpen: boolean;
    isCreatePrivateChatModalOpen: boolean;
    isIncomingCallModalOpen: boolean;
    isOutgoingCallModalOpen: boolean;
    isInCallModalOpen: boolean;

    // Chat UI
    isChatInfoSidebarOpen: boolean;
    isEmojiPickerOpen: boolean;
    isFileUploadOpen: boolean;

    // Call state
    incomingCall: {
        callerId: string;
        callerName: string;
        callerAvatar?: string;
    } | null;

    outgoingCall: {
        receiverId: string;
        receiverName: string;
        receiverAvatar?: string;
    } | null;

    currentCall: {
        participantId: string;
        participantName: string;
        participantAvatar?: string;
        isVideoEnabled: boolean;
        isAudioEnabled: boolean;
        callStartTime: string;
    } | null;

    // Loading states
    isConnecting: boolean;
    isReconnecting: boolean;

    // Error handling
    notifications: Array<{
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
        duration?: number;
        createdAt: string;
    }>;

    // Theme and preferences
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    soundEnabled: boolean;
    notificationsEnabled: boolean;
}

const initialState: UIState = {
    // Sidebar and navigation
    isSidebarOpen: true,
    activeTab: 'chat',

    // Modals
    isCreateGroupChatModalOpen: false,
    isCreatePrivateChatModalOpen: false,
    isIncomingCallModalOpen: false,
    isOutgoingCallModalOpen: false,
    isInCallModalOpen: false,

    // Chat UI
    isChatInfoSidebarOpen: false,
    isEmojiPickerOpen: false,
    isFileUploadOpen: false,

    // Call state
    incomingCall: null,
    outgoingCall: null,
    currentCall: null,

    // Loading states
    isConnecting: false,
    isReconnecting: false,

    // Error handling
    notifications: [],

    // Theme and preferences
    theme: 'light',
    fontSize: 'medium',
    soundEnabled: true,
    notificationsEnabled: true,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        // Sidebar and navigation
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.isSidebarOpen = action.payload;
        },
        setActiveTab: (
            state,
            action: PayloadAction<'chat' | 'profile' | 'settings'>,
        ) => {
            state.activeTab = action.payload;
        },

        // Modals
        openCreateGroupChatModal: (state) => {
            state.isCreateGroupChatModalOpen = true;
        },
        closeCreateGroupChatModal: (state) => {
            state.isCreateGroupChatModalOpen = false;
        },
        openCreatePrivateChatModal: (state) => {
            state.isCreatePrivateChatModalOpen = true;
        },
        closeCreatePrivateChatModal: (state) => {
            state.isCreatePrivateChatModalOpen = false;
        },
        openIncomingCallModal: (
            state,
            action: PayloadAction<{
                callerId: string;
                callerName: string;
                callerAvatar?: string;
            }>,
        ) => {
            state.isIncomingCallModalOpen = true;
            state.incomingCall = action.payload;
        },
        closeIncomingCallModal: (state) => {
            state.isIncomingCallModalOpen = false;
            state.incomingCall = null;
        },
        openOutgoingCallModal: (
            state,
            action: PayloadAction<{
                receiverId: string;
                receiverName: string;
                receiverAvatar?: string;
            }>,
        ) => {
            state.isOutgoingCallModalOpen = true;
            state.outgoingCall = action.payload;
        },
        closeOutgoingCallModal: (state) => {
            state.isOutgoingCallModalOpen = false;
            state.outgoingCall = null;
        },
        openInCallModal: (
            state,
            action: PayloadAction<{
                participantId: string;
                participantName: string;
                participantAvatar?: string;
                isVideoEnabled: boolean;
                isAudioEnabled: boolean;
            }>,
        ) => {
            state.isInCallModalOpen = true;
            state.currentCall = {
                ...action.payload,
                callStartTime: new Date().toISOString(),
            };
        },
        closeInCallModal: (state) => {
            state.isInCallModalOpen = false;
            state.currentCall = null;
        },
        updateCallSettings: (
            state,
            action: PayloadAction<{
                isVideoEnabled?: boolean;
                isAudioEnabled?: boolean;
            }>,
        ) => {
            if (state.currentCall) {
                if (action.payload.isVideoEnabled !== undefined) {
                    state.currentCall.isVideoEnabled =
                        action.payload.isVideoEnabled;
                }
                if (action.payload.isAudioEnabled !== undefined) {
                    state.currentCall.isAudioEnabled =
                        action.payload.isAudioEnabled;
                }
            }
        },

        // Chat UI
        toggleChatInfoSidebar: (state) => {
            state.isChatInfoSidebarOpen = !state.isChatInfoSidebarOpen;
        },
        setChatInfoSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.isChatInfoSidebarOpen = action.payload;
        },
        toggleEmojiPicker: (state) => {
            state.isEmojiPickerOpen = !state.isEmojiPickerOpen;
        },
        setEmojiPickerOpen: (state, action: PayloadAction<boolean>) => {
            state.isEmojiPickerOpen = action.payload;
        },
        toggleFileUpload: (state) => {
            state.isFileUploadOpen = !state.isFileUploadOpen;
        },
        setFileUploadOpen: (state, action: PayloadAction<boolean>) => {
            state.isFileUploadOpen = action.payload;
        },

        // Loading states
        setConnecting: (state, action: PayloadAction<boolean>) => {
            state.isConnecting = action.payload;
        },
        setReconnecting: (state, action: PayloadAction<boolean>) => {
            state.isReconnecting = action.payload;
        },

        // Notifications
        addNotification: (
            state,
            action: PayloadAction<{
                type: 'success' | 'error' | 'warning' | 'info';
                title: string;
                message: string;
                duration?: number;
            }>,
        ) => {
            const notification = {
                id: Date.now().toString(),
                ...action.payload,
                createdAt: new Date().toISOString(),
            };
            state.notifications.push(notification);
        },
        removeNotification: (state, action: PayloadAction<string>) => {
            state.notifications = state.notifications.filter(
                (notification) => notification.id !== action.payload,
            );
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },

        // Theme and preferences
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload;
        },
        setFontSize: (
            state,
            action: PayloadAction<'small' | 'medium' | 'large'>,
        ) => {
            state.fontSize = action.payload;
        },
        setSoundEnabled: (state, action: PayloadAction<boolean>) => {
            state.soundEnabled = action.payload;
        },
        setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
            state.notificationsEnabled = action.payload;
        },
    },
});

export const {
    // Sidebar and navigation
    toggleSidebar,
    setSidebarOpen,
    setActiveTab,

    // Modals
    openCreateGroupChatModal,
    closeCreateGroupChatModal,
    openCreatePrivateChatModal,
    closeCreatePrivateChatModal,
    openIncomingCallModal,
    closeIncomingCallModal,
    openOutgoingCallModal,
    closeOutgoingCallModal,
    openInCallModal,
    closeInCallModal,
    updateCallSettings,

    // Chat UI
    toggleChatInfoSidebar,
    setChatInfoSidebarOpen,
    toggleEmojiPicker,
    setEmojiPickerOpen,
    toggleFileUpload,
    setFileUploadOpen,

    // Loading states
    setConnecting,
    setReconnecting,

    // Notifications
    addNotification,
    removeNotification,
    clearNotifications,

    // Theme and preferences
    setTheme,
    setFontSize,
    setSoundEnabled,
    setNotificationsEnabled,
} = uiSlice.actions;

export default uiSlice.reducer;
