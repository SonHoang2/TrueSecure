import React from "react";
import Chat from "./pages/Chat"
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './component/ProtectedRoute';
import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";

const App = () => {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Chat />} />
                <Route
                    path='/auth'
                >
                    <Route
                        path='login'
                        element={<Login />}
                    />
                </Route>
            </Routes>
        </AuthProvider>
    );
};

export default App;
