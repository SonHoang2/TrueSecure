import { useEffect, useRef } from 'react';
import { Receiver } from '../types/users.types';

type InCallModalProps = {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onEndCall: () => void;
    isVideoCall: boolean;
    receiver: Receiver | null;
};

const InCallModal: React.FC<InCallModalProps> = ({
    localStream,
    remoteStream,
    onEndCall,
    isVideoCall,
    receiver,
}) => {
    const localRef = useRef<any>(null);
    const remoteRef = useRef<any>(null);

    useEffect(() => {
        if (localRef.current) {
            localRef.current.srcObject = localStream;
            localRef.current.muted = true;
        }
        if (remoteRef.current) {
            remoteRef.current.srcObject = remoteStream;
        }
    }, [localStream, remoteStream]);

    return (
        <div className="w-full h-screen bg-gray-900 fixed top-0 left-0 z-50 flex flex-col items-center justify-center">
            <button
                onClick={onEndCall}
                className="absolute top-6 right-6 z-50 p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg"
            >
                <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>

            {isVideoCall ? (
                <div className="relative w-full h-full">
                    <video
                        ref={remoteRef}
                        autoPlay
                        className="w-full h-full object-cover"
                    />
                    <video
                        ref={localRef}
                        autoPlay
                        muted
                        className="absolute bottom-6 right-6 w-48 h-32 rounded-lg shadow-xl object-cover border-2 border-white"
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-8">
                    <div className="relative">
                        <div className="flex items-center justify-center">
                            <img
                                className="w-48 h-48 rounded-full object-cover"
                                src={`${receiver?.avatar}`}
                                alt=""
                            />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-500 px-4 py-1 rounded-full flex items-center">
                            <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></div>
                            <span className="text-white text-sm">In call</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-3xl font-semibold text-white">
                            {receiver?.firstName + ' ' + receiver?.lastName}
                        </h2>
                        <p className="text-gray-300 mt-2">Audio call</p>
                    </div>

                    <audio ref={remoteRef} autoPlay />
                    <audio ref={localRef} autoPlay muted />
                </div>
            )}
        </div>
    );
};

export default InCallModal;
