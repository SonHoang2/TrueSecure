import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import socket from '../utils/socket';
import { useAuth } from '../hooks/useAuth';
import ChatLeftPanel from '../component/ChatLeftPanel/ChatLeftPanel';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { MessageList } from '../component/MessageList/MessageList';
import { ChatHeader } from '../component/ChatHeader/ChatHeader';
import { IncomingCallModal } from '../component/IncomingCallModal/IncomingCallModal';
import OutgoingCallModal from '../component/OutgoingCallModal/OutgoingCallModal';
import InCallModal from '../component/InCallModal/InCallModal';
import { useWebRTC } from '../hooks/useWebRTC/useWebRTC';
import { useChatMessages } from '../hooks/useChatMessages/useChatMessages';
import SidebarNavigation from '../component/SidebarNavigation/SidebarNavigation';
import { MdAddCircle, MdImage, MdGifBox, MdThumbUp } from 'react-icons/md';
import { useEncryptionContext } from '../contexts/EncryptionContext';
import {
    getAdminPublicKey,
    getUserPublicKey,
} from '../services/encryptionService';

const Chat = ({ userStatus }) => {
    const conversationId = Number(useParams()?.conversationId);

    const { user } = useAuth();
    const { userKeys, setUserKeys } = useEncryptionContext();

    const axiosPrivate = useAxiosPrivate();

    const { sendMessage, chatState, setChatState, lastSeenStatus } =
        useChatMessages({
            conversationId,
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
        receiverId: chatState.receiver?.id,
        socket,
        user,
    });

    useEffect(() => {
        if (chatState.conversation.isGroup === null) {
            return;
        }

        const init = async () => {
            let publicKey;

            if (chatState.conversation.isGroup) {
                publicKey = await getAdminPublicKey(
                    chatState.convParticipants,
                    axiosPrivate,
                );
            } else {
                publicKey = await getUserPublicKey(
                    chatState.receiver?.id,
                    axiosPrivate,
                );
            }

            setUserKeys((prevKeys) => ({
                ...prevKeys,
                publicKey,
            }));
        };

        init();
    }, [chatState.receiver, chatState.conversation.isGroup]);

    return (
        <div className="py-4 flex bg-neutral-100 h-full">
            <SidebarNavigation />
            <ChatLeftPanel
                chatState={chatState}
                user={user}
                userStatus={userStatus}
                conversationId={conversationId}
                setChatState={setChatState}
            />
            {
                <div className="rounded-lg bg-white w-4/5 me-4 flex flex-col">
                    <ChatHeader
                        conversation={chatState.conversation}
                        userStatus={userStatus}
                        receiver={chatState.receiver}
                        startCall={startCall}
                    />
                    <MessageList
                        messages={chatState.messages}
                        userId={user?.id}
                        conversation={chatState.conversation}
                        lastSeenStatus={lastSeenStatus}
                        receiver={chatState.receiver}
                        convParticipants={chatState.convParticipants}
                    />
                    <div className="flex p-1 items-center mb-2">
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <MdAddCircle className="text-blue-500 text-2xl" />
                        </button>
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <MdImage className="text-blue-500 text-2xl" />
                        </button>
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <MdGifBox className="text-blue-500 text-2xl" />
                        </button>
                        <input
                            type="text"
                            className="flex-grow ms-2 bg-gray-100 px-3 py-2 rounded-3xl focus:outline-none caret-blue-500 me-2"
                            placeholder="Aa"
                            value={chatState.message}
                            onChange={(e) =>
                                setChatState((prevState) => ({
                                    ...prevState,
                                    message: e.target.value,
                                }))
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    sendMessage();
                                }
                            }}
                        />
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <MdThumbUp className="text-blue-500 text-2xl" />
                        </button>
                    </div>
                </div>
            }

            <div>
                {callState.isRinging && (
                    <IncomingCallModal
                        onReject={rejectCall}
                        onAccept={acceptCall}
                        sender={callState.sender}
                    />
                )}
                {callState.isCalling && (
                    <OutgoingCallModal
                        onEndCall={endCall}
                        receiver={chatState.receiver}
                        isVideoCall={callState.isVideoCall}
                        localStream={localStream}
                    />
                )}

                {callState.isConnected && (
                    <InCallModal
                        onEndCall={endCall}
                        receiver={chatState.receiver}
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
