import { useEffect, useRef } from 'react';
import { MessageStatus } from '../../enums/messageStatus.enum';
import { LastSeenStatus, MessageListProps } from './MessageList.types';

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

    return (
        <div className="flex-grow overflow-y-auto flex flex-col pb-4 pt-2">
            {messages.map((msg, index) => {
                const { isGroup } = conversation;

                const isSentByUser = msg.senderId === userId;
                const isLastMessage = index === messages.length - 1;

                const otherUser = isGroup
                    ? convParticipants.find((x) => x.userId === msg.senderId)
                          ?.user
                    : receiver;

                const avatar = otherUser?.avatar;

                const statuses =
                    isGroup && Array.isArray(lastSeenStatus)
                        ? lastSeenStatus.filter(
                              (item) => item.messageId === msg.id,
                          )
                        : [];

                console.log('Last Seen Status:', lastSeenStatus);

                return (
                    <div key={index} className="flex flex-col">
                        {!isSentByUser && isGroup && (
                            <div className="ps-14">
                                <p className="text-xs text-gray-500">
                                    {otherUser?.firstName +
                                        ' ' +
                                        otherUser?.lastName}
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
                                            src={`${avatar}`}
                                            alt="avatar"
                                        />
                                    </div>
                                )}
                                <div className="flex-grow flex flex-col">
                                    <p
                                        className={`rounded-3xl px-3 py-2 break-all text-s
                                                        ${isSentByUser ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white' : 'bg-gray-100 text-black'}`}
                                    >
                                        {msg.content}
                                    </p>
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
                                ? statuses.map((status) => (
                                      <div
                                          key={`${status.userId}-${status.messageId}`}
                                          className="flex pe-1 items-end"
                                      >
                                          <img
                                              className="size-4 rounded-full"
                                              src={`${status.avatar}`}
                                              alt=""
                                          />
                                      </div>
                                  ))
                                : !Array.isArray(lastSeenStatus) &&
                                  lastSeenStatus?.messageId === msg.id && (
                                      <div className="flex pe-1 items-end">
                                          <img
                                              className="size-4 rounded-full"
                                              src={`${avatar}`}
                                              alt=""
                                          />
                                      </div>
                                  )}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};
function useMemo(
    arg0: () => Map<string, LastSeenStatus[]> | null,
    arg1: (LastSeenStatus | LastSeenStatus[])[],
) {
    throw new Error('Function not implemented.');
}
