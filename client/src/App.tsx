import { useEffect, useState } from 'react';
import Chat from './pages/Chat';
import { ProtectedRoute } from './component/ProtectedRoute';
import { Routes, Route } from 'react-router-dom';
import ChatRouter from './pages/ChatRouter';
import socket from '../socket';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useAuth } from './hooks/useAuth';
import useAxiosPrivate from './hooks/useAxiosPrivate';
import { AppRole } from './enums/roles.enum';
import Profile from './pages/Profile';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
    loadDeviceUuidFromStorage,
    loadUserKeyFromStorage,
} from './store/slices/authSlice';

const App = () => {
    const [userStatus, setUserStatus] = useState({
        onlineUsers: {},
        lastSeen: {},
    });

    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const { isKeysInitialized } = useAppSelector((state) => state.auth);
    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        if (user && !isKeysInitialized) {
            dispatch(loadUserKeyFromStorage());
            dispatch(loadDeviceUuidFromStorage());
        }
    }, [user, isKeysInitialized, dispatch, axiosPrivate]);

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
                element={<ProtectedRoute allowedRole={AppRole.USER} />}
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
                <Route path="profile" element={<Profile />} />
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
