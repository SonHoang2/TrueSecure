import { useState, useEffect, useRef } from 'react';

export const useWebRTC = ({ receiverId, socket, user }) => {
    const [callState, setCallState] = useState({
        isCalling: false,
        isRinging: false,
        isConnected: false,
        isVideoCall: false,
        sender: null,
        offer: null
    });

    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const localAudio = useRef(null);
    const remoteAudio = useRef(null);
    const peer = useRef(null);
    const candidateQueue = useRef([]);

    const startCall = async (isVideo = false) => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("getUserMedia is not supported in this browser.");
                return;
            }

            const constraints = { audio: true, video: isVideo };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (isVideo && localVideo.current) {
                localVideo.current.srcObject = stream;
                localVideo.current.muted = true; // Mute local video to avoid feedback
            } else if (localAudio.current) {
                localAudio.current.srcObject = stream;
                localAudio.current.muted = true; // Mute local audio to avoid feedback
            }

            // Add tracks to peer connection
            stream.getTracks().forEach((track) => peer.current.addTrack(track, stream));

            // Create and send WebRTC offer
            const offer = await peer.current.createOffer();
            await peer.current.setLocalDescription(offer);

            socket.emit("offer", {
                offer,
                receiverId,
                sender: user,
                isVideo
            });

            setCallState(prev => ({
                ...prev,
                isCalling: true,
                isVideoCall: isVideo
            }));
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    const acceptCall = async () => {
        try {
            if (!callState.offer) return;

            await peer.current.setRemoteDescription(
                new RTCSessionDescription(callState.offer)
            );
            await flushCandidateQueue();

            // Get local media
            const constraints = {
                audio: true,
                video: callState.isVideoCall
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Display local stream
            if (callState.isVideoCall && localVideo.current) {
                localVideo.current.srcObject = stream;
                localVideo.current.muted = true;
            } else if (localAudio.current) {
                localAudio.current.srcObject = stream;
                localAudio.current.muted = true;
            }

            // Add tracks to connection
            stream.getTracks().forEach(track => peer.current.addTrack(track, stream));

            // Create and send answer
            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);

            socket.emit("answer", {
                answer,
                receiverId: callState.sender.id,
            });

            setCallState(prev => ({
                ...prev,
                isConnected: true,
                sender: null,
                isRinging: false,
                offer: null
            }));
        } catch (error) {
            console.error("Error accepting call:", error);
        }
    };

    const rejectCall = () => {
        socket.emit("call-rejected", { receiverId: callState.sender.id });
        setCallState(prev => ({
            ...prev,
            isRinging: false,
            sender: null,
            offer: null
        }));
    };

    const endCall = (shouldNotifyPeer = true) => {
        try {
            // Close peer connection
            if (peer.current) {
                peer.current.close();
                peer.current = null;
            }

            peer.current = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });

            // Stop all media tracks
            [localVideo.current, localAudio.current, remoteVideo.current, remoteAudio.current].forEach(ref => {
                if (ref && ref.srcObject) {
                    ref.srcObject.getTracks().forEach(track => track.stop());
                    ref.srcObject = null;
                }
            });

            // Notify peer if needed
            if (shouldNotifyPeer) {
                socket.emit("call-ended", { receiverId });
            }

            setCallState({
                isConnected: false,
                isRinging: false,
                isVideoCall: false,
                sender: null,
                offer: null
            });
        } catch (error) {
            console.error("Error ending call:", error);
        }
    };

    const flushCandidateQueue = async () => {
        while (candidateQueue.current.length > 0) {
            const candidate = candidateQueue.current.shift();
            try {
                await peer.current.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (error) {
                console.error("Error adding ICE candidate:", error);
            }
        }
    };

    // Initialize peer connection
    useEffect(() => {
        peer.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // ICE Candidate handling
        peer.current.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit("ice-candidate", {
                    candidate,
                    receiverId
                });
            }
        };

        // Track remote streams
        peer.current.ontrack = (event) => {
            const stream = event.streams[0];
            if (callState.isVideoCall && remoteVideo.current) {
                remoteVideo.current.srcObject = stream;
                remoteVideo.current.play().catch(error =>
                    console.error("Error playing remote video:", error)
                );
            } else if (remoteAudio.current) {
                remoteAudio.current.srcObject = stream;
                remoteAudio.current.play().catch(error =>
                    console.error("Error playing remote audio:", error)
                );
            }
        };

        return () => {
            if (peer.current) {
                peer.current.close();
            }
        };
    }, [callState.isVideoCall]);

    // Socket event listeners
    useEffect(() => {
        if (!receiverId) return;

        // Handle incoming call
        socket.on("offer", async ({ offer, sender, isVideo }) => {
            try {
                await peer.current.setRemoteDescription(
                    new RTCSessionDescription(offer)
                );
                await flushCandidateQueue();

                setCallState(prev => ({
                    ...prev,
                    isRinging: true,
                    sender,
                    offer,
                    isVideoCall: isVideo
                }));
            } catch (error) {
                console.error("Error handling offer:", error);
            }
        });

        // Handle answer
        socket.on("answer", async ({ answer }) => {
            try {
                await peer.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );

                setCallState(prev => ({
                    ...prev,
                    isConnected: true,
                    sender: null,
                    isCalling: false,
                    offer: null
                }));
            } catch (error) {
                console.error("Error handling answer:", error);
            }
        });

        // Handle ICE candidates
        socket.on("ice-candidate", async ({ candidate }) => {
            try {
                if (peer.current.remoteDescription) {
                    await peer.current.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );
                } else {
                    candidateQueue.current.push(candidate);
                }
            } catch (error) {
                console.error("Error adding ICE candidate:", error);
            }
        });

        // Handle call rejection
        socket.on("call-rejected", () => {
            setCallState(prev => ({
                ...prev,
                isRinging: false,
                sender: null,
                offer: null
            }));
            endCall(false);
        });

        // Handle call termination
        socket.on("call-ended", () => {
            endCall(false);
        });

        return () => {
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("call-rejected");
            socket.off("call-ended");
        };
    }, [receiverId, callState.isConnected]);

    return {
        callState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localVideo,
        remoteVideo,
        localAudio,
        remoteAudio
    };
};