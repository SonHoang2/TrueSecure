import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import socket from "../utils/socket";
import { CONVERSATIONS_URL, IMAGES_URL, messageStatus, USERS_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import ChatLeftPanel from "../component/ChatLeftPanel";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import * as cryptoUtils from "../utils/cryptoUtils"
import { MessageList } from "../component/MessageList";
import { ChatHeader } from "../component/ChatHeader";
import { IncomingCallModal } from "../component/IncomingCallModal";
import OutgoingCallModal from "../component/OutgoingCallModal";
import { useWebRTC } from "../hooks/useWebRTC";
import { useChatMessages } from "../hooks/useChatMessages";

const Chat = ({ userStatus }) => {
    const [userKeys, setUserKeys] = useState({
        publicKey: null,
        privateKey: null,
    });

    const conversationId = Number(useParams()?.conversationId);

    const { user } = useAuth();

    const axiosPrivate = useAxiosPrivate();

    const getPrivateKey = async () => {
        try {
            let privateKey = userKeys.privateKey;
            if (!privateKey) {
                privateKey = await cryptoUtils.importPrivateKey(user.id);
            }
            setUserKeys(prev => ({ ...prev, privateKey }));

            return privateKey;
        }
        catch (error) {
            console.error("Error getting private key:", error);
        }
    };

    const {
        sendMessage,
        chatState,
        setChatState,
    } = useChatMessages ({
        conversationId,
        userKeys,
        userId: user?.id,
        socket,
        getPrivateKey,
    })

    const {
        callState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localAudio,
        remoteAudio,
    } = useWebRTC({
        receiverId: chatState.receiver?.id,
        socket,
        user,
    });

    // console.log("chatState", chatState);
    

    const getPublicKey = async () => {
        try {
            const res = await axiosPrivate.get(USERS_URL + `/${chatState.receiver?.id}/public-key`);
            const { publicKey: exportedPublicKey } = res.data.data;

            if (!exportedPublicKey) {
                console.error("Public key not found!");
                setUserKeys(prev => ({ ...prev, publicKey: null }));
                return;
            }

            const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);

            setUserKeys(prev => ({ ...prev, publicKey }));
        }
        catch (error) {
            console.error("Error getting public key:", error);
        }
    };

    useEffect(() => {
        if (chatState.receiver) {
            getPublicKey();
        }
    }, [chatState.receiver]);

    useEffect(() => {
        const initKey = async () => {
            try {
                const { privateKey, publicKey } = await cryptoUtils.generateECDHKeys();

                const exportedPublicKey = await cryptoUtils.exportPublicKey(publicKey);

                await cryptoUtils.storePrivateKey(privateKey, user.id);

                await axiosPrivate.post(USERS_URL + "/public-key", {
                    publicKey: exportedPublicKey,
                });
            } catch (error) {
                console.error("Error initializing key:", error);
            }
        };


        if (!cryptoUtils.hasPrivateKey(user.id)) {
            initKey();
        }
    }, [])

    const lastSeenStatus = useMemo(() => {
        if (chatState.conversation.isGroup) {
            return chatState.convParticipants
                .map(participant => {
                    if (participant.userId === user?.id) {
                        return null;
                    }

                    for (let i = chatState.messages.length - 1; i >= 0; i--) {
                        const user = chatState.messages[i].statuses?.find(
                            status => status.userId === participant.userId && status.status === messageStatus.Seen
                        );
                        if (user) {
                            return {
                                userId: participant.userId,
                                messageId: chatState.messages[i]?.id,
                                avatar: participant.user.avatar,
                            };
                        }
                    }
                    return null;
                })
                .filter(Boolean);
        }

        return chatState.messages.findLast(message => message.status === messageStatus.Seen);
    }, [chatState.convParticipants, chatState.messages]);

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
            <audio ref={localAudio} autoPlay muted />
            <audio ref={remoteAudio} autoPlay />
            {
                callState.isRinging && (
                    <IncomingCallModal
                        onReject={rejectCall}
                        onAccept={acceptCall}
                        sender={callState.sender}
                    />
                )
            }
            {
                callState.isCalling && (
                    <OutgoingCallModal
                        onEndCall={endCall}
                        receiver={chatState.receiver}
                    />
                )
            }
        </div >
    );
};

export default Chat;
