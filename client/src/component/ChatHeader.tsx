import React from 'react';
import { FaArrowLeft, FaPhoneAlt } from 'react-icons/fa';
import { IoIosVideocam, IoIosMore } from 'react-icons/io';
import { Conversation } from '../types/conversations.types';
import { Receiver, UserStatus } from '../types/users.types';
import { useNavigate } from 'react-router-dom';

type ChatHeaderProps = {
    conversation: Conversation;
    userStatus: UserStatus;
    receiver: Receiver;
    startCall: (video?: boolean) => void;
    showChatInfo: boolean;
    onMoreClick: () => void;
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    conversation,
    userStatus,
    receiver,
    startCall,
    showChatInfo,
    onMoreClick,
}) => {
    const getLastSeenTime = (timestamp: string) => {
        if (!timestamp) return '';

        const now = new Date().getTime();
        const lastSeen = new Date(timestamp).getTime();

        const diffInSeconds = Math.floor((now - lastSeen) / 1000);
        if (diffInSeconds < 60) return `last seen ${diffInSeconds} sec ago`;
        if (diffInSeconds < 3600)
            return `last seen ${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400)
            return `last seen ${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800)
            return `last seen ${Math.floor(diffInSeconds / 86400)} days ago`;
        return `last seen ${Math.floor(diffInSeconds / 604800)} weeks ago`;
    };

    const navigate = useNavigate();

    return (
        <div className="flex justify-between p-3 shadow-md">
            <div className="flex">
                <div className="flex items-center md:hidden">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 w-10 h-10 hover:bg-gray-100 rounded-full me-4"
                    >
                        <FaArrowLeft size={20} className="text-gray-600" />
                    </button>
                </div>
                <div className="relative flex items-center">
                    <img
                        className="inline-block size-10 rounded-full ring-0"
                        src={`${conversation?.isGroup ? conversation?.avatar : receiver?.avatar}`}
                        alt="avatar"
                    />
                    {!conversation?.isGroup &&
                        userStatus?.onlineUsers.hasOwnProperty(
                            receiver?.id,
                        ) && (
                            <span className="absolute bottom-0 right-0 block size-3 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                </div>
                <div className="flex flex-col ms-2">
                    <span className="text-base font-bold">
                        {conversation?.isGroup
                            ? conversation?.title
                            : receiver
                              ? `${receiver.firstName} ${receiver.lastName}`
                              : 'Unknown User'}
                    </span>
                    <span className="text-sm text-gray-500">
                        {!conversation?.isGroup &&
                            (userStatus.onlineUsers.hasOwnProperty(receiver?.id)
                                ? 'Online'
                                : getLastSeenTime(
                                      userStatus.lastSeen[receiver?.id],
                                  ))}
                    </span>
                </div>
            </div>
            <div className="flex items-center">
                {!conversation?.isGroup && (
                    <button
                        className="p-2 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200 transition-all duration-300 hover:scale-110"
                        onClick={() => startCall()}
                    >
                        <FaPhoneAlt className="text-blue-500" size={20} />
                    </button>
                )}
                {!conversation?.isGroup && (
                    <button
                        className="p-2 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200 transition-all duration-300 hover:scale-110"
                        onClick={() => startCall(true)}
                    >
                        <IoIosVideocam className="text-blue-500" size={30} />
                    </button>
                )}
                <button
                    className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200 transition-all duration-300 hover:scale-110"
                    onClick={onMoreClick}
                >
                    <IoIosMore
                        className={`text-2xl ${
                            showChatInfo
                                ? 'bg-blue-500 text-white rounded-full'
                                : 'text-blue-500 hover:text-blue-600'
                        }`}
                    />
                </button>
            </div>
        </div>
    );
};
