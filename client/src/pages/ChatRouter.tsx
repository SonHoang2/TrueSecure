import socket from '../utils/socket';
import { useAuth } from '../hooks/useAuth';
import { ChatLeftPanel } from '../component/ChatLeftPanel';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import SidebarNavigation from '../component/SidebarNavigation';
import { useChatMessages } from '../hooks/useChatMessages';
import { useEncryptionContext } from '../contexts/EncryptionContext';
import { useState } from 'react';
import { UserStatus } from '../types/users.types';

type ChatRouterProps = {
    userStatus: UserStatus;
};

const ChatRouter: React.FC<ChatRouterProps> = ({ userStatus }) => {
    const { user } = useAuth();

    const axiosPrivate = useAxiosPrivate();
    const { userKeys } = useEncryptionContext();

    const { chatState, setChatState } = useChatMessages({
        userId: user?.id || 0,
        socket,
        axiosPrivate,
        userKeys,
    });

    // Don't render if user is not loaded yet
    if (!user || !userKeys) {
        return (
            <div className="flex items-center justify-center h-full bg-neutral-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading your secure chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4 flex bg-neutral-100 h-full w-full">
            <SidebarNavigation />
            <div className="flex-1 md:min-w-[400px] md:flex-none md:w-auto">
                <ChatLeftPanel
                    chatState={chatState}
                    user={user}
                    userStatus={userStatus}
                    setChatState={setChatState}
                />
            </div>
            <div className="hidden md:flex rounded-lg bg-white w-4/5 me-4 flex-col">
                <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">
                            Select a conversation
                        </h3>
                        <p>
                            Choose a contact from the sidebar to start chatting
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatRouter;
