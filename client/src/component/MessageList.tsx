import { useEffect, useRef, useMemo } from 'react';
import { MessageStatus } from '../enums/messageStatus.enum';
import { Message } from '../types/messages.types';
import { Conversation } from '../types/conversations.types';
import { User } from '../types/users.types';
import { MdThumbUp } from 'react-icons/md';
import { LastSeenStatus } from '../types/messages.types';

interface MessageListProps {
    messages: Message[];
    userId: number;
    conversation: Conversation;
    lastSeenStatus: LastSeenStatus[] | LastSeenStatus | null;
    receiver: User;
    convParticipants: User[] | null;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    userId,
    conversation,
    lastSeenStatus,
    receiver,
    convParticipants,
}) => {
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (receiver) {
            scrollToBottom();
        }
    }, [messages.length]);

    const participantMap = useMemo(() => {
        const map = new Map();
        convParticipants?.forEach((participant) => {
            map.set(participant.id, participant);
        });
        return map;
    }, [convParticipants]);

    const renderMessageContent = (content: string, isSentByUser: boolean) => {
        if (content === ':thumbsup:') {
            return <MdThumbUp className="text-blue-500 text-2xl" size={40} />;
        }
        return (
            <p
                className={`rounded-3xl px-3 py-2 break-all text-s ${
                    isSentByUser
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white'
                        : 'bg-gray-100 text-black'
                }`}
            >
                {content}
            </p>
        );
    };

    const lastSeenMap = useMemo(() => {
        if (!Array.isArray(lastSeenStatus)) return null;

        const map = new Map();
        lastSeenStatus.forEach((status) => {
            if (!map.has(status.messageId)) {
                map.set(status.messageId, []);
            }
            map.get(status.messageId).push(status);
        });
        return map;
    }, [lastSeenStatus]);

    const processedMessages = useMemo(() => {
        return messages.map((msg, index) => {
            const { isGroup } = conversation;
            const isSentByUser = msg.senderId === userId;
            const isLastMessage = index === messages.length - 1;

            const otherUser = isGroup
                ? participantMap.get(msg.senderId)
                : receiver;

            const avatar = otherUser?.avatar;

            const statuses: LastSeenStatus[] =
                isGroup && lastSeenMap ? lastSeenMap.get(msg.id) || [] : [];

            return {
                msg,
                index,
                isSentByUser,
                isLastMessage,
                otherUser,
                avatar,
                statuses,
                isGroup,
            };
        });
    }, [messages, conversation, userId, participantMap, lastSeenMap, receiver]);

    return (
        <div className="overflow-y-auto flex flex-col pb-4 pt-2 flex-1">
            {processedMessages.map(
                ({
                    msg,
                    index,
                    isSentByUser,
                    isLastMessage,
                    otherUser,
                    avatar,
                    statuses,
                    isGroup,
                }) => (
                    <div key={msg.id || index} className="flex flex-col">
                        {!isSentByUser && isGroup && (
                            <div className="ps-14">
                                <p className="text-xs text-gray-500">
                                    {`${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim()}
                                </p>
                            </div>
                        )}
                        <div
                            className={`flex w-full px-2 py-1 ${isSentByUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className="flex max-w-md items-end">
                                {!isSentByUser && (
                                    <div className="flex-none pe-2 items-end">
                                        <img
                                            className="size-8 rounded-full"
                                            src={
                                                avatar || '/default-avatar.png'
                                            }
                                            alt="avatar"
                                        />
                                    </div>
                                )}
                                <div className="flex-grow flex flex-col">
                                    {renderMessageContent(
                                        msg.content,
                                        isSentByUser,
                                    )}
                                    <div className="flex justify-end">
                                        {isLastMessage &&
                                            isSentByUser &&
                                            msg?.status !==
                                                MessageStatus.SEEN && (
                                                <p className="text-xs pe-4 text-gray-600 first-letter:uppercase">
                                                    {msg?.status}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end w-full pe-3">
                            {isGroup
                                ? statuses.map((status: LastSeenStatus) => (
                                      <div
                                          key={`${status.userId}-${status.messageId}`}
                                          className="flex pe-1 items-end"
                                      >
                                          <img
                                              className="size-4 rounded-full"
                                              src={status.avatar}
                                              alt=""
                                          />
                                      </div>
                                  ))
                                : !Array.isArray(lastSeenStatus) &&
                                  lastSeenStatus?.messageId === msg.id && (
                                      <div className="flex pe-1 items-end">
                                          <img
                                              className="size-4 rounded-full"
                                              src={avatar}
                                              alt=""
                                          />
                                      </div>
                                  )}
                        </div>
                    </div>
                ),
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};
