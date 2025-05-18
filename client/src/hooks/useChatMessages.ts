import { useState, useEffect, useRef, useMemo } from 'react';
import * as cryptoUtils from '../utils/cryptoUtils';
import { CONVERSATIONS_URL } from '../config/config';
import {
    getMessagesFromIndexedDB,
    storeMessagesInIndexedDB,
} from '../utils/indexedDB';
import { v4 as uuidv4 } from 'uuid';
import { getGroupKey } from '../services/encryptionService';
import { Socket } from 'socket.io-client';
import { AxiosInstance } from 'axios';
import { MessageStatus } from '../enums/messageStatus.enum';

type UseChatMessagesProps = {
    conversationId: string;
    userId: string;
    socket: Socket;
    axiosPrivate: AxiosInstance;
    userKeys: {
        publicKey?: string;
        privateKey?: string;
    };
};

export const useChatMessages = ({
    conversationId,
    userId,
    socket,
    axiosPrivate,
    userKeys,
}: UseChatMessagesProps) => {
    type Conversation = {
        title: string;
        isGroup: boolean | null;
        avatar: string;
    };

    type ChatState = {
        message: string;
        messages: any[];
        receiver: any | null;
        convParticipants: any[];
        conversations: any[];
        conversation: Conversation;
    };

    const [chatState, setChatState] = useState<ChatState>({
        message: '',
        messages: [],
        receiver: null,
        convParticipants: [],
        conversations: [],
        conversation: {
            title: '',
            isGroup: null,
            avatar: '',
        },
    });

    const messageSoundRef = useRef(new Audio('/sound/notification-sound.m4a'));
    const conversationIdRef = useRef(conversationId);

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(
                CONVERSATIONS_URL + `/${conversationId}`,
            );

            const { convParticipants, title, isGroup, avatar } =
                res.data.data.conversation;

            const receiver =
                convParticipants.find((x) => x.userId !== userId)?.user || null;

            const messages = await getMessagesFromIndexedDB(conversationId);
            console.log({ messages });

            setChatState((prevState) => ({
                ...prevState,
                messages: messages,
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
                console.error('Public key is not available!');
                return;
            }

            console.log({ userKeys });

            const { content, iv, ephemeralPublicKey } =
                await cryptoUtils.encryptPrivateMessage(
                    userKeys.publicKey,
                    chatState.message,
                );

            const messageData = {
                messageId: uuidv4(),
                senderId: userId,
                conversationId: conversationId,
                content: chatState.message,
                status: MessageStatus.SENDING,
                createdAt: new Date().toISOString(),
            };

            const encryptedMessage = {
                ...messageData,
                content: content,
                iv: iv,
                ephemeralPublicKey: ephemeralPublicKey,
                receiverId: chatState.receiver?.id,
            };

            socket.emit('send-private-message', encryptedMessage);
            return messageData;
        } catch (error) {
            console.error(error);
        }
    };

    const sendGroupMessage = async () => {
        try {
            const groupkey = await getGroupKey(conversationId, axiosPrivate);

            if (!groupkey) {
                console.error('Group key is not available!');
                return;
            }

            const { content, iv } = await cryptoUtils.encryptGroupMessage(
                groupkey,
                chatState.message,
            );

            const messageData = {
                messageId: uuidv4(),
                senderId: userId,
                conversationId: conversationId,
                content: chatState.message,
                status: MessageStatus.SENDING,
                createdAt: new Date().toISOString(),
            };

            const encryptedMessage = {
                ...messageData,
                content: content,
                iv: iv,
                receiverId: chatState.receiver?.id,
            };

            console.log({ encryptedMessage });

            socket.emit('send-group-message', encryptedMessage);

            return messageData;
        } catch (error) {
            console.error(error);
        }
    };

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

            if (!messageData) {
                console.error('Failed to send message!');
                return;
            }

            setChatState((prevState) => ({
                ...prevState,
                messages: [...prevState.messages, messageData],
                message: '',
            }));
        } catch (error) {
            console.error(error);
        }
    };

    const getConversations = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + '/me');
            const { conversations } = res.data.data;

            setChatState((prevState) => ({
                ...prevState,
                conversations: conversations,
            }));
        } catch (error) {
            console.error(error);
        }
    };

    const lastSeenStatus = useMemo(() => {
        if (!chatState.messages) return null;

        if (chatState.conversation.isGroup) {
            return chatState.convParticipants
                .map((participant) => {
                    if (participant.userId === userId) {
                        return null;
                    }

                    for (let i = chatState.messages.length - 1; i >= 0; i--) {
                        const user = chatState.messages[i]?.statuses?.find(
                            (status) =>
                                status.userId === participant.userId &&
                                status.status === MessageStatus.SEEN,
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

        return chatState.messages.findLast(
            (message) => message.status === MessageStatus.SEEN,
        );
    }, [chatState.convParticipants, chatState.messages]);

    useEffect(() => {
        getMessages();
    }, [conversationId]);

    useEffect(() => {
        if (!userKeys?.privateKey) return;

        socket.on(
            'new-private-message',
            async (
                data: {
                    messageId: string;
                    senderId: string;
                    conversationId: string;
                    content: string;
                    iv: string;
                    ephemeralPublicKey: string;
                    createdAt: string;
                    status: MessageStatus;
                },
                ackCallback: (ack: boolean) => void,
            ) => {
                try {
                    // messageSoundRef.current.play().catch((error) =>
                    //     console.error("Audio play error:", error)
                    // );
                    if (!userKeys.privateKey) {
                        throw new Error('Private key is not available!');
                    }

                    if (data.conversationId === conversationIdRef.current) {
                        const decryptedMessage =
                            await cryptoUtils.decryptPrivateMessage(
                                userKeys.privateKey,
                                {
                                    content: data.content,
                                    iv: data.iv,
                                    ephemeralPublicKey: data.ephemeralPublicKey,
                                },
                            );

                        const message = {
                            ...data,
                            content: decryptedMessage,
                            iv: null,
                            ephemeralPublicKey: null,
                        };

                        setChatState((prevState) => ({
                            ...prevState,
                            messages: [...prevState.messages, message],
                        }));

                        await storeMessagesInIndexedDB({
                            messageId: data.messageId,
                            senderId: data.senderId,
                            conversationId: data.conversationId,
                            content: decryptedMessage,
                            createdAt: data.createdAt,
                            status: data.status,
                        });

                        socket.emit('private-message-seen', {
                            senderId: data.senderId,
                            messageId: data.messageId,
                            conversationId: data.conversationId,
                        });
                    } else {
                        const decryptedMessage =
                            await cryptoUtils.decryptPrivateMessage(
                                userKeys.privateKey,
                                {
                                    content: data.content,
                                    iv: data.iv,
                                    ephemeralPublicKey: data.ephemeralPublicKey,
                                },
                            );

                        if (!decryptedMessage) {
                            throw new Error('Decryption failed');
                        }

                        await storeMessagesInIndexedDB({
                            messageId: data.messageId,
                            senderId: data.senderId,
                            conversationId: data.conversationId,
                            content: decryptedMessage,
                            createdAt: data.createdAt,
                            status: data.status,
                        });

                        // socket.emit("private-message-delivered", {
                        //     senderId: data.senderId,
                        //     messageId: data.messageId,
                        //     conversationId: data.conversationId,
                        // })
                    }

                    console.log('I acknowledge the message');
                    ackCallback(true);
                } catch (error) {
                    console.error(error);
                    console.error('I not acknowledge the message');
                    ackCallback(false);
                }
            },
        );

        socket.on(
            'private-message-status-update',
            async (data: { messageId: string; status: MessageStatus }) => {
                setChatState((prevState) => {
                    const messageIndex = prevState.messages.findLastIndex(
                        (msg) => {
                            if (msg.status === MessageStatus.SENDING)
                                return true;
                            return msg.id === data.messageId;
                        },
                    );

                    if (messageIndex === -1) return prevState;

                    const updatedMessages = [...prevState.messages];
                    updatedMessages[messageIndex] = {
                        ...updatedMessages[messageIndex],
                        status: data.status,
                        id: data.messageId,
                    };

                    const updatedMessage = updatedMessages[messageIndex];

                    storeMessagesInIndexedDB({
                        messageId: updatedMessage.id,
                        senderId: updatedMessage.senderId,
                        conversationId: updatedMessage.conversationId,
                        content: updatedMessage.content,
                        createdAt: updatedMessage.createdAt,
                        status: updatedMessage.status,
                    });

                    return {
                        ...prevState,
                        messages: updatedMessages,
                    };
                });
            },
        );

        socket.on('new-group-message', (data) => {
            messageSoundRef.current
                .play()
                .catch((error) => console.error('Audio play error:', error));

            if (data.conversationId === conversationIdRef.current) {
                setChatState((prevState) => ({
                    ...prevState,
                    encryptedMessages: [...prevState.encryptedMessages, data],
                }));

                socket.emit('group-message-seen', {
                    senderId: data.senderId,
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                });
            }
        });

        socket.on(
            'group-message-status-update',
            ({ messageId, userId, status }) => {
                setChatState((prevState) => {
                    const updatedMessages = [...prevState.messages];
                    const messageIndex = updatedMessages.findLastIndex(
                        (msg) =>
                            msg.status === MessageStatus.SENDING ||
                            msg.id === messageId,
                    );

                    if (messageIndex === -1) return prevState;
                    const message = updatedMessages[messageIndex];

                    if (status === MessageStatus.SEEN) {
                        message.statuses = message.statuses || [];
                        message.status = null;

                        const statusIndex = message.statuses.findIndex(
                            (s) => s.userId === userId,
                        );
                        if (statusIndex === -1) {
                            message.statuses.push({ userId, status });
                        } else {
                            message.statuses[statusIndex].status = status;
                        }
                    } else {
                        updatedMessages[messageIndex] = {
                            ...message,
                            status,
                            id: messageId,
                        };
                    }

                    return { ...prevState, messages: updatedMessages };
                });
            },
        );

        return () => {
            socket.off('new-private-message');
            socket.off('private-message-status-update');
            socket.off('group-message-status-update');
            socket.off('new-group-message');
        };
    }, [chatState.messages?.length, userKeys?.privateKey]);

    useEffect(() => {
        conversationIdRef.current = conversationId;

        getConversations();
    }, [conversationId]);

    return { chatState, setChatState, sendMessage, lastSeenStatus };
};
