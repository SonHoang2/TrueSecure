import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { User } from '../types/users.types';
import { DEEPFAKE_URL } from '../config/config';
import { AxiosInstance } from 'axios';

interface UseWebRTCProps {
    receiverId: number;
    socket: Socket;
    user: User;
    axiosPrivate: AxiosInstance;
}

interface CallState {
    isCalling: boolean;
    isRinging: boolean;
    isConnected: boolean;
    isVideoCall: boolean;
    sender: User | null;
    offer: RTCSessionDescriptionInit | null;
}

interface UseWebRTCResult {
    callState: CallState;
    startCall: (isVideo?: boolean) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: (shouldNotifyPeer?: boolean) => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    capturedImages: String[];
}

export const useWebRTC = ({
    receiverId,
    socket,
    user,
    axiosPrivate,
}: UseWebRTCProps): UseWebRTCResult => {
    const [callState, setCallState] = useState<CallState>({
        isCalling: false,
        isRinging: false,
        isConnected: false,
        isVideoCall: false,
        sender: null,
        offer: null,
    });

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peer = useRef<RTCPeerConnection | null>(null);

    const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

    const [capturedImages, setCapturedImages] = useState<String[]>([]);
    const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const captureFrame = (stream: MediaStream): Promise<Blob | null> => {
        if (!stream) return Promise.resolve(null);

        // Create canvas if it doesn't exist
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Create a video element to draw the stream
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;

        return new Promise<Blob | null>((resolve) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                video.play();

                video.ontimeupdate = () => {
                    if (ctx && video.readyState >= 2) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob(
                            (blob) => {
                                video.remove();
                                resolve(blob);
                            },
                            'image/jpeg',
                            1,
                        );
                    }
                };
            };
        });
    };

    // Start capturing images every 5 seconds
    const startImageCapture = (stream: MediaStream) => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }

        captureIntervalRef.current = setInterval(async () => {
            try {
                const imageBlob = await captureFrame(stream);
                if (imageBlob) {
                    setCapturedImages((prev) => [...prev, 'blob']);

                    const formData = new FormData();
                    formData.append(
                        'image',
                        imageBlob,
                        `frame_${Date.now()}.jpg`,
                    );
                    formData.append('callId', `${user.id}_${receiverId}`);

                    const res = await axiosPrivate.post(
                        DEEPFAKE_URL + '/upload',
                        formData,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        },
                    );

                    console.log('Image uploaded successfully:', res.data);
                }
            } catch (error) {
                console.error('Error capturing frame:', error);
            }
        }, 5000); // Capture every 5 seconds
    };

    // Stop capturing images
    const stopImageCapture = () => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
        setCapturedImages([]);
    };

    const createPeerConnection = () => {
        console.log('Creating new peer connection...');

        if (peer.current) {
            peer.current.close();
        }

        peer.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Re-attach event listeners
        peer.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    receiverId,
                });
            }
        };

        peer.current.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };
    };

    const startCall = async (isVideo = false) => {
        try {
            createPeerConnection();

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {
                console.error('getUserMedia is not supported in this browser.');
                return;
            }

            // Get audio stream before creating offer
            const stream: MediaStream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        facingMode: 'user',
                    },
                });

            setLocalStream(stream);
            localStreamRef.current = stream;

            console.log('Local stream:', stream);

            // Add tracks to peer connection
            stream.getTracks().forEach((track) => {
                if (peer.current) {
                    peer.current.addTrack(track, stream);
                }
            });

            // Create and send WebRTC offer
            let offer: RTCSessionDescriptionInit | null = null;
            if (peer.current) {
                offer = await peer.current.createOffer();
                await peer.current.setLocalDescription(offer);
            }

            socket.emit('offer', { offer, receiverId, sender: user, isVideo });

            setCallState({
                isCalling: true,
                isVideoCall: isVideo,
                isRinging: false,
                isConnected: false,
                sender: null,
                offer: offer,
            });
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                alert('No camera or microphone found!');
            }
            console.error('Error starting call:', error);
        }
    };

    const acceptCall = async () => {
        try {
            if (!callState.offer) return;

            if (peer.current) {
                await peer.current.setRemoteDescription(
                    new RTCSessionDescription(callState.offer),
                );
            }

            await flushCandidateQueue(); // Flush queued ICE candidates

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: 'user',
                },
            });

            setLocalStream(stream);
            localStreamRef.current = stream;

            stream.getTracks().forEach((track) => {
                if (peer.current) {
                    peer.current.addTrack(track, stream);
                }
            });

            let answer: RTCSessionDescriptionInit | null = null;
            if (peer.current) {
                answer = await peer.current.createAnswer();
                await peer.current.setLocalDescription(answer);
            }

            socket.emit('answer', { answer, receiverId: callState.sender?.id });

            // Reset incoming call and mark as in a call
            setCallState((prev) => ({
                isCalling: false,
                isConnected: true,
                sender: null,
                isRinging: false,
                offer: null,
                isVideoCall: prev.isVideoCall,
            }));

            // Start image capture if it's a video call
            if (callState.isVideoCall) {
                startImageCapture(stream);
            }
        } catch (error) {
            console.error('Error accepting call:', error);
        }
    };

    const rejectCall = () => {
        try {
            socket.emit('call-rejected', {
                receiverId: callState.sender?.id,
            });

            setCallState({
                isConnected: false,
                isCalling: false,
                isRinging: false,
                isVideoCall: false,
                sender: null,
                offer: null,
            });
        } catch (error) {
            console.error('Error rejecting call:', error);
        }
    };

    const endCall = (shouldNotifyPeer = true) => {
        try {
            if (peer.current) {
                peer.current.close();
            }

            const stream = localStreamRef.current;
            console.log('Local stream:', stream);

            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }

            stopImageCapture();

            if (shouldNotifyPeer) {
                socket.emit('call-ended', { receiverId });
            }

            setCallState({
                isConnected: false,
                isCalling: false,
                isRinging: false,
                isVideoCall: false,
                sender: null,
                offer: null,
            });
        } catch (error) {
            console.error('Error ending call:', error);
        }
    };

    const flushCandidateQueue = async () => {
        try {
            for (const candidate of candidateQueue.current) {
                try {
                    await peer.current?.addIceCandidate(
                        new RTCIceCandidate(candidate),
                    );
                } catch (err) {
                    console.error('Error adding flushed ICE candidate:', err);
                }
            }
            // Clear the queue
            candidateQueue.current = [];
        } catch (error) {
            console.error('Error flushing ICE candidate queue:', error);
        }
    };

    useEffect(() => {
        return () => {
            stopImageCapture();
            if (canvasRef.current) {
                canvasRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        peer.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        return () => {
            if (peer.current) {
                peer.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (receiverId && peer.current) {
            // Receive WebRTC Offer
            socket.on('offer', async ({ offer, sender, isVideo }) => {
                createPeerConnection();
                await peer.current?.setRemoteDescription(
                    new RTCSessionDescription(offer),
                ); // Process immediately
                await flushCandidateQueue(); // Flush ICE candidates

                setCallState({
                    isRinging: true,
                    sender,
                    offer,
                    isVideoCall: isVideo,
                    isCalling: false,
                    isConnected: false,
                });
            });

            socket.on('answer', async ({ answer }) => {
                try {
                    await peer.current?.setRemoteDescription(
                        new RTCSessionDescription(answer),
                    );

                    setCallState((prev) => {
                        console.log('Previous state:', prev); // Log previous state

                        const newState = {
                            isConnected: true,
                            isCalling: false,
                            sender: null,
                            offer: null,
                            isRinging: false,
                            isVideoCall: prev.isVideoCall,
                        };

                        console.log('New state:', newState); // Log new state

                        // Start image capture when call is connected and it's a video call
                        if (prev.isVideoCall && localStreamRef.current) {
                            console.log(
                                'Starting image capture for video call',
                            );
                            startImageCapture(localStreamRef.current);
                        }

                        return newState;
                    });
                } catch (error) {
                    console.error('Error handling answer:', error);
                }
            });

            // Receive ICE Candidates
            socket.on('ice-candidate', async ({ candidate }) => {
                // Check if remote description is set
                if (
                    peer.current?.remoteDescription &&
                    peer.current.remoteDescription.type
                ) {
                    try {
                        await peer.current.addIceCandidate(
                            new RTCIceCandidate(candidate),
                        );
                    } catch (err) {
                        console.error('Error adding ICE candidate:', err);
                    }
                } else {
                    // Queue the candidate if remote description is not set
                    candidateQueue.current.push(candidate);
                }
            });

            socket.on('call-rejected', () => {
                try {
                    endCall(false);
                } catch (error) {
                    console.error('Error handling call rejection:', error);
                }
            });

            socket.on('call-ended', () => {
                try {
                    endCall(false);
                } catch (error) {
                    console.error('Error handling call end:', error);
                }
            });

            return () => {
                socket.off('offer');
                socket.off('answer');
                socket.off('ice-candidate');
                socket.off('call-rejected');
            };
        }
    }, [receiverId, callState.isConnected]);

    return {
        callState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localStream,
        remoteStream,
        capturedImages,
    };
};
