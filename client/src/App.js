import React, { useEffect, useState } from "react";
import Chat from "./pages/Chat"
import { ProtectedRoute } from './component/ProtectedRoute';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import ChatRouter from "./pages/ChatRouter";
import socket from "./utils/socket";

const App = () => {
    const { refreshTokens } = useAuth();

    const [userStatus, setUserStatus] = useState({
        onlineUsers: [],
        lastSeen: {},
    });

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        socket.on("online-users", (data) => {
            setUserStatus(data);
        });

        socket.on("connect_error", (error) => {
            console.error(error.message);
            if (error.message === "Unauthorized") {
                refreshTokens();
            }
        });

        return () => {
            socket.off("connect_error");
            socket.off("online-users");
        };
    }, []);

    return (
        <Routes>
            <Route
                path="/"
                element={<ProtectedRoute />}
            >
                <Route path="" element={<ChatRouter userStatus={userStatus} />} />
                <Route path="chat" element={<ChatRouter userStatus={userStatus} />} />
                <Route path="chat/:conversationId" element={<Chat userStatus={userStatus} />} />
            </Route>
            <Route
                path='/auth'
            >
                <Route
                    path='login'
                    element={<Login />}
                />
            </Route>
        </Routes>
    );
};

export default App;
