import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as cryptoUtils from '../crypto/cryptoUtils';
import { getGroupKey } from '../services/encryptionService';
import { MessageStatus } from '../enums/messageStatus.enum';
import { CONVERSATIONS_URL } from '../config/config';
import {
    useAppDispatch,
    useAppSelector,
    useConversations,
} from '../store/hooks';
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
    persistStatusUpdate,
    persistGroupStatusUpdate,
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
    userKey?: any;
}

export const useChatMessages = ({
    socket,
    axiosPrivate,
}: UseChatMessagesProps) => {
    const dispatch = useAppDispatch();
    const user = useAuthUser();
    const { userKey, deviceUuid } = useAuth();
    const { recipientDevices } = useConversations();

    const messageSoundRef = useRef(
        new Audio('/assets/sound/notification-sound.mp3'),
    );

    const { currentMessage, messages, typingUsers } = useAppSelector(
        (state) => state.chat,
    );
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
        async (message?: string) => {
            if (!message && !currentMessage?.trim()) {
                return;
            }

            if (!currentConversation || !user || !selectedConversationId) {
                return;
            }

            try {
                let messageData: Message | null = null;
                const messageId = uuidv4();

                let content = currentMessage;
                if (message) {
                    content = message;
                }

                if (currentConversation.isGroup) {
                    if (!userKey) {
                        throw new Error(
                            'User keys are required for group chat',
                        );
                    }

                    if (!deviceUuid) {
                        throw new Error('Device UUID is required');
                    }

                    if (!selectedConversationId) {
                        throw new Error('Selected conversation ID is required');
                    }

                    const groupkey = await getGroupKey({
                        conversationId: selectedConversationId,
                        userKey: userKey,
                        axiosPrivate,
                        userId: user.id,
                        deviceUuid: deviceUuid,
                    });

                    if (!groupkey) {
                        throw new Error('Group key not available');
                    }

                    const { encryptedContent, iv } =
                        await cryptoUtils.encryptGroupData(groupkey, content);

                    messageData = {
                        id: messageId,
                        senderId: user.id,
                        conversationId: selectedConversationId,
                        content: content,
                        type: 'text' as const,
                        status: MessageStatus.SENDING,
                        createdAt: new Date().toISOString(),
                    };

                    const encryptedMessage = {
                        ...messageData,
                        content: encryptedContent,
                        iv: iv,
                        deviceUuid: deviceUuid,
                    };

                    socket.emit('send-group-message', encryptedMessage);
                } else {
                    if (recipientDevices.length === 0) {
                        throw new Error('Public key not available');
                    }

                    messageData = {
                        id: messageId,
                        senderId: user.id,
                        conversationId: selectedConversationId,
                        content: content,
                        type: 'text' as const,
                        status: MessageStatus.SENDING,
                        createdAt: new Date().toISOString(),
                    };

                    for (const device of recipientDevices) {
                        const publicKey = await cryptoUtils.importPublicKey(
                            device.publicKey,
                        );

                        const { encryptedContent, iv, ephemeralPublicKey } =
                            await cryptoUtils.encryptPrivateData(
                                publicKey,
                                content,
                            );

                        const encryptedMessage = {
                            ...messageData,
                            content: encryptedContent,
                            iv: iv,
                            ephemeralPublicKey: ephemeralPublicKey,
                            receiverId: currentConversation.receiver?.id,
                            deviceUuid: device.deviceUuid,
                        };

                        socket.emit('send-private-message', encryptedMessage);
                    }
                }

                dispatch(addMessage(messageData));

                dispatch(
                    updateConversationLastMessage({
                        conversationId: selectedConversationId,
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
                if (
                    error instanceof DOMException ||
                    error.name === 'DataError'
                ) {
                    console.error('Likely encryption or key error:', {
                        currentConversation,
                        user,
                        userKey,
                        recipientDevices,
                        selectedConversationId,
                    });
                }
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
            userKey,
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

    // const sendImage = useCallback(
    //     async (file: File) => {
    //         if (!currentConversation || !user) {
    //             return;
    //         }

    //         try {
    //             const messageId = uuidv4();
    //             const fileData = await file.arrayBuffer();
    //             const objectUrl = URL.createObjectURL(file);

    //             let messageData;

    //             if (currentConversation.isGroup) {
    //                 const groupkey = await getGroupKey({
    //                     conversationId: selectedConversationId,
    //                     userKey: userKey!,
    //                     axiosPrivate,
    //                     userId: user.id,
    //                 });

    //                 if (!groupkey) {
    //                     throw new Error('Group key not available');
    //                 }

    //                 const { encryptedContent, iv } =
    //                     await cryptoUtils.encryptGroupData(groupkey, fileData);

    //                 messageData = {
    //                     id: messageId,
    //                     senderId: user.id,
    //                     conversationId: selectedConversationId,
    //                     content: objectUrl,
    //                     type: 'image' as const,
    //                     fileName: file.name,
    //                     fileSize: file.size,
    //                     mimeType: file.type,
    //                     status: MessageStatus.SENDING,
    //                     createdAt: new Date().toISOString(),
    //                 };

    //                 const encryptedMessage = {
    //                     ...messageData,
    //                     content: encryptedContent,
    //                     iv: iv,
    //                 };

    //                 socket.emit('send-group-image', encryptedMessage);
    //             } else {
    //                 if (!userKey?.publicKey) {
    //                     throw new Error('Public key not available');
    //                 }

    //                 const { encryptedContent, iv, ephemeralPublicKey } =
    //                     await cryptoUtils.encryptPrivateData(
    //                         userKey.publicKey,
    //                         fileData,
    //                     );

    //                 messageData = {
    //                     id: messageId,
    //                     senderId: user.id,
    //                     conversationId: selectedConversationId,
    //                     content: objectUrl,
    //                     type: 'image' as const,
    //                     fileName: file.name,
    //                     fileSize: file.size,
    //                     mimeType: file.type,
    //                     status: MessageStatus.SENDING,
    //                     createdAt: new Date().toISOString(),
    //                 };

    //                 const encryptedMessage = {
    //                     ...messageData,
    //                     content: encryptedContent,
    //                     iv: iv,
    //                     ephemeralPublicKey: ephemeralPublicKey,
    //                 };

    //                 socket.emit('send-private-image', encryptedMessage);
    //             }

    //             dispatch(addMessage(messageData));

    //             dispatch(
    //                 updateConversationLastMessage({
    //                     conversationId: selectedConversationId,
    //                     lastMessage: {
    //                         content: `📷 Image`,
    //                         senderId: user.id,
    //                         createdAt: messageData.createdAt,
    //                         type: 'image',
    //                     },
    //                 }),
    //             );
    //         } catch (error) {
    //             console.error('Failed to send image:', error);
    //             dispatch(
    //                 addNotification({
    //                     type: 'error',
    //                     title: 'Image Failed',
    //                     message: 'Failed to send image. Please try again.',
    //                 }),
    //             );
    //         }
    //     },
    //     [
    //         currentConversation,
    //         user,
    //         userKey,
    //         selectedConversationId,
    //         socket,
    //         axiosPrivate,
    //         dispatch,
    //     ],
    // );

    const sendImage = () => {
        return;
    };

    useEffect(() => {
        if (!socket || !userKey?.privateKey) {
            console.warn('Socket or userKey is not available');
            return;
        }

        socket.on(
            'new-private-message',
            async (data: Message, ackCallback?: (ack: boolean) => void) => {
                try {
                    messageSoundRef.current
                        .play()
                        .catch((error) =>
                            console.error('Audio play error:', error),
                        );

                    console.log('new-private-message:', data);

                    const decryptedContent =
                        await cryptoUtils.decryptPrivateMessage(
                            userKey.privateKey!,
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
                        userKey: userKey,
                        axiosPrivate,
                        userId: user.id,
                        deviceUuid: deviceUuid,
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
                console.log('message update');

                dispatch(persistStatusUpdate(data));
            },
        );

        socket.on(
            'group-message-status-update',
            (data: {
                messageId: string;
                userId: number;
                status: MessageStatus;
            }) => {
                console.log('group message update', data);

                dispatch(persistGroupStatusUpdate(data));
            },
        );

        socket.on(
            'user-typing',
            (data: { userId: number; conversationId: number }) => {
                if (
                    data.conversationId === selectedConversationId &&
                    data.userId !== user.id
                ) {
                    dispatch(addTypingUser(data.userId));
                }
            },
        );

        socket.on(
            'user-stopped-typing',
            (data: { userId: number; conversationId: number }) => {
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
    }, [socket, userKey, selectedConversationId, user, axiosPrivate, dispatch]);

    useEffect(() => {
        if (!socket || !currentConversation || !user) return;

        if (currentMessage.length > 0) {
            socket.emit('user-typing', {
                userId: user.id,
                conversationId: currentConversation.id,
            });
        } else {
            socket.emit('user-stopped-typing', {
                userId: user.id,
                conversationId: currentConversation.id,
            });
        }
    }, [currentMessage, socket, currentConversation, user]);

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
        typingUsers,
        currentMessage,
        setCurrentMessage: (message: string) =>
            dispatch(setCurrentMessage(message)),
        clearMessages: () => dispatch(clearMessages()),
    };
};
