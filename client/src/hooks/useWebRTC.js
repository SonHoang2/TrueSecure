import { useState, useEffect, useRef } from 'react';

export const useWebRTC = ({ receiverId, socket, user }) => {
    const [callState, setCallState] = useState({
        isCalling: false,
        isRinging: false,
        isConnected: false,
        sender: null,
        offer: null
    });

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const peer = useRef(null);

    const candidateQueue = useRef([]);

    const startCall = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("getUserMedia is not supported in this browser.");
                return;
            }

            // Get audio stream before creating offer
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            setLocalStream(stream);

            // Add tracks to peer connection
            stream.getTracks().forEach((track) => peer.current.addTrack(track, stream));

            // Create and send WebRTC offer
            const offer = await peer.current.createOffer();
            await peer.current.setLocalDescription(offer);

            socket.emit("offer", { offer, receiverId, sender: user });

            // Update call state
            setCallState(prev => ({ ...prev, isCalling: true }));
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    const acceptCall = async () => {
        try {
            if (!callState.offer) return;

            await peer.current.setRemoteDescription(new RTCSessionDescription(callState.offer));
            await flushCandidateQueue();  // Flush queued ICE candidates

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            setLocalStream(stream);
            stream.getTracks().forEach((track) => peer.current.addTrack(track, stream));

            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            socket.emit("answer", { answer, receiverId: callState.sender.id });

            // Reset incoming call and mark as in a call
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
        try {
            socket.emit("call-rejected", { receiverId: callState.sender.id });
            setCallState({ isRinging: false, sender: null, offer: null });
        } catch (error) {
            console.error("Error rejecting call:", error);
        }
    };

    const endCall = (shouldNotifyPeer = true) => {
        try {
            if (peer.current) {
                peer.current.close();
            }

            peer.current = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
                setLocalStream(null);
            }

            if (shouldNotifyPeer) {
                socket.emit("call-ended", { receiverId });
            }

            setCallState({
                isConnected: false,
                isRinging: false,
                sender: null,
                offer: null
            });
        } catch (error) {
            console.error("Error ending call:", error);
        }
    };

    const flushCandidateQueue = async () => {
        try {
            for (const candidate of candidateQueue.current) {
                try {
                    await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding flushed ICE candidate:", err);
                }
            }
            // Clear the queue
            candidateQueue.current = [];
        } catch (error) {
            console.error("Error flushing ICE candidate queue:", error);
        }
    };

    useEffect(() => {
        peer.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        return () => {
            if (peer.current) {
                peer.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (receiverId) {
            peer.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]); // Update remoteStream state

                } else {
                    console.error("No remote stream found in event!");
                }
            };

            // Receive WebRTC Offer
            socket.on("offer", async ({ offer, sender }) => {
                await peer.current.setRemoteDescription(new RTCSessionDescription(offer)); // Process immediately
                await flushCandidateQueue(); // Flush ICE candidates

                setCallState((prevState) => ({
                    ...prevState,
                    isRinging: true,
                    sender: sender,
                    offer: offer,
                }));
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
    
                } catch (error) {
                    console.error("Error handling answer:", error);
                }
            });

            // Send ICE candidates to the peer
            peer.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", { candidate: event.candidate, receiverId });
                }
            };

            // Receive ICE Candidates
            socket.on("ice-candidate", async ({ candidate }) => {
                // Check if remote description is set
                if (peer.current.remoteDescription && peer.current.remoteDescription.type) {
                    try {
                        await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error("Error adding ICE candidate:", err);
                    }
                } else {
                    // Queue the candidate if remote description is not set
                    candidateQueue.current.push(candidate);
                }
            });

            socket.on("call-rejected", () => {
                setCallState({ isRinging: false, sender: null, offer: null });
            });

            socket.on("call-ended", () => {
                endCall(false);
            });

            return () => {
                socket.off("offer");
                socket.off("answer");
                socket.off("ice-candidate");
                socket.off("call-rejected");
            }
        }
    }, [receiverId, callState.isCalling]);

    return { callState, startCall, acceptCall, rejectCall, endCall, localStream, remoteStream };
};