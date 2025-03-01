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

const Chat = ({ userStatus }) => {
    const [chatState, setChatState] = useState({
        message: "",
        messages: [],
        receiver: null,
        convParticipants: [],
        conversations: [],
        conversation: {
            title: "",
            isGroup: false,
            avatar: "",
        },
    });

    const [userKeys, setUserKeys] = useState({
        publicKey: null,
        privateKey: null,
    });

    const conversationId = Number(useParams()?.conversationId);

    const messageSoundRef = useRef(new Audio("/sound/notification-sound.m4a"));
    const conversationIdRef = useRef(conversationId);

    const { user } = useAuth();

    const axiosPrivate = useAxiosPrivate();

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
        messageSoundRef,
        socket,
        user,
    });

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/messages`)

            const { convParticipants, messages, title, isGroup, avatar } = res.data.data.conversation;

            const receiver = convParticipants.find(x => x.userId !== user?.id)?.user || null;

            const privateKey = await getPrivateKey();

            // Create an array of promises for decrypting messages
            const decryptionPromises = messages.map((message) => {
                if (message.senderId !== user?.id) {
                    // Return the decryption promise directly (without await)
                    return cryptoUtils.decryptMessage(privateKey, {
                        content: message.content,
                        iv: message.iv,
                        ephemeralPublicKey: message.ephemeralPublicKey
                    }).then((content) => {
                        console.log("Decrypted content:", content);
                        message.content = content; // Update the message content
                        return message; // Return the updated message
                    }).catch((error) => {
                        console.error("Failed to decrypt message:", error);
                        return message; // Return the original message in case of an error
                    });
                } else {
                    // If the message doesn't need decryption, return it as-is
                    return Promise.resolve(message);
                }
            });

            // Wait for all decryption promises to resolve
            const decryptedMessages = await Promise.all(decryptionPromises);
            console.log("Decrypted messages:", decryptedMessages);


            setChatState((prevState) => ({
                ...prevState,
                messages: decryptedMessages,
                receiver: receiver,
                conversation: {
                    title: title,
                    isGroup: isGroup,
                    avatar: avatar,
                },
                convParticipants: convParticipants,
            }));
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async () => {
        try {
            if (chatState.message.trim()) {
                if (!userKeys.publicKey) {
                    console.error("Public key is not available!");
                    return;
                }

                const { content, iv, ephemeralPublicKey } = await cryptoUtils.encryptMessage(userKeys.publicKey, chatState.message)

                const messageData = {
                    senderId: user?.id,
                    conversationId: conversationId,
                    content: chatState.message,
                    status: messageStatus.Sending,
                };

                const encryptedMessage = {
                    ...messageData,
                    content: content,
                    iv: iv,
                    ephemeralPublicKey: ephemeralPublicKey,
                };

                if (chatState.conversation.isGroup) {
                    // socket.emit("send-group-message", encryptedMessage);
                } else {
                    encryptedMessage.receiverId = chatState.receiver?.id;
                    socket.emit("send-private-message", encryptedMessage);
                }

                setChatState((prevState) => ({
                    ...prevState,
                    messages: [...prevState.messages, messageData],
                    message: "",
                }));
            }
        } catch (error) {
            console.error(error);
        }
    };


    const getConversations = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + "/me");
            const { conversations } = res.data.data;

            setChatState((prevState) => ({
                ...prevState,
                conversations: conversations
            }));
        } catch (error) {
            console.error(error);
        }
    }



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



    useEffect(() => {
        conversationIdRef.current = conversationId;

        getConversations();
    }, [conversationId]);

    useEffect(() => {
        if (cryptoUtils.hasPrivateKey(user.id)) {
            getMessages();
        }
    }, [conversationId, cryptoUtils.hasPrivateKey(user.id)]);

    useEffect(() => {
        if (chatState.receiver) {
            getPublicKey();
        }
    }, [chatState.receiver]);

    useEffect(() => {
        if (chatState.messages.length > 0) {
            socket.on("new-private-message", async (data) => {
                try {
                    messageSoundRef.current.play().catch((error) =>
                        console.error("Audio play error:", error)
                    );

                    if (data.conversationId === conversationIdRef.current) {
                        const decryptedMessage = await cryptoUtils.decryptMessage(userKeys.privateKey,
                            {
                                content: data.content,
                                iv: data.iv,
                                ephemeralPublicKey: data.ephemeralPublicKey
                            }
                        );

                        console.log("Decrypted message:", decryptedMessage);

                        const message = {
                            ...data,
                            content: decryptedMessage,
                            iv: null,
                            ephemeralPublicKey: null,
                        }

                        setChatState((prevState) => ({
                            ...prevState,
                            messages: [...prevState.messages, message],
                        }));

                        socket.emit("private-message-seen", {
                            senderId: data.senderId,
                            messageId: data.messageId,
                            conversationId: data.conversationId,
                            messageStatusId: data.messageStatusId,
                        })
                    }
                } catch (error) {
                    console.error(error);
                }
            });

            socket.on("private-message-status-update", (data) => {
                setChatState((prevState) => {
                    const messageIndex = prevState.messages.findLastIndex((msg) => {
                        if (msg.status === messageStatus.Sending) return true;
                        return msg.id === data.messageId;
                    });

                    if (messageIndex === -1) return prevState;

                    const updatedMessages = [...prevState.messages];
                    updatedMessages[messageIndex] = {
                        ...updatedMessages[messageIndex],
                        status: data.status,
                        id: data.messageId,
                    };

                    return {
                        ...prevState,
                        messages: updatedMessages,
                    };
                });
            });

            socket.on("new-group-message", (data) => {
                messageSoundRef.current.play().catch((error) =>
                    console.error("Audio play error:", error)
                );

                if (data.conversationId === conversationIdRef.current) {
                    setChatState((prevState) => ({
                        ...prevState,
                        messages: [...prevState.messages, data],
                    }));

                    socket.emit("group-message-seen", {
                        senderId: data.senderId,
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        messageStatusId: data.messageStatusId,
                    })
                }
            });

            socket.on("group-message-status-update", ({ messageId, userId, status }) => {
                setChatState((prevState) => {
                    const updatedMessages = [...prevState.messages];
                    const messageIndex = updatedMessages.findLastIndex(
                        (msg) => msg.status === messageStatus.Sending || msg.id === messageId
                    );

                    if (messageIndex === -1) return prevState;
                    const message = updatedMessages[messageIndex];

                    if (status === messageStatus.Seen) {
                        message.statuses = message.statuses || [];
                        message.status = null;

                        const statusIndex = message.statuses.findIndex((s) => s.userId === userId);
                        if (statusIndex === -1) {
                            message.statuses.push({ userId, status });
                        } else {
                            message.statuses[statusIndex].status = status;
                        }
                    } else {
                        updatedMessages[messageIndex] = { ...message, status, id: messageId };
                    }

                    return { ...prevState, messages: updatedMessages };
                });
            });



            return () => {
                socket.off("new-private-message");
                socket.off("private-message-status-update");
                socket.off("group-message-status-update");
                socket.off("new-group-message");
            };
        }
    }, [chatState.messages.length]);


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
