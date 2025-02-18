import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CONVERSATIONS_URL, IMAGES_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import { ChatLeftPanel } from "../component/ChatLeftPanel";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const ChatRouter = ({ userStatus }) => {
    const [chatState, setChatState] = useState({
        message: "",
        messages: [],
        receiver: null,
        conversations: []
    });
    const { user } = useAuth();

    const axiosPrivate = useAxiosPrivate();

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

    useEffect(() => {
        getConversations();
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
            <ChatLeftPanel chatState={chatState} user={user} userStatus={userStatus} />
        </div>
    );
};

export default ChatRouter;
