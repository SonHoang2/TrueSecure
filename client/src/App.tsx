import { useEffect, useState } from 'react';
import Chat from './pages/Chat';
import { ProtectedRoute } from './component/ProtectedRoute/ProtectedRoute';
import { Routes, Route } from 'react-router-dom';
import ChatRouter from './pages/ChatRouter';
import socket from './utils/socket';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useAuth } from './hooks/useAuth/useAuth';
import useAxiosPrivate from './hooks/useAxiosPrivate';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { AppRole } from './enums/roles.enum';

const App = () => {
    const [userStatus, setUserStatus] = useState({
        onlineUsers: {},
        lastSeen: {},
    });

    const { user } = useAuth();

    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        if (!user) {
            return;
        }

        if (!socket.connected) {
            socket.connect();
        }

        socket.on('online-users', (data) => {
            setUserStatus(data);
        });

        socket.on('connect_error', (error) => {
            console.error(error.message);
        });

        return () => {
            socket.off('connect_error');
            socket.off('online-users');
            socket.disconnect();
        };
    }, [user]);

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <EncryptionProvider
                        userId={user?.id}
                        axiosPrivate={axiosPrivate}
                    >
                        <ProtectedRoute allowedRole={AppRole.USER} />
                    </EncryptionProvider>
                }
            >
                <Route
                    path=""
                    element={<ChatRouter userStatus={userStatus} />}
                />
                <Route
                    path="chat"
                    element={<ChatRouter userStatus={userStatus} />}
                />
                <Route
                    path="chat/:conversationId"
                    element={<Chat userStatus={userStatus} />}
                />
            </Route>
            <Route path="/auth">
                <Route path="login" element={<Login />} />
                <Route path="google" element={<Login />} />
                <Route path="signup" element={<Signup />} />
            </Route>
        </Routes>
    );
};

export default App;
