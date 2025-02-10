import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { SERVER_URL, CONVERSATIONS_URL, IMAGES_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import ChatLeftPanel from "../component/ChatLeftPanel";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const socket = io(SERVER_URL, {
    withCredentials: true,
});

const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

let candidateQueue = [];

const Chat = () => {
    const [chatState, setChatState] = useState({
        message: "",
        messages: [],
        receiver: null,
        conversations: []
    });
    const [userStatus, setUserStatus] = useState({
        onlineUsers: [],
        lastSeen: {},
    });
    const [callState, setCallState] = useState({
        isCalling: false, // Outgoing call
        isRinging: false, // Incoming call
        senderId: null,
        offer: null,
    });
    const { user, refreshTokens } = useAuth();
    const { conversationId } = useParams();
    const messagesEndRef = useRef(null)
    const localAudio = useRef(null);
    const remoteAudio = useRef(null);


    const axiosPrivate = useAxiosPrivate();

    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/messages`)

            const { convParticipants, messages } = res.data.data.conversation;

            const receiver = convParticipants.find(x => x.userId !== user.id)?.user || null;

            setChatState((prevState) => ({
                ...prevState,
                messages: messages,
                receiver: receiver
            }));
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = () => {
        try {
            if (chatState.message.trim()) {
                const messageData = {
                    senderId: user.id,
                    conversationId: Number(conversationId),
                    receiverId: chatState.receiver.id,
                    content: chatState.message,
                };

                socket.emit("private message", messageData);
                setChatState((prevState) => ({
                    ...prevState,
                    messages: [...prevState.messages, messageData],
                    message: ""
                }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getConversations = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL);
            const { conversations } = res.data.data;

            setChatState((prevState) => ({
                ...prevState,
                conversations: conversations
            }));
        } catch (error) {
            console.error(error);
        }
    }

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

    const startCall = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("getUserMedia is not supported in this browser.");
                return;
            }

            // Get audio stream before creating offer
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Caller microphone stream:", stream);

            localAudio.current.srcObject = stream; // Play local audio

            // Add tracks to peer connection
            stream.getTracks().forEach((track) => peer.addTrack(track, stream));

            // Create and send WebRTC offer
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            console.log("Start call, sending offer:", offer);

            socket.emit("offer", { offer, receiverId: chatState.receiver.id, senderId: user.id });

            // Update call state
            setCallState(prev => ({ ...prev, isCalling: true }));
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    const acceptCall = async () => {
        if (!callState.offer) return;

        await peer.setRemoteDescription(new RTCSessionDescription(callState.offer));
        await flushCandidateQueue();  // Flush queued ICE candidates

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        localAudio.current.srcObject = stream;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("answer", { answer, receiverId: callState.senderId });

        // Reset incoming call and mark as in a call
        setCallState({ isCalling: true, isRinging: false, senderId: null, offer: null });
    };


    const rejectCall = () => {
        socket.emit("call-rejected", { receiverId: callState.senderId });

        setCallState({ isRinging: false, senderId: null, offer: null });
    };

    const flushCandidateQueue = async () => {
        for (const candidate of candidateQueue) {
            try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
                console.log("Flushed ICE candidate:", candidate);
            } catch (err) {
                console.error("Error adding flushed ICE candidate:", err);
            }
        }
        // Clear the queue
        candidateQueue = [];
    };


    useEffect(() => {
        scrollToBottom()
    }, [chatState.messages]);

    useEffect(() => {
        socket.on("connect_error", (error) => {
            console.log(error.message);
            if (error.message === "Unauthorized") {
                refreshTokens();
            }
        });

        socket.on("online users", (data) => {
            setUserStatus(data);
        });

        socket.on("private message", (data) => {
            setChatState((prevState) => ({
                ...prevState,
                messages: [...prevState.messages, data],
            }));
        });


        return () => {
            // Cleanup event listeners
            socket.off("connect_error");
            socket.off("online users");
            socket.off("private message");
        };
    }, []);

    useEffect(() => {
        if (chatState.receiver) {
            // Handle incoming audio stream
            peer.ontrack = (event) => {
                console.log("Received track:", event.track);
                if (remoteAudio.current) {
                    remoteAudio.current.srcObject = event.streams[0];
                    remoteAudio.current.play().catch((err) => {
                        console.warn("Remote audio playback error:", err);
                    });
                } else {
                    console.warn("remoteAudio reference is null!");
                }
            };

            // Receive WebRTC Offer
            socket.on("offer", async ({ offer, senderId }) => {
                console.log("Offer received:", offer);

                setCallState((prevState) => ({
                    ...prevState,
                    isRinging: true,
                    senderId: senderId,
                    offer: offer,
                }));
            });

            // Receive WebRTC Answer
            socket.on("answer", async ({ answer }) => {
                console.log("Answer:", answer);
                await peer.setRemoteDescription(new RTCSessionDescription(answer));
            });

            // Send ICE candidates to the peer
            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", { candidate: event.candidate, receiverId: chatState.receiver.id });
                }
            };

            // Receive ICE Candidates
            socket.on("ice-candidate", async ({ candidate }) => {
                // Check if remote description is set
                if (peer.remoteDescription && peer.remoteDescription.type) {
                    try {
                        await peer.addIceCandidate(new RTCIceCandidate(candidate));
                        console.log("Added ICE candidate immediately.");
                    } catch (err) {
                        console.error("Error adding ICE candidate:", err);
                    }
                } else {
                    // Queue the candidate if remote description is not set
                    candidateQueue.push(candidate);
                    console.log("Queued ICE candidate:", candidate);
                }
            });

            socket.on("call-rejected", () => {
                console.log("Call was rejected");
                setCallState({ isRinging: false, senderId: null, offer: null });
            });

            return () => {
                socket.off("offer");
                socket.off("answer");
                socket.off("ice-candidate");
                socket.off("call-rejected");
            }
        }
    }, [chatState.receiver, callState.isCalling]);

    useEffect(() => {
        getConversations();
        getMessages();
    }, [conversationId]);

    return (
        <div className="py-4 flex bg-neutral-100 h-full">
            <div className="rounded mx-4 flex flex-col justify-between">
                <div className="rounded-lg p-3 flex align-middle bg-neutral-200">
                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                </div>
                <div className="hover:bg-gray-100 cursor-pointer" onClick={() => { alert("Clicked") }}>
                    <img className="inline-block size-10 rounded-full " src={`${IMAGES_URL}/${user?.avatar}`} alt="" />
                </div>
            </div>
            <ChatLeftPanel chatState={chatState} user={user} />
            <div className="rounded-lg bg-white w-4/5 me-4 flex flex-col">
                <div className="flex justify-between p-3 shadow-md">
                    <div className="flex">
                        <div>
                            <img className="inline-block size-10 rounded-full ring-0" src={`${IMAGES_URL}/${chatState.receiver?.avatar}`} alt="" />
                        </div>
                        <div className="flex flex-col ms-2">
                            <span className="text-base font-bold">{chatState.receiver?.firstName + " " + chatState.receiver?.lastName}</span>
                            <span className="text-sm text-gray-500">
                                {userStatus.onlineUsers.includes(chatState.receiver?.id)
                                    ? "Online"
                                    : getLastSeenTime(userStatus.lastSeen[chatState.receiver?.id])
                                }
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button
                            className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                            onClick={startCall}
                        >
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                call
                            </span>
                        </button>
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                videocam
                            </span>
                        </button>
                        <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">
                                more_horiz
                            </span>
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto flex flex-col pb-4">
                    {chatState.messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full p-2 ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}>
                            <div className="flex max-w-md">
                                {msg.senderId !== user.id && (
                                    <div className="flex pe-2 items-end">
                                        <img className="size-8 rounded-full" src={`${IMAGES_URL}/${chatState.receiver?.avatar}`} alt="" />
                                    </div>
                                )}
                                <p className={`rounded-3xl px-3 py-2 break-words max-w-full text-sm 
                                    ${msg.senderId === user.id ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white" : "bg-gray-100 text-black"}`
                                }>
                                    {msg.content}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="flex p-1 items-center mb-2">
                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            add_circle
                        </span>
                    </button>
                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            imagesmode
                        </span>
                    </button>
                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            gif_box
                        </span>
                    </button>
                    <input
                        type="text"
                        className="flex-grow ms-2 bg-gray-100 px-3 py-2 rounded-3xl focus:outline-none caret-blue-500 me-2"
                        placeholder="Aa"
                        value={chatState.message}
                        onChange={(e) => setChatState(prevState => ({ ...prevState, message: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                sendMessage();
                            }
                        }}
                    />
                    <button
                        className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                    >
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            thumb_up
                        </span>
                    </button>
                </div>
            </div>
            <audio ref={localAudio} autoPlay muted />
            <audio ref={remoteAudio} autoPlay />
            {callState.isRinging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 p-5">
                    <h2 className="text-white text-lg">Incoming Call...</h2>
                    <div className="mt-4 flex gap-4">
                        <button onClick={acceptCall} className="bg-green-500 px-4 py-2 rounded text-white">Accept</button>
                        <button onClick={rejectCall} className="bg-red-500 px-4 py-2 rounded text-white">Reject</button>
                    </div>
                </div>
            )}
            {callState.isCalling && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 p-5">
                    <h2 className="text-white text-lg">Calling...</h2>
                </div>
            )}
        </div>
    );
};

export default Chat;
