import { useState, useEffect, useRef } from 'react';
import * as cryptoUtils from '../utils/cryptoUtils';
import useAxiosPrivate from './useAxiosPrivate';
import { CONVERSATIONS_URL, messageStatus } from '../config/config';

export const useChatMessages = ({ conversationId, userKeys, userId, socket, getPrivateKey }) => {
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

    const messageSoundRef = useRef(new Audio("/sound/notification-sound.m4a"));
    const conversationIdRef = useRef(conversationId);

    const axiosPrivate = useAxiosPrivate();

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/messages`)

            const { convParticipants, messages, title, isGroup, avatar } = res.data.data.conversation;

            const receiver = convParticipants.find(x => x.userId !== userId)?.user || null;

            const privateKey = await getPrivateKey();

            // Create an array of promises for decrypting messages
            const decryptionPromises = messages.map((message) => {
                if (message.senderId !== userId) {
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
                    senderId: userId,
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

    console.log("chatState:", chatState);
    

    useEffect(() => {
        console.log(userId);
        
        console.log(cryptoUtils.hasPrivateKey(userId));
        
        if (cryptoUtils.hasPrivateKey(userId)) {
            getMessages();
        }
    }, [conversationId, cryptoUtils.hasPrivateKey(userId)]);

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
        conversationIdRef.current = conversationId;

        getConversations();
    }, [conversationId]);

    return { chatState, setChatState, sendMessage };
};