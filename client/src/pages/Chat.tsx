import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import socket from '../utils/socket';
import { useAuth } from '../hooks/useAuth';
import ChatLeftPanel from '../component/ChatLeftPanel';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { MessageList } from '../component/MessageList';
import { ChatHeader } from '../component/ChatHeader';
import { IncomingCallModal } from '../component/IncomingCallModal';
import OutgoingCallModal from '../component/OutgoingCallModal';
import InCallModal from '../component/InCallModal';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChatMessages } from '../hooks/useChatMessages';
import { useAppDispatch, useConversations } from '../store/hooks';
import { setCurrentMessage } from '../store/slices/chatSlice';
import { loadConversationDetails } from '../store/slices/conversationSlice';
import SidebarNavigation from '../component/SidebarNavigation';
import { MdImage, MdSend, MdThumbUp } from 'react-icons/md';
import { UserStatus } from '../types/users.types';
import ChatInfoSidebar from '../component/ChatInfoSidebar';
import { useAuthUser } from '../hooks/useAuthUser';
import { fetchRecipientDevices } from '../store/slices/conversationSlice';
import { Routes } from '../enums/routes.enum';

interface ChatProps {
    userStatus: UserStatus;
}

const Chat: React.FC<ChatProps> = ({ userStatus }) => {
    const conversationId = Number(useParams()?.conversationId);
    const [showChatInfo, setShowChatInfo] = useState(false);

    const user = useAuthUser();
    const { userKeys, isKeysInitialized } = useAuth();
    const dispatch = useAppDispatch();

    const { currentConversation, currentReceiver, participants, error } =
        useConversations();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const axiosPrivate = useAxiosPrivate();

    const {
        sendMessage,
        sendQuickReaction,
        lastSeenStatus,
        messages,
        currentMessage,
        typingUsers,
    } = useChatMessages({
        userId: user?.id,
        socket,
        axiosPrivate,
        userKeys,
    });

    const {
        callState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localStream,
        remoteStream,
    } = useWebRTC({
        receiverId: currentReceiver?.id,
        socket,
        user,
        axiosPrivate,
    });

    useEffect(() => {
        if (conversationId) {
            dispatch(loadConversationDetails(conversationId));
        }
    }, [conversationId, dispatch]);

    useEffect(() => {
        if (
            currentConversation &&
            currentConversation.isGroup === false &&
            currentReceiver?.id
        ) {
            dispatch(
                fetchRecipientDevices({
                    receiverId: currentReceiver.id,
                    axiosPrivate,
                }),
            );
        }
    }, [currentConversation?.id, axiosPrivate, dispatch]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('File size must be less than 5MB');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);
            formData.append('conversationId', conversationId.toString());

            console.log('Sending image:', formData);
        }

        // Reset the input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerImageUpload = () => {
        fileInputRef.current?.click();
    };

    if (
        (error && error.includes('not found')) ||
        error?.includes('not a participant')
    ) {
        return (
            <div className="py-4 flex bg-neutral-100 h-full">
                <SidebarNavigation />
                <div
                    className={`hidden md:min-w-[400px] md:flex md:w-auto me-4`}
                >
                    <ChatLeftPanel
                        userStatus={userStatus}
                        conversationId={conversationId}
                    />
                </div>
                <div className="rounded-lg bg-white me-4 flex-col flex w-full">
                    <div className="flex flex-col items-center justify-center h-full py-20">
                        <div className="text-center max-w-md mx-auto">
                            <div className="mb-4">
                                <svg
                                    className="mx-auto h-16 w-16 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1}
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Conversation Not Available
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {error.includes('not found')
                                    ? 'This conversation no longer exists.'
                                    : 'You are not a participant in this conversation.'}
                            </p>
                            <Link
                                to={Routes.HOME}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors inline-block text-center"
                            >
                                Go Back
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4 flex bg-neutral-100 h-full">
            <SidebarNavigation />
            <div className={`hidden md:min-w-[400px] md:flex md:w-auto me-4`}>
                <ChatLeftPanel
                    userStatus={userStatus}
                    conversationId={conversationId}
                />
            </div>
            {currentConversation && (
                <div
                    className={`rounded-lg bg-white me-4 flex-col flex ${
                        showChatInfo ? 'lg:w-4/6 hidden lg:flex' : 'flex w-full'
                    }`}
                >
                    <ChatHeader
                        conversation={currentConversation}
                        userStatus={userStatus}
                        receiver={currentReceiver}
                        startCall={startCall}
                        onMoreClick={() => setShowChatInfo(!showChatInfo)}
                        showChatInfo={showChatInfo}
                    />
                    <MessageList
                        messages={messages}
                        userId={user?.id}
                        conversation={currentConversation}
                        lastSeenStatus={lastSeenStatus}
                        receiver={currentReceiver}
                        convParticipants={participants}
                        typingUsers={typingUsers}
                    />
                    <div className="flex p-1 items-center mb-2">
                        {/* <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                            onClick={triggerImageUpload}
                        >
                            <MdImage className="text-blue-500 text-2xl" />
                        </button> */}
                        <input
                            type="text"
                            className="flex-grow ms-2 bg-gray-100 px-3 py-2 rounded-3xl focus:outline-none caret-blue-500 me-2"
                            placeholder="Aa"
                            value={currentMessage}
                            onChange={(e) =>
                                dispatch(setCurrentMessage(e.target.value))
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    sendMessage();
                                }
                            }}
                        />
                        {currentMessage.length > 0 ? (
                            <button
                                className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                                onClick={sendMessage}
                            >
                                <MdSend className="text-blue-500 text-2xl" />
                            </button>
                        ) : (
                            <button
                                className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                                onClick={sendQuickReaction}
                            >
                                <MdThumbUp className="text-blue-500 text-2xl" />
                            </button>
                        )}
                    </div>
                </div>
            )}
            {currentConversation && (
                <ChatInfoSidebar
                    isOpen={showChatInfo}
                    onClose={() => setShowChatInfo(false)}
                    conversation={currentConversation}
                    receiver={currentReceiver}
                    participants={participants}
                />
            )}
            <div>
                {callState.isRinging && callState.sender && (
                    <IncomingCallModal
                        onReject={rejectCall}
                        onAccept={acceptCall}
                        sender={callState.sender}
                    />
                )}
                {callState.isCalling && (
                    <OutgoingCallModal
                        onEndCall={endCall}
                        receiver={currentReceiver}
                        isVideoCall={callState.isVideoCall}
                        localStream={localStream}
                    />
                )}

                {callState.isConnected && (
                    <InCallModal
                        onEndCall={endCall}
                        receiver={currentReceiver}
                        isVideoCall={callState.isVideoCall}
                        remoteStream={remoteStream}
                        localStream={localStream}
                    />
                )}
            </div>
        </div>
    );
};

export default Chat;
