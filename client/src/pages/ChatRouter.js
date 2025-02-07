import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { SERVER_URL, CONVERSATIONS_URL, IMAGES_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import { axiosPrivate } from "../api/axios";
import { ChatLeftPanel } from "../component/ChatLeftPanel";

const ChatRouter = () => {
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
    const { user } = useAuth();
    const { conversationId } = useParams();

    const getMessages = async () => {
        try {
            const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/messages`)

            const { convParticipants, messages } = res.data.data.conversation;

            console.log(convParticipants, messages);


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

    useEffect(() => {
        getConversations();
        getMessages();
    }, []);

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
        </div>
    );
};

export default ChatRouter;
