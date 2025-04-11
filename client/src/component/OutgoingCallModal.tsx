import React from 'react';
import { IMAGES_URL } from '../config/config';
import { MdClose, MdCall } from "react-icons/md";

const OutgoingCallModal = ({ onEndCall, receiver, isVideoCall }) => {
    
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="relative bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in">
                <button
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 transition"
                    onClick={onEndCall}
                >
                    <MdClose className="text-2xl" />
                </button>
                <div className="my-4 flex justify-center">
                    <img
                        className="size-16 rounded-full shadow-md border-2 border-gray-300"
                        src={`${IMAGES_URL}/${receiver?.avatar}`}
                        alt="Caller Avatar"
                    />
                </div>
                <h2 className="text-gray-800 text-xl font-semibold">
                    {isVideoCall ? "Video Calling ..." : "Voice Calling ..."}
                </h2>
                {isVideoCall && (
                    <div className="mt-4">
                        <p className="text-gray-600">Make sure your camera is on.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutgoingCallModal;