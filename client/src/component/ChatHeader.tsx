import React from 'react';
import { IMAGES_URL } from '../config/config';

export const ChatHeader = ({ conversation, userStatus, receiver, startCall }) => {
    const getLastSeenTime = (timestamp) => {
        if (!timestamp) return "";

        const now = new Date();
        const lastSeen = new Date(timestamp);

        const diffInSeconds = Math.floor((now - lastSeen) / 1000);
        if (diffInSeconds < 60) return `last seen ${diffInSeconds} sec ago`;
        if (diffInSeconds < 3600) return `last seen ${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `last seen ${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `last seen ${Math.floor(diffInSeconds / 86400)} days ago`;
        return `last seen ${Math.floor(diffInSeconds / 604800)} weeks ago`;
    };

    return (
        <div className="flex justify-between p-3 shadow-md">
            <div className="flex">
                <div className="relative flex items-center">
                    <img
                        className="inline-block size-10 rounded-full ring-0"
                        src={`${IMAGES_URL}/${conversation?.isGroup ? conversation?.avatar : receiver?.avatar}`}
                        alt="avatar"
                    />
                    {!conversation?.isGroup && userStatus?.onlineUsers.hasOwnProperty(receiver?.id) && (
                        <span className="absolute bottom-0 right-0 block size-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </div>
                <div className="flex flex-col ms-2">
                    <span className="text-base font-bold">{
                        conversation?.isGroup
                            ? conversation?.title
                            : receiver
                                ? `${receiver.firstName} ${receiver.lastName}`
                                : "Unknown User"
                    }</span>
                    <span className="text-sm text-gray-500">
                        {!conversation?.isGroup &&
                            (userStatus.onlineUsers.hasOwnProperty(receiver?.id)
                                ? "Online"
                                : getLastSeenTime(userStatus.lastSeen[receiver?.id]))
                        }
                    </span>
                </div>
            </div>
            <div className="flex items-center">
                {
                    !conversation?.isGroup && (
                        <button
                            className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                            onClick={() => startCall()}
                        >
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                call
                            </span>
                        </button>)
                }
                {
                    !conversation?.isGroup && (
                        <button
                            className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                            onClick={() => startCall(true)}
                        >
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                videocam
                            </span>
                        </button>)
                }
                <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                    <span className="material-symbols-outlined text-blue-500 text-2xl">
                        more_horiz
                    </span>
                </button>
            </div>
        </div>
    );
};