import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import socket from "../utils/socket";
import { CONVERSATIONS_URL, IMAGES_URL, messageStatus, USERS_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import ChatLeftPanel from "../component/ChatLeftPanel";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import * as cryptoUtils from "../utils/cryptoUtils"

let peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

let candidateQueue = [];

const Chat = ({ userStatus }) => {
    const [chatState, setChatState] = useState({
        message: "",
        messages: [],
        receiver: null,
        convParticipants: [],
        conversations: [],
        conversation: {
            title: "",
            isGroup: false,
            avatar: "",
        },
    });

    const [userKeys, setUserKeys] = useState({
        publicKey: null,
        privateKey: null,
    });

    const [callState, setCallState] = useState({
        isCalling: false, // Outgoing call
        isRinging: false, // Incoming call
        sender: null,
        offer: null,
    });

    const conversationId = Number(useParams()?.conversationId);

    const messageSoundRef = useRef(new Audio("/sound/notification-sound.m4a"));
    const conversationIdRef = useRef(conversationId);
    const messagesEndRef = useRef(null)

    const { user } = useAuth();
    const localAudio = useRef(null);
    const remoteAudio = useRef(null);

    const axiosPrivate = useAxiosPrivate();

    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/messages`)

            const { convParticipants, messages, title, isGroup, avatar } = res.data.data.conversation;

            const receiver = convParticipants.find(x => x.userId !== user?.id)?.user || null;

            const privateKey = await getPrivateKey();

            // Create an array of promises for decrypting messages
            const decryptionPromises = messages.map((message) => {
                if (message.senderId !== user?.id) {
                    // Return the decryption promise directly (without await)
                    return cryptoUtils.decryptMessage(privateKey, {
                        content: message.content,
                        iv: message.iv,
                        ephemeralPublicKey: message.ephemeralPublicKey
                    }).then((content) => {
                        console.log("Decrypted content:", content);
                        message.content = content; // Update the message content
                        return message; // Return the updated message
                    }).catch((error) => {
                        console.error("Failed to decrypt message:", error);
                        return message; // Return the original message in case of an error
                    });
                } else {
                    // If the message doesn't need decryption, return it as-is
                    return Promise.resolve(message);
                }
            });

            // Wait for all decryption promises to resolve
            const decryptedMessages = await Promise.all(decryptionPromises);
            console.log("Decrypted messages:", decryptedMessages);


            setChatState((prevState) => ({
                ...prevState,
                messages: decryptedMessages,
                receiver: receiver,
                conversation: {
                    title: title,
                    isGroup: isGroup,
                    avatar: avatar,
                },
                convParticipants: convParticipants,
            }));
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async () => {
        try {
            if (chatState.message.trim()) {
                const { content, iv, ephemeralPublicKey } = await cryptoUtils.encryptMessage(userKeys.publicKey, chatState.message)

                const messageData = {
                    senderId: user?.id,
                    conversationId: conversationId,
                    content: chatState.message,
                    status: messageStatus.Sending,
                };

                const encryptedMessage = {
                    ...messageData,
                    content: content,
                    iv: iv,
                    ephemeralPublicKey: ephemeralPublicKey,
                };

                if (chatState.conversation.isGroup) {
                    socket.emit("send-group-message", encryptedMessage);
                } else {
                    encryptedMessage.receiverId = chatState.receiver?.id;
                    socket.emit("send-private-message", encryptedMessage);
                }

                setChatState((prevState) => ({
                    ...prevState,
                    messages: [...prevState.messages, messageData],
                    message: "",
                }));
            }
        } catch (error) {
            console.error(error);
        }
    };


    const getConversations = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + "/me");
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

            localAudio.current.srcObject = stream; // Play local audio

            // Add tracks to peer connection
            stream.getTracks().forEach((track) => peer.addTrack(track, stream));

            // Create and send WebRTC offer
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            socket.emit("offer", { offer, receiverId: chatState.receiver.id, sender: user });

            // Update call state
            setCallState(prev => ({ ...prev, isCalling: true }));
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    const acceptCall = async () => {
        try {
            if (!callState.offer) return;

            await peer.setRemoteDescription(new RTCSessionDescription(callState.offer));
            await flushCandidateQueue();  // Flush queued ICE candidates

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            localAudio.current.srcObject = stream;
            stream.getTracks().forEach((track) => peer.addTrack(track, stream));

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("answer", { answer, receiverId: callState.sender.id });

            // Reset incoming call and mark as in a call
            setCallState({ isCalling: true, isRinging: false, senderId: null, offer: null });
        } catch (error) {
            console.error("Error accepting call:", error);
        }
    };

    const rejectCall = () => {
        try {
            socket.emit("call-rejected", { receiverId: callState.sender.id });
            setCallState({ isRinging: false, senderId: null, offer: null });
        } catch (error) {
            console.error("Error rejecting call:", error);
        }
    };

    const endCall = (shouldNotifyPeer = true) => {
        try {
            if (peer) {
                peer.close();
            }

            peer = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            // Stop all media tracks
            if (localAudio.current && localAudio.current.srcObject) {
                localAudio.current.srcObject.getTracks().forEach(track => track.stop());
                localAudio.current.srcObject = null;
            }

            if (shouldNotifyPeer) {
                socket.emit("call-ended", { receiverId: chatState.receiver.id });
            }

            setCallState({ isCalling: false, isRinging: false, senderId: null, offer: null });
        } catch (error) {
            console.error("Error ending call:", error);
        }
    };

    const flushCandidateQueue = async () => {
        try {
            for (const candidate of candidateQueue) {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding flushed ICE candidate:", err);
                }
            }
            // Clear the queue
            candidateQueue = [];
        } catch (error) {
            console.error("Error flushing ICE candidate queue:", error);
        }
    };

    const getPublicKey = async () => {
        try {
            const res = await axiosPrivate.get(USERS_URL + `/${chatState.receiver?.id}/public-key`);
            const { publicKey: exportedPublicKey } = res.data.data;

            const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);

            setUserKeys(prev => ({ ...prev, publicKey }));
        }
        catch (error) {
            console.error("Error getting public key:", error);
        }
    };

    const getPrivateKey = async () => {
        try {
            let privateKey = userKeys.privateKey;
            if (!privateKey) {
                const exportedPrivateKey = localStorage.getItem("privateKey");
                if (exportedPrivateKey) {
                    privateKey = await cryptoUtils.importPrivateKey(exportedPrivateKey);
                }
            }
            setUserKeys(prev => ({ ...prev, privateKey }));

            return privateKey;
        }
        catch (error) {
            console.error("Error getting private key:", error);
        }
    };

    useEffect(() => {
        if (chatState.receiver) {
            scrollToBottom()
        }
    }, [chatState.messages.length]);

    useEffect(() => {
        conversationIdRef.current = conversationId;

        getConversations();
    }, [conversationId]);

    useEffect(() => {
        if (localStorage.getItem("privateKey")) {
            getMessages();
        }
    }, [conversationId, localStorage.getItem("privateKey")]);

    useEffect(() => {
        if (chatState.receiver) {
            getPublicKey();
        }
    }, [chatState.receiver]);

    useEffect(() => {
        if (chatState.messages.length > 0) {
            socket.on("new-private-message", async (data) => {
                messageSoundRef.current.play().catch((error) =>
                    console.error("Audio play error:", error)
                );

                if (data.conversationId === conversationIdRef.current) {
                    const decryptedMessage = await cryptoUtils.decryptMessage(userKeys.privateKey,
                        {
                            content: data.content,
                            iv: data.iv,
                            ephemeralPublicKey: data.ephemeralPublicKey
                        }
                    );

                    console.log("Decrypted message:", decryptedMessage);

                    const message = {
                        ...data,
                        content: decryptedMessage,
                        iv: null,
                        ephemeralPublicKey: null,
                    }

                    setChatState((prevState) => ({
                        ...prevState,
                        messages: [...prevState.messages, message],
                    }));

                    socket.emit("private-message-seen", {
                        senderId: data.senderId,
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        messageStatusId: data.messageStatusId,
                    })
                }
            });

            socket.on("private-message-status-update", (data) => {
                setChatState((prevState) => {
                    const messageIndex = prevState.messages.findLastIndex((msg) => {
                        if (msg.status === messageStatus.Sending) return true;
                        return msg.id === data.messageId;
                    });

                    if (messageIndex === -1) return prevState;

                    const updatedMessages = [...prevState.messages];
                    updatedMessages[messageIndex] = {
                        ...updatedMessages[messageIndex],
                        status: data.status,
                        id: data.messageId,
                    };

                    return {
                        ...prevState,
                        messages: updatedMessages,
                    };
                });
            });

            socket.on("new-group-message", (data) => {
                messageSoundRef.current.play().catch((error) =>
                    console.error("Audio play error:", error)
                );

                if (data.conversationId === conversationIdRef.current) {
                    setChatState((prevState) => ({
                        ...prevState,
                        messages: [...prevState.messages, data],
                    }));

                    socket.emit("group-message-seen", {
                        senderId: data.senderId,
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        messageStatusId: data.messageStatusId,
                    })
                }
            });

            socket.on("group-message-status-update", ({ messageId, userId, status }) => {
                setChatState((prevState) => {
                    const updatedMessages = [...prevState.messages];
                    const messageIndex = updatedMessages.findLastIndex(
                        (msg) => msg.status === messageStatus.Sending || msg.id === messageId
                    );

                    if (messageIndex === -1) return prevState;
                    const message = updatedMessages[messageIndex];

                    if (status === messageStatus.Seen) {
                        message.statuses = message.statuses || [];
                        message.status = null;

                        const statusIndex = message.statuses.findIndex((s) => s.userId === userId);
                        if (statusIndex === -1) {
                            message.statuses.push({ userId, status });
                        } else {
                            message.statuses[statusIndex].status = status;
                        }
                    } else {
                        updatedMessages[messageIndex] = { ...message, status, id: messageId };
                    }

                    return { ...prevState, messages: updatedMessages };
                });
            });



            return () => {
                socket.off("new-private-message");
                socket.off("private-message-status-update");
                socket.off("group-message-status-update");
                socket.off("new-group-message");
            };
        }
    }, [chatState.messages.length]);

    useEffect(() => {
        if (chatState.receiver) {
            // Handle incoming audio stream
            peer.ontrack = (event) => {
                if (remoteAudio.current) {
                    remoteAudio.current.srcObject = event.streams[0];
                    remoteAudio.current.play().catch((err) => {
                        console.error("Remote audio playback error:", err);
                    });
                } else {
                    console.error("remoteAudio reference is null!");
                }
            };

            // Receive WebRTC Offer
            socket.on("offer", async ({ offer, sender }) => {
                await peer.setRemoteDescription(new RTCSessionDescription(offer)); // Process immediately
                await flushCandidateQueue(); // Flush ICE candidates

                setCallState((prevState) => ({
                    ...prevState,
                    isRinging: true,
                    sender: sender,
                    offer: offer,
                }));
            });

            // Receive WebRTC Answer
            socket.on("answer", async ({ answer }) => {
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
                    } catch (err) {
                        console.error("Error adding ICE candidate:", err);
                    }
                } else {
                    // Queue the candidate if remote description is not set
                    candidateQueue.push(candidate);
                }
            });

            socket.on("call-rejected", () => {
                setCallState({ isRinging: false, senderId: null, offer: null });
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
    }, [chatState.receiver, callState.isCalling]);

    useEffect(() => {
        const initKey = async () => {
            try {
                const { privateKey, publicKey } = await cryptoUtils.generateECDHKeys();

                const exportedPublicKey = await cryptoUtils.exportPublicKey(publicKey);

                await cryptoUtils.storePrivateKey(privateKey);

                await axiosPrivate.post(USERS_URL + "/public-key", {
                    publicKey: exportedPublicKey,
                });
            } catch (error) {
                console.error("Error initializing key:", error);
            }
        };


        if (!localStorage.getItem("privateKey")) {
            initKey();
        }
    }, [])

    const lastSeenStatus = useMemo(() => {
        if (chatState.conversation.isGroup) {
            return chatState.convParticipants
                .map(participant => {
                    if (participant.userId === user?.id) {
                        return null;
                    }

                    for (let i = chatState.messages.length - 1; i >= 0; i--) {
                        const user = chatState.messages[i].statuses?.find(
                            status => status.userId === participant.userId && status.status === messageStatus.Seen
                        );
                        if (user) {
                            return {
                                userId: participant.userId,
                                messageId: chatState.messages[i]?.id,
                                avatar: participant.user.avatar,
                            };
                        }
                    }
                    return null;
                })
                .filter(Boolean);
        }

        return chatState.messages.findLast(message => message.status === messageStatus.Seen);
    }, [chatState.convParticipants, chatState.messages]);

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
            <ChatLeftPanel chatState={chatState} user={user} userStatus={userStatus} conversationId={conversationId} />
            {
                <div className="rounded-lg bg-white w-4/5 me-4 flex flex-col">
                    <div className="flex justify-between p-3 shadow-md">
                        <div className="flex">
                            <div className="relative flex items-center">
                                <img
                                    className="inline-block size-10 rounded-full ring-0"
                                    src={`${IMAGES_URL}/${chatState.conversation?.isGroup ? chatState.conversation?.avatar : chatState.receiver?.avatar}`}
                                    alt="avatar"
                                />
                                {!chatState.conversation?.isGroup && userStatus?.onlineUsers.hasOwnProperty(chatState.receiver?.id) && (
                                    <span className="absolute bottom-0 right-0 block size-3 bg-green-500 border-2 border-white rounded-full"></span>
                                )}
                            </div>
                            <div className="flex flex-col ms-2">
                                <span className="text-base font-bold">{
                                    chatState.conversation?.isGroup
                                        ? chatState.conversation?.title
                                        : chatState.receiver
                                            ? `${chatState.receiver.firstName} ${chatState.receiver.lastName}`
                                            : "Unknown User"
                                }</span>
                                <span className="text-sm text-gray-500">
                                    {!chatState.conversation?.isGroup &&
                                        (userStatus.onlineUsers.hasOwnProperty(chatState.receiver?.id)
                                            ? "Online"
                                            : getLastSeenTime(userStatus.lastSeen[chatState.receiver?.id]))
                                    }
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            {
                                !chatState.conversation?.isGroup && (
                                    <button
                                        className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                                        onClick={startCall}
                                    >
                                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                                            call
                                        </span>
                                    </button>)
                            }
                            {
                                !chatState.conversation?.isGroup && (
                                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
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
                    <div className="flex-grow overflow-y-auto flex flex-col pb-4 pt-2">
                        {chatState.messages.map((msg, index) => {
                            const { messages, convParticipants, conversation, receiver } = chatState;
                            const { isGroup } = conversation;

                            const isSentByUser = msg.senderId === user?.id;
                            const isLastMessage = index === messages.length - 1;

                            const otherUser = isGroup ? convParticipants.find(x => x.userId === msg.senderId)?.user : receiver;

                            const avatar = otherUser?.avatar;

                            const statuses = isGroup ? lastSeenStatus.filter(item => item.messageId === msg.id) : [];

                            return (
                                <div key={index} className="flex flex-col">
                                    {
                                        !isSentByUser && isGroup &&
                                        (<div className="ps-14">
                                            <p className="text-xs text-gray-500">{otherUser?.firstName + " " + otherUser?.lastName}</p>
                                        </div>)
                                    }
                                    <div className={`flex w-full px-2 py-1 ${isSentByUser ? "justify-end" : "justify-start"}`}>
                                        <div className="flex max-w-md items-end">
                                            {!isSentByUser && (
                                                <div className="flex-none pe-2 items-end">
                                                    <img className="size-8 rounded-full" src={`${IMAGES_URL}/${avatar}`} alt="" />
                                                </div>
                                            )}
                                            <div className="flex-grow flex flex-col">
                                                <p className={`rounded-3xl px-3 py-2 break-all text-s
                                                        ${isSentByUser ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white" : "bg-gray-100 text-black"}`}>
                                                    {msg.content}
                                                </p>
                                                <div className="flex justify-end">
                                                    {
                                                        isLastMessage && isSentByUser && msg?.status !== messageStatus.Seen &&
                                                        <p className="text-xs pe-4 text-gray-600 first-letter:uppercase">
                                                            {msg?.status}
                                                        </p>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end w-full pe-3">
                                        {
                                            isGroup ?
                                                statuses.map(status => (
                                                    <div key={status?.id} className="flex pe-1 items-end">
                                                        <img className="size-4 rounded-full" src={`${IMAGES_URL}/${status.avatar}`} alt="" />
                                                    </div>
                                                )) :
                                                lastSeenStatus?.id === msg.id &&
                                                <div className="flex pe-1 items-end">
                                                    <img className="size-4 rounded-full" src={`${IMAGES_URL}/${avatar}`} alt="" />
                                                </div>
                                        }
                                    </div>
                                </div>
                            )
                        })}
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
            }
            <audio ref={localAudio} autoPlay muted />
            <audio ref={remoteAudio} autoPlay />
            {
                callState.isRinging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
                        <div className="relative bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in">
                            <button
                                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 transition"
                                onClick={rejectCall}
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>

                            <h2 className="text-gray-800 text-xl font-semibold">Incoming Call</h2>

                            <div className="mt-4 flex justify-center">
                                <img
                                    className="size-16 rounded-full shadow-md border-2 border-gray-300"
                                    src={`${IMAGES_URL}/${callState.sender.avatar}`}
                                    alt="Caller Avatar"
                                />
                            </div>

                            <h1 className="text-gray-700 text-lg font-medium mt-2">
                                {callState.sender.firstName} {callState.sender.lastName} is calling you
                            </h1>

                            <div className="mt-6 flex justify-center gap-4">
                                <button
                                    onClick={rejectCall}
                                    className="flex items-center gap-2 bg-red-500 px-5 py-2 rounded-full text-white font-medium shadow-md hover:bg-red-600 transition-transform transform hover:scale-110 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                    Reject
                                </button>

                                <button
                                    onClick={acceptCall}
                                    className="flex items-center gap-2 bg-green-500 px-5 py-2 rounded-full text-white font-medium shadow-md hover:bg-green-600 transition-transform transform hover:scale-110 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-lg">call</span>
                                    Accept
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                callState.isCalling && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                        <div className="relative bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in">
                            <button
                                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 transition"
                                onClick={endCall}
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                            <div className="my-4 flex justify-center">
                                <img
                                    className="size-16 rounded-full shadow-md border-2 border-gray-300"
                                    src={`${IMAGES_URL}/${chatState.receiver.avatar}`}
                                    alt="Caller Avatar"
                                />
                            </div>
                            <h2 className="text-gray-800 text-xl font-semibold">Calling ...</h2>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Chat;
