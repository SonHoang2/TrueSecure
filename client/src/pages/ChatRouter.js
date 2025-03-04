import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CONVERSATIONS_URL, IMAGES_URL } from "../config/config";
import { useAuth } from "../hooks/useAuth";
import { ChatLeftPanel } from "../component/ChatLeftPanel";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import SidebarNavigation from "../component/SidebarNavigation";

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
            <SidebarNavigation />
            <ChatLeftPanel chatState={chatState} user={user} userStatus={userStatus} />
        </div>
    );
};

export default ChatRouter;
