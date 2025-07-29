import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as cryptoUtils from '../utils/cryptoUtils';
import { getGroupKey } from '../services/encryptionService';
import { MessageStatus } from '../enums/messageStatus.enum';
import { CONVERSATIONS_URL } from '../config/config';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useAuth } from './useAuth';
import {
    addMessage,
    storeMessage,
    updateMessageStatus,
    updateGroupMessageStatus,
    setCurrentMessage,
    clearMessages,
    addTypingUser,
    removeTypingUser,
    loadMessages,
} from '../store/slices/chatSlice';
import {
    updateConversationLastMessage,
    incrementUnreadCount,
    loadConversations,
} from '../store/slices/conversationSlice';
import { addNotification } from '../store/slices/uiSlice';
import { LastSeenStatus, Message } from '../types/messages.types';
import { useAuthUser } from './useAuthUser';

interface UseChatMessagesProps {
    userId?: number;
    socket: Socket;
    axiosPrivate: AxiosInstance;
    userKeys?: any;
}

export const useChatMessages = ({
    socket,
    axiosPrivate,
}: UseChatMessagesProps) => {
    const dispatch = useAppDispatch();
    const user = useAuthUser();
    const { userKeys } = useAuth();

    const messageSoundRef = useRef(
        new Audio('/assets/sound/notification-sound.mp3'),
    );

    const { currentMessage, messages } = useAppSelector((state) => state.chat);
    const {
        conversations,
        selectedConversationId,
        currentConversation,
        participants,
        currentReceiver,
    } = useAppSelector((state) => state.conversations);

    const chatState = useMemo(
        () => ({
            conversations,
            messages,
            currentMessage,
            selectedConversationId,
            currentConversation,
        }),
        [
            conversations,
            messages,
            currentMessage,
            selectedConversationId,
            currentConversation,
        ],
    );

    const getConversations = useCallback(async () => {
        try {
            dispatch(loadConversations());
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    }, [dispatch]);

    const lastSeenStatus: LastSeenStatus[] | LastSeenStatus | null =
        useMemo(() => {
            if (!messages || messages.length === 0) return null;

            if (currentConversation?.isGroup) {
                return participants
                    .map((participant) => {
                        if (participant.id === user.id) {
                            return null;
                        }

                        for (let i = messages.length - 1; i >= 0; i--) {
                            const user = messages[i]?.statuses?.find(
                                (status: {
                                    userId: number;
                                    status: MessageStatus;
                                }) =>
                                    status.userId === participant.id &&
                                    status.status === MessageStatus.SEEN,
                            );

                            if (user) {
                                return {
                                    userId: participant.id,
                                    messageId: messages[i]?.id,
                                    avatar: participant.avatar,
                                };
                            }
                        }
                        return null;
                    })
                    .filter((x): x is LastSeenStatus => x !== null);
            }

            const lastMessage = messages.findLast(
                (message) => message.status === MessageStatus.SEEN,
            );

            if (lastMessage && lastMessage.senderId && lastMessage.id) {
                return {
                    userId: lastMessage.senderId,
                    messageId: lastMessage.id,
                    avatar: currentReceiver.avatar || '',
                };
            }
            return null;
        }, [participants, messages]);

    const sendMessage = useCallback(
        async (message: string) => {
            if (!message?.trim() && !currentMessage?.trim()) {
                return;
            }

            if (!currentConversation || !user) {
                return;
            }

            try {
                let messageData: Message;
                const messageId = uuidv4();

                let content = currentMessage;
                if (message) {
                    content = message;
                }

                if (currentConversation.isGroup) {
                    const groupkey = await getGroupKey({
                        conversationId: selectedConversationId,
                        userKeys: userKeys,
                        axiosPrivate,
                        userId: user.id,
                    });

                    if (!groupkey) {
                        throw new Error('Group key not available');
                    }

                    const { encryptedContent, iv } =
                        await cryptoUtils.encryptGroupData(groupkey, content);

                    messageData = {
                        id: messageId,
                        senderId: user.id,
                        conversationId: selectedConversationId!,
                        content: content,
                        type: 'text' as const,
                        status: MessageStatus.SENDING,
                        createdAt: new Date().toISOString(),
                    };

                    const encryptedMessage = {
                        ...messageData,
                        content: encryptedContent,
                        iv: iv,
                    };

                    socket.emit('send-group-message', encryptedMessage);
                } else {
                    if (!userKeys?.publicKey) {
                        throw new Error('Public key not available');
                    }

                    const { encryptedContent, iv, ephemeralPublicKey } =
                        await cryptoUtils.encryptPrivateData(
                            userKeys.publicKey,
                            content,
                        );

                    messageData = {
                        id: messageId,
                        senderId: user.id,
                        conversationId: selectedConversationId!,
                        content: content,
                        type: 'text' as const,
                        status: MessageStatus.SENDING,
                        createdAt: new Date().toISOString(),
                    };

                    const encryptedMessage = {
                        ...messageData,
                        content: encryptedContent,
                        iv: iv,
                        ephemeralPublicKey: ephemeralPublicKey,
                        receiverId: currentConversation.receiver?.id,
                    };

                    socket.emit('send-private-message', encryptedMessage);
                }

                dispatch(addMessage(messageData));

                dispatch(
                    updateConversationLastMessage({
                        conversationId: selectedConversationId!,
                        lastMessage: {
                            content: currentMessage,
                            senderId: user.id,
                            createdAt: messageData.createdAt,
                            type: 'text',
                        },
                    }),
                );

                dispatch(setCurrentMessage(''));
            } catch (error) {
                console.error('Failed to send message:', error);
                dispatch(
                    addNotification({
                        type: 'error',
                        title: 'Message Failed',
                        message: 'Failed to send message. Please try again.',
                    }),
                );
            }
        },
        [
            currentMessage,
            currentConversation,
            user,
            userKeys,
            selectedConversationId,
            socket,
            axiosPrivate,
            dispatch,
        ],
    );

    const sendQuickReaction = async () => {
        try {
            let message = ':thumbsup:';

            await sendMessage(message);

            console.log('Quick reaction sent:', message);
        } catch (error) {
            console.error('Failed to send quick reaction:', error);
        }
    };

    const sendImage = useCallback(
        async (file: File) => {
            if (!currentConversation || !user) {
                return;
            }

            try {
                const messageId = uuidv4();
                const fileData = await file.arrayBuffer();
                const objectUrl = URL.createObjectURL(file);

                let messageData;

                if (currentConversation.isGroup) {
                    const groupkey = await getGroupKey({
                        conversationId: selectedConversationId!,
                        userKeys: userKeys!,
                        axiosPrivate,
                        userId: user.id,
                    });

                    if (!groupkey) {
                        throw new Error('Group key not available');
                    }

                    const { encryptedContent, iv } =
                        await cryptoUtils.encryptGroupData(groupkey, fileData);

                    messageData = {
                        id: messageId,
                        senderId: user.id,
                        conversationId: selectedConversationId!,
                        content: objectUrl,
                        type: 'image' as const,
                        fileName: file.name,
                        fileSize: file.size,
                        mimeType: file.type,
                        status: MessageStatus.SENDING,
                        createdAt: new Date().toISOString(),
                    };

                    const encryptedMessage = {
                        ...messageData,
                        content: encryptedContent,
                        iv: iv,
                    };

                    socket.emit('send-group-image', encryptedMessage);
                } else {
                    if (!userKeys?.publicKey) {
                        throw new Error('Public key not available');
                    }

                    const { encryptedContent, iv, ephemeralPublicKey } =
                        await cryptoUtils.encryptPrivateData(
                            userKeys.publicKey,
                            fileData,
                        );

                    messageData = {
                        id: messageId,
                        senderId: user.id,
                        conversationId: selectedConversationId!,
                        content: objectUrl,
                        type: 'image' as const,
                        fileName: file.name,
                        fileSize: file.size,
                        mimeType: file.type,
                        status: MessageStatus.SENDING,
                        createdAt: new Date().toISOString(),
                    };

                    const encryptedMessage = {
                        ...messageData,
                        content: encryptedContent,
                        iv: iv,
                        ephemeralPublicKey: ephemeralPublicKey,
                    };

                    socket.emit('send-private-image', encryptedMessage);
                }

                dispatch(addMessage(messageData));

                dispatch(
                    updateConversationLastMessage({
                        conversationId: selectedConversationId!,
                        lastMessage: {
                            content: `📷 Image`,
                            senderId: user.id,
                            createdAt: messageData.createdAt,
                            type: 'image',
                        },
                    }),
                );
            } catch (error) {
                console.error('Failed to send image:', error);
                dispatch(
                    addNotification({
                        type: 'error',
                        title: 'Image Failed',
                        message: 'Failed to send image. Please try again.',
                    }),
                );
            }
        },
        [
            currentConversation,
            user,
            userKeys,
            selectedConversationId,
            socket,
            axiosPrivate,
            dispatch,
        ],
    );

    useEffect(() => {
        if (!socket || !userKeys?.privateKey) return;

        socket.on(
            'new-private-message',
            async (data: Message, ackCallback?: (ack: boolean) => void) => {
                try {
                    messageSoundRef.current
                        .play()
                        .catch((error) =>
                            console.error('Audio play error:', error),
                        );

                    const decryptedContent =
                        await cryptoUtils.decryptPrivateMessage(
                            userKeys.privateKey!,
                            {
                                content: data.content,
                                iv: data.iv,
                                ephemeralPublicKey: data.ephemeralPublicKey,
                            },
                        );

                    if (!decryptedContent) {
                        throw new Error('Decryption failed');
                    }

                    const message = {
                        id: data.id,
                        senderId: data.senderId,
                        conversationId: data.conversationId,
                        content: decryptedContent,
                        type: 'text' as const,
                        status: data.status,
                        createdAt: data.createdAt,
                    };

                    dispatch(storeMessage(message));

                    if (data.conversationId !== selectedConversationId) {
                        dispatch(incrementUnreadCount(data.conversationId));
                    }

                    dispatch(
                        updateConversationLastMessage({
                            conversationId: data.conversationId,
                            lastMessage: {
                                content: decryptedContent,
                                senderId: data.senderId,
                                createdAt: data.createdAt,
                                type: 'text',
                            },
                        }),
                    );

                    socket.emit('private-message-seen', {
                        senderId: data.senderId,
                        messageId: data.id,
                        conversationId: data.conversationId,
                    });
                } catch (error) {
                    console.error('Failed to decrypt message:', error);
                } finally {
                    if (ackCallback) {
                        ackCallback(true);
                    }
                }
            },
        );

        socket.on(
            'new-group-message',
            async (data: any, ackCallback?: (ack: boolean) => void) => {
                try {
                    messageSoundRef.current
                        .play()
                        .catch((error) =>
                            console.error('Audio play error:', error),
                        );

                    const groupkey = await getGroupKey({
                        conversationId: data.conversationId,
                        userKeys: userKeys,
                        axiosPrivate,
                        userId: user.id,
                    });

                    const decryptedContent = await cryptoUtils.decryptGroupData(
                        groupkey!,
                        {
                            content: data.content,
                            iv: data.iv,
                        },
                    );

                    const decodedContent = new TextDecoder().decode(
                        decryptedContent,
                    );

                    const message = {
                        id: data.id,
                        senderId: data.senderId,
                        conversationId: data.conversationId,
                        content: decodedContent,
                        type: 'text' as const,
                        status: data.status,
                        createdAt: data.createdAt,
                    };

                    dispatch(storeMessage(message));

                    if (data.conversationId !== selectedConversationId) {
                        dispatch(incrementUnreadCount(data.conversationId));
                    }

                    dispatch(
                        updateConversationLastMessage({
                            conversationId: data.conversationId,
                            lastMessage: {
                                content: decodedContent,
                                senderId: data.senderId,
                                createdAt: data.createdAt,
                                type: 'text',
                            },
                        }),
                    );

                    socket.emit('group-message-seen', {
                        senderId: user.id,
                        messageId: data.id,
                        conversationId: data.conversationId,
                    });
                } catch (error) {
                    console.error('Failed to decrypt group message:', error);
                } finally {
                    if (ackCallback) {
                        ackCallback(true);
                    }
                }
            },
        );

        socket.on(
            'private-message-status-update',
            (data: { messageId: string; status: MessageStatus }) => {
                dispatch(updateMessageStatus(data));
            },
        );

        socket.on(
            'group-message-status-update',
            (data: {
                messageId: string;
                userId: number;
                status: MessageStatus;
            }) => {
                dispatch(updateGroupMessageStatus(data));
            },
        );

        socket.on(
            'user-typing',
            (data: { userId: string; conversationId: string }) => {
                if (data.conversationId === selectedConversationId) {
                    dispatch(addTypingUser(data.userId));
                }
            },
        );

        socket.on(
            'user-stopped-typing',
            (data: { userId: string; conversationId: string }) => {
                if (data.conversationId === selectedConversationId) {
                    dispatch(removeTypingUser(data.userId));
                }
            },
        );

        return () => {
            socket.off('new-private-message');
            socket.off('new-group-message');
            socket.off('private-message-status-update');
            socket.off('group-message-status-update');
            socket.off('user-typing');
            socket.off('user-stopped-typing');
        };
    }, [
        socket,
        userKeys,
        selectedConversationId,
        user,
        axiosPrivate,
        dispatch,
    ]);

    useEffect(() => {
        getConversations();
    }, [getConversations]);

    useEffect(() => {
        if (selectedConversationId) {
            dispatch(loadMessages(selectedConversationId));
        }
    }, [selectedConversationId, dispatch]);

    return {
        chatState,
        setChatState: () => {
            console.warn(
                'setChatState is deprecated, use Redux actions instead',
            );
        },
        sendImage,
        sendMessage,
        lastSeenStatus,
        sendQuickReaction,

        messages,
        currentMessage,
        setCurrentMessage: (message: string) =>
            dispatch(setCurrentMessage(message)),
        clearMessages: () => dispatch(clearMessages()),
    };
};
