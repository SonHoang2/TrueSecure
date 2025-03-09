import { useState, useEffect, useRef, useMemo } from 'react';
import * as cryptoUtils from '../utils/cryptoUtils';
import { CONVERSATIONS_URL, MESSAGE_STATUS } from '../config/config';

export const useChatMessages = ({ conversationId, userKeys, userId, socket, getPrivateKey, axiosPrivate }) => {
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

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/messages`)

            const { convParticipants, messages, title, isGroup, avatar } = res.data.data.conversation;

            const receiver = convParticipants.find(x => x.userId !== userId)?.user || null;

            const privateKey = await getPrivateKey();

            const decryptedMessages = await Promise.all(messages.map(async (message) => {
                if (message.senderId !== userId) {
                    try {
                        const content = await cryptoUtils.decryptPrivateMessage(privateKey, {
                            content: message.content,
                            iv: message.iv,
                            ephemeralPublicKey: message.ephemeralPublicKey
                        });

                        return { ...message, content };
                    } catch (error) {
                        console.error("Failed to decrypt message:", error);
                        return message;
                    }
                }
                return message;
            }));

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

    const sendPrivateMessage = async () => {
        try {
            if (!userKeys.publicKey) {
                console.error("Public key is not available!");
                return;
            }

            const { content, iv, ephemeralPublicKey } = await cryptoUtils.encryptPrivateMessage(userKeys.publicKey, chatState.message)

            const messageData = {
                senderId: userId,
                conversationId: conversationId,
                content: chatState.message,
                status: MESSAGE_STATUS.SENDING,
            };

            const encryptedMessage = {
                ...messageData,
                content: content,
                iv: iv,
                ephemeralPublicKey: ephemeralPublicKey,
                receiverId: chatState.receiver?.id,
            };

            socket.emit("send-private-message", encryptedMessage);

            return messageData;
        } catch (error) {
            console.error(error);
        }
    }

    const sendGroupMessage = async () => {
        try {
            const groupkey = await cryptoUtils.importGroupKey({ conversationId, userId });

            const { content, iv } = await cryptoUtils.encryptGroupMessage(groupkey, chatState.message);

            const messageData = {
                senderId: userId,
                conversationId: conversationId,
                content: chatState.message,
                status: MESSAGE_STATUS.SENDING,
            };

            const encryptedMessage = {
                ...messageData,
                content: content,
                iv: iv,
                receiverId: chatState.receiver?.id,
            };

            socket.emit("send-group-message", encryptedMessage);

            return messageData;
        } catch (error) {
            console.error(error);

        }
    }

    const sendMessage = async () => {
        try {
            if (!chatState.message.trim()) {
                return;
            }
            let messageData;

            if (chatState.conversation.isGroup) {
                messageData = await sendGroupMessage();
            } else {
                messageData = await sendPrivateMessage();
            }

            setChatState((prevState) => ({
                ...prevState,
                messages: [...prevState.messages, messageData],
                message: "",
            }));
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

    const lastSeenStatus = useMemo(() => {
        if (chatState.conversation.isGroup) {
            return chatState.convParticipants
                .map(participant => {
                    if (participant.userId === userId) {
                        return null;
                    }

                    for (let i = chatState.messages.length - 1; i >= 0; i--) {
                        const user = chatState.messages[i].statuses?.find(
                            status => status.userId === participant.userId && status.status === MESSAGE_STATUS.SEEN
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

        return chatState.messages.findLast(message => message.status === MESSAGE_STATUS.SEEN);
    }, [chatState.convParticipants, chatState.messages]);


    useEffect(() => {
        if (cryptoUtils.hasPrivateKey(userId)) {
            getMessages();
        }
    }, [conversationId, cryptoUtils.hasPrivateKey(userId)]);

    useEffect(() => {
        socket.on("new-private-message", async (data) => {
            try {
                messageSoundRef.current.play().catch((error) =>
                    console.error("Audio play error:", error)
                );

                if (data.conversationId === conversationIdRef.current) {
                    const decryptedMessage = await cryptoUtils.decryptPrivateMessage(userKeys.privateKey,
                        {
                            content: data.content,
                            iv: data.iv,
                            ephemeralPublicKey: data.ephemeralPublicKey
                        }
                    );

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
                    if (msg.status === MESSAGE_STATUS.SENDING) return true;
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
                    (msg) => msg.status === MESSAGE_STATUS.SENDING || msg.id === messageId
                );

                if (messageIndex === -1) return prevState;
                const message = updatedMessages[messageIndex];

                if (status === MESSAGE_STATUS.SEEN) {
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
    }, [chatState.messages.length]);

    useEffect(() => {
        conversationIdRef.current = conversationId;

        getConversations();
    }, [conversationId]);

    return { chatState, setChatState, sendMessage, lastSeenStatus };
};