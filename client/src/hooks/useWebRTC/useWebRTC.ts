import { useState, useEffect, useRef } from 'react';

export const useWebRTC = ({
    receiverId,
    socket,
    user,
}: {
    receiverId: string;
    socket: any;
    user: any;
}) => {
    type CallState = {
        isCalling: boolean;
        isRinging: boolean;
        isConnected: boolean;
        isVideoCall: boolean;
        sender: string | null;
        offer: any | null;
    };

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

    const candidateQueue = useRef([]);

    const createPeerConnection = () => {
        console.log('Creating new peer connection...');

        if (peer.current) {
            peer.current.close(); // Close old connection if exists
        }

        peer.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Re-attach event listeners
        peer.current.onicecandidate = (event) => {
            console.log({ candidate: event.candidate, receiverId });
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
                    video: isVideo,
                });

            setLocalStream(stream);
            localStreamRef.current = stream;

            console.log('Local stream:', stream);

            // Add tracks to peer connection
            stream
                .getTracks()
                .forEach((track) => peer.current.addTrack(track, stream));

            // Create and send WebRTC offer
            const offer = await peer.current?.createOffer();
            await peer.current?.setLocalDescription(offer);

            socket.emit('offer', { offer, receiverId, sender: user, isVideo });

            setCallState({
                isCalling: true,
                isVideoCall: isVideo,
                isRinging: false,
                isConnected: false,
                sender: null,
                offer: offer,
            });
        } catch (error) {
            if (error.name === 'NotFoundError') {
                alert('No camera or microphone found!');
            }
            console.error('Error starting call:', error);
        }
    };

    const acceptCall = async () => {
        try {
            if (!callState.offer) return;

            await peer.current.setRemoteDescription(
                new RTCSessionDescription(callState.offer),
            );
            await flushCandidateQueue(); // Flush queued ICE candidates

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callState.isVideoCall,
            });

            setLocalStream(stream);
            localStreamRef.current = stream;

            stream
                .getTracks()
                .forEach((track) => peer.current.addTrack(track, stream));

            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            socket.emit('answer', { answer, receiverId: callState.sender.id });

            // Reset incoming call and mark as in a call
            setCallState((prev) => ({
                isCalling: false,
                isConnected: true,
                sender: null,
                isRinging: false,
                offer: null,
                isVideoCall: prev.isVideoCall,
            }));
        } catch (error) {
            console.error('Error accepting call:', error);
        }
    };

    const rejectCall = () => {
        try {
            socket.emit('call-rejected', {
                receiverId: callState.sender.id as string,
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
                    await peer.current.addIceCandidate(
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
                await peer.current.setRemoteDescription(
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
                    await peer.current.setRemoteDescription(
                        new RTCSessionDescription(answer),
                    );

                    setCallState((prev) => ({
                        isConnected: true,
                        isCalling: false,
                        sender: null,
                        offer: null,
                        isRinging: false,
                        isVideoCall: prev.isVideoCall,
                    }));
                } catch (error) {
                    console.error('Error handling answer:', error);
                }
            });

            // Receive ICE Candidates
            socket.on('ice-candidate', async ({ candidate }) => {
                // Check if remote description is set
                if (
                    peer.current.remoteDescription &&
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
    };
};
