import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import socket from "../utils/socket";
import { IMAGES_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import ChatLeftPanel from "../component/ChatLeftPanel";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { MessageList } from "../component/MessageList";
import { ChatHeader } from "../component/ChatHeader";
import { IncomingCallModal } from "../component/IncomingCallModal";
import OutgoingCallModal from "../component/OutgoingCallModal";
import InCallModal from "../component/InCallModal";
import { useWebRTC } from "../hooks/useWebRTC";
import { useChatMessages } from "../hooks/useChatMessages";
import { useEncryption } from "../hooks/useEncryption";

const Chat = ({ userStatus }) => {
    const conversationId = Number(useParams()?.conversationId);

    const { user } = useAuth();

    const axiosPrivate = useAxiosPrivate();

    const {
        userKeys,
        setUserKeys,
        getPrivateKey,
        getPublicKey,
    } = useEncryption({
        userId: user?.id,
        axiosPrivate,
    });

    const {
        sendMessage,
        chatState,
        setChatState,
        lastSeenStatus
    } = useChatMessages({
        conversationId,
        userKeys,
        userId: user?.id,
        socket,
        getPrivateKey,
        axiosPrivate,
    })

    const {
        callState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localStream,
        remoteStream
    } = useWebRTC({
        receiverId: chatState.receiver?.id,
        socket,
        user,
    });

    useEffect(() => {
        if (chatState.receiver) {
            getPublicKey(chatState.receiver?.id);
        }
    }, [chatState.receiver]);

    return (
        <div className="py-4 flex bg-neutral-100 h-full">
            <div className="rounded mx-4 flex flex-col justify-between">
                <div className="rounded-lg p-3 flex align-middle bg-neutral-200">
                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                </div>
                <div className="hover:bg-gray-100 cursor-pointer" onClick={() => { alert("Clicked") }}>
                    <img className="inline-block size-10 rounded-full " src={`${IMAGES_URL}/${user?.avatar}`} alt="" />
                </div>
            </div>
            <ChatLeftPanel chatState={chatState} user={user} userStatus={userStatus} conversationId={conversationId} />
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
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                add_circle
                            </span>
                        </button>
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                imagesmode
                            </span>
                        </button>
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                gif_box
                            </span>
                        </button>
                        <input
                            type="text"
                            className="flex-grow ms-2 bg-gray-100 px-3 py-2 rounded-3xl focus:outline-none caret-blue-500 me-2"
                            placeholder="Aa"
                            value={chatState.message}
                            onChange={(e) => setChatState(prevState => ({ ...prevState, message: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    sendMessage();
                                }
                            }}
                        />
                        <button
                            className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                        >
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                thumb_up
                            </span>
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
                    />
                )}

                {callState.isConnected && (
                    <InCallModal
                        onEndCall={endCall}
                        receiver={chatState.receiver}
                        isVideoCall={callState.isVideoCall}
                        remoteStream={localStream}
                        localStream={remoteStream}
                    />
                )}
            </div>
        </div >
    );
};

export default Chat;
