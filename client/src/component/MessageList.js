import React, { useEffect, useRef } from 'react';
import { IMAGES_URL } from '../config/config';
import { messageStatus } from '../config/config';

export const MessageList = ({ messages, userId, conversation, lastSeenStatus, receiver, convParticipants }) => {
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        if (receiver) {
            scrollToBottom()
        }
    }, [messages.length]);

    return (
        <div className="flex-grow overflow-y-auto flex flex-col pb-4 pt-2">
            {messages.map((msg, index) => {
                const { isGroup } = conversation;

                const isSentByUser = msg.senderId === userId;
                const isLastMessage = index === messages.length - 1;

                const otherUser = isGroup ? convParticipants.find(x => x.userId === msg.senderId)?.user : receiver;

                const avatar = otherUser?.avatar;

                const statuses = isGroup ? lastSeenStatus.filter(item => item.messageId === msg.id) : [];

                return (
                    <div key={index} className="flex flex-col">
                        {
                            !isSentByUser && isGroup &&
                            (<div className="ps-14">
                                <p className="text-xs text-gray-500">{otherUser?.firstName + " " + otherUser?.lastName}</p>
                            </div>)
                        }
                        <div className={`flex w-full px-2 py-1 ${isSentByUser ? "justify-end" : "justify-start"}`}>
                            <div className="flex max-w-md items-end">
                                {!isSentByUser && (
                                    <div className="flex-none pe-2 items-end">
                                        <img className="size-8 rounded-full" src={`${IMAGES_URL}/${avatar}`} alt="" />
                                    </div>
                                )}
                                <div className="flex-grow flex flex-col">
                                    <p className={`rounded-3xl px-3 py-2 break-all text-s
                                                        ${isSentByUser ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white" : "bg-gray-100 text-black"}`}>
                                        {msg.content}
                                    </p>
                                    <div className="flex justify-end">
                                        {
                                            isLastMessage && isSentByUser && msg?.status !== messageStatus.Seen &&
                                            <p className="text-xs pe-4 text-gray-600 first-letter:uppercase">
                                                {msg?.status}
                                            </p>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end w-full pe-3">
                            {
                                isGroup ?
                                    statuses.map(status => (
                                        <div key={status?.id} className="flex pe-1 items-end">
                                            <img className="size-4 rounded-full" src={`${IMAGES_URL}/${status.avatar}`} alt="" />
                                        </div>
                                    )) :
                                    lastSeenStatus?.id === msg.id &&
                                    <div className="flex pe-1 items-end">
                                        <img className="size-4 rounded-full" src={`${IMAGES_URL}/${avatar}`} alt="" />
                                    </div>
                            }
                        </div>
                    </div>
                )
            })}
            <div ref={messagesEndRef} />
        </div>
    )
};