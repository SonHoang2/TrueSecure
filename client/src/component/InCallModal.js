import React from 'react';

const InCallModal = ({ onEndCall, receiver, isVideoCall, localVideo, localAudio, remoteVideo, remoteAudio }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">In Call</h2>
                    <p className="text-gray-600 mb-6">
                        You are currently in a {isVideoCall ? 'video' : 'audio'} call with{' '}
                        <span className="font-medium">{receiver?.firstName + " " + receiver?.lastName}</span>
                    </p>

                    {isVideoCall && (
                        <div className="mb-4">
                            <div className="relative">
                                <video
                                    ref={remoteVideo}
                                    autoPlay
                                    className="w-full h-48 rounded-lg bg-gray-200"
                                />
                                <video
                                    ref={localVideo}
                                    autoPlay
                                    muted
                                    className="absolute bottom-2 right-2 w-24 h-16 rounded-lg border-2 border-white shadow-md"
                                />
                            </div>
                        </div>
                    )}

                    <audio ref={localAudio} autoPlay muted className="hidden" />
                    <audio ref={remoteAudio} autoPlay className="hidden" />

                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => onEndCall()}
                            className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition duration-200"
                        >
                            End Call
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InCallModal;