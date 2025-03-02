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
    const localStream = useRef(null);
    const remoteStream = useRef(null);
    const peer = useRef(null);
    const candidateQueue = useRef([]);
    const isVideoCallRef = useRef(callState.isVideoCall);

    useEffect(() => {
        isVideoCallRef.current = callState.isVideoCall;
    }, [callState.isVideoCall]);


    useEffect(() => {
        peer.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peer.current.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit("ice-candidate", {
                    candidate,
                    receiverId
                });
            }
        };

        peer.current.ontrack = (event) => {
            const stream = event.streams[0];
            remoteStream.current = stream;
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
    }, []);


    const startCall = async (isVideo = false) => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("getUserMedia is not supported in this browser.");
                return;
            }

            const constraints = { audio: true, video: isVideo };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStream.current = stream

            if (isVideo && localVideo.current) {
                localVideo.current.srcObject = stream;
                localVideo.current.muted = true;
            } else if (localAudio.current) {
                localAudio.current.srcObject = stream;
                localAudio.current.muted = true;
            }

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
            const constraints = { audio: true, video: callState.isVideoCall };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStream.current = stream;

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
            if (peer.current) {
                peer.current.close();
                peer.current = null;
            }

            // Stop local tracks
            if (localStream.current) {
                localStream.current.getTracks().forEach(track => track.stop());
                localStream.current = null;
            }

            // Stop remote tracks
            if (remoteStream.current) {
                remoteStream.current.getTracks().forEach(track => track.stop());
                remoteStream.current = null;
            }

            // Clear media elements
            [localVideo.current, localAudio.current, remoteVideo.current, remoteAudio.current].forEach(ref => {
                if (ref) {
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

            // Reinitialize peer connection
            peer.current = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
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

    useEffect(() => {
        if (!receiverId) return;

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

        socket.on("answer", async ({ answer }) => {
            try {
                console.log("Received answer:", answer);
                console.log("Current signaling state:", peer.current.signalingState);

                await peer.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );

                setCallState(prev => ({
                    ...prev,
                    isConnected: true,
                    isCalling: false,
                    sender: null,
                    offer: null
                }));

                console.log({ callState });

            } catch (error) {
                console.error("Error handling answer:", error);
            }
        });

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

        socket.on("call-rejected", () => {
            setCallState(prev => ({
                ...prev,
                isRinging: false,
                sender: null,
                offer: null
            }));
            endCall(false);
        });

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