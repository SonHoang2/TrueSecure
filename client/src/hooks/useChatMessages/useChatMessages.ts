import { useState, useEffect, useRef, useMemo } from 'react';
import * as cryptoUtils from '../../utils/cryptoUtils';
import { CONVERSATIONS_URL } from '../../config/config';
import {
    getMessagesFromIndexedDB,
    storeMessagesInIndexedDB,
} from '../../utils/indexedDB';
import { v4 as uuidv4 } from 'uuid';
import { getGroupKey } from '../../services/encryptionService';
import { MessageStatus } from '../../enums/messageStatus.enum';
import {
    GroupMessageProps,
    GroupMessageStatusUpdateProps,
    PrivateMessageProps,
    PrivateMessageStatusUpdateProps,
    UseChatMessagesProps,
} from './useChatMessages.types';
import { ChatState } from '../../types/chats.types';
import { ConversationParticipant } from '../../types/conversations.types';

export const useChatMessages = ({
    conversationId,
    userId,
    socket,
    axiosPrivate,
    userKeys,
}: UseChatMessagesProps) => {
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

            const {
                convParticipants,
                title,
                isGroup,
                avatar,
            }: {
                convParticipants: ConversationParticipant[];
                title: string;
                isGroup: boolean | null;
                avatar: string;
            } = res.data.data.conversation;

            const receiver =
                convParticipants.find((user) => user.userId !== userId)?.user ||
                null;

            const messages = await getMessagesFromIndexedDB(conversationId);

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

            const { content, iv, ephemeralPublicKey } =
                await cryptoUtils.encryptPrivateMessage(
                    userKeys.publicKey,
                    chatState.message,
                );

            const messageData = {
                id: uuidv4(),
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
            const groupkey = await getGroupKey({
                conversationId,
                userKeys,
                axiosPrivate,
                userId,
            });

            if (!groupkey) {
                console.error('Group key is not available!');
                return;
            }

            const { content, iv } = await cryptoUtils.encryptGroupMessage(
                groupkey,
                chatState.message,
            );

            const messageData = {
                id: uuidv4(),
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
                            (status: {
                                userId: number;
                                status: MessageStatus;
                            }) =>
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

        const lastMessage = chatState.messages.findLast(
            (message) => message.status === MessageStatus.SEEN,
        );

        return {
            userId: lastMessage?.senderId,
            messageId: lastMessage?.id || '',
            avatar: chatState.receiver?.avatar || '',
        };
    }, [chatState.convParticipants, chatState.messages]);

    useEffect(() => {
        getMessages();
    }, [conversationId]);

    useEffect(() => {
        if (!userKeys?.privateKey || !userKeys?.publicKey) return;

        socket.on(
            'new-private-message',
            async (
                data: PrivateMessageProps,
                ackCallback?: (ack: boolean) => void,
            ) => {
                try {
                    if (!userKeys.privateKey) {
                        throw new Error('Private key is not available');
                    }

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
                        id: data.id,
                        senderId: data.senderId,
                        conversationId: data.conversationId,
                        content: decryptedMessage,
                        createdAt: data.createdAt,
                        status: data.status,
                    });

                    // Only update UI if the message belongs to the current conversation
                    const isCurrentConversation =
                        data.conversationId === conversationIdRef.current;
                    if (isCurrentConversation) {
                        const message = {
                            ...data,
                            content: decryptedMessage,
                            iv: null,
                            ephemeralPublicKey: null,
                        };

                        setChatState((prev) => ({
                            ...prev,
                            messages: [...prev.messages, message],
                        }));

                        socket.emit('private-message-seen', {
                            senderId: data.senderId,
                            messageId: data.id,
                            conversationId: data.conversationId,
                        });
                    }

                    ackCallback?.(true);
                } catch (error) {
                    console.error(
                        'Failed to process new-private-message:',
                        error,
                    );

                    const isNetworkError =
                        error instanceof Error &&
                        (error.message.includes('network') ||
                            error.message.includes('timeout') ||
                            error.message.includes('connection'));

                    ackCallback?.(isNetworkError ? false : true);
                }
            },
        );

        socket.on(
            'private-message-status-update',
            async (data: PrivateMessageStatusUpdateProps) => {
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
                        id: updatedMessage.id,
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

        socket.on('new-group-message', async (data: GroupMessageProps) => {
            // messageSoundRef.current
            //     .play()
            //     .catch((error) => console.error('Audio play error:', error));
            const groupkey = await getGroupKey({
                conversationId,
                userKeys,
                axiosPrivate,
                userId,
            });

            const decryptedMessage = await cryptoUtils.decryptGroupMessage(
                groupkey,
                {
                    content: data.content,
                    iv: data.iv,
                },
            );

            if (!decryptedMessage) {
                throw new Error('Decryption failed');
            }

            await storeMessagesInIndexedDB({
                id: data.id,
                senderId: data.senderId,
                conversationId: data.conversationId,
                content: decryptedMessage,
                createdAt: data.createdAt,
                status: data.status,
            });

            const isCurrentConversation =
                data.conversationId === conversationIdRef.current;
            if (isCurrentConversation) {
                const message = {
                    ...data,
                    content: decryptedMessage,
                    iv: null,
                    ephemeralPublicKey: null,
                };

                setChatState((prev) => ({
                    ...prev,
                    messages: [...prev.messages, message],
                }));

                socket.emit('group-message-seen', {
                    senderId: userId,
                    messageId: data.id,
                    conversationId: data.conversationId,
                });
            }
        });

        socket.on(
            'group-message-status-update',
            ({ messageId, userId, status }: GroupMessageStatusUpdateProps) => {
                setChatState((prevState) => {
                    console.log(
                        'Received group message status update:',
                        messageId,
                        userId,
                        status,
                    );

                    const messageIndex = prevState.messages.findLastIndex(
                        (msg) =>
                            msg.status === MessageStatus.SENDING ||
                            msg.id === messageId,
                    );

                    if (messageIndex === -1) return prevState;

                    const updatedMessages = [...prevState.messages];
                    const originalMessage = updatedMessages[messageIndex];

                    // Create a proper copy to avoid mutation
                    const message = { ...originalMessage };

                    if (status === MessageStatus.SEEN) {
                        // Properly copy the statuses array
                        message.statuses = originalMessage.statuses
                            ? [...originalMessage.statuses]
                            : [];
                        message.status = null;

                        const statusIndex = message.statuses.findIndex(
                            (s) => s.userId === userId,
                        );

                        if (statusIndex === -1) {
                            message.statuses.push({ userId, status });
                        } else {
                            message.statuses[statusIndex] = {
                                ...message.statuses[statusIndex],
                                status,
                            };
                        }
                    } else {
                        message.status = status;
                        message.id = messageId;
                    }

                    updatedMessages[messageIndex] = message;

                    console.log('Updated message:', message);

                    storeMessagesInIndexedDB({
                        id: message.id,
                        senderId: message.senderId,
                        conversationId: message.conversationId,
                        content: message.content,
                        createdAt: message.createdAt,
                        status: message.status,
                        statuses: message.statuses,
                    });

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
    }, [userKeys?.privateKey, userKeys?.publicKey, conversationId, userId]);

    useEffect(() => {
        conversationIdRef.current = conversationId;

        getConversations();
    }, [conversationId]);

    return { chatState, setChatState, sendMessage, lastSeenStatus };
};
