import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_URL, CLIENT_URL, USERS_URL } from "../config/config";
import queryString from "query-string";
import axios, { axiosPrivate } from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const navigate = useNavigate();

    const refreshTokens = async () => {
        try {
            await axios.get(AUTH_URL + "/refresh", { withCredentials: true });
            console.log("Token Refreshed");

            const res = await axiosPrivate.get(USERS_URL + "/me");
            const { user } = res.data.data;

            if (user) {
                setUser(user);
                localStorage.setItem("user", JSON.stringify(user));
            }
        } catch (error) {
            console.log("Token Refresh Failed", error);
            setUser(null);
            localStorage.removeItem("user");
        }
    }

    const signup = async ({ email, password, passwordConfirm, firstName, lastName }) => {
        const res = await axiosPrivate.post(
            AUTH_URL + "/signup",
            { email, password, firstName, lastName, passwordConfirm },
        );

        setUser(res.data.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        navigate("/");
    }

    const login = async ({ email, password }) => {
        const res = await axiosPrivate.post(
            AUTH_URL + "/login",
            { email, password },
        );

        setUser(res.data.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        navigate("/");
    };

    const logout = async () => {
        await axiosPrivate.get(AUTH_URL + "/logout");
        setUser(null);
        localStorage.removeItem("user");
        navigate("/");
    };

    const getGoogleCode = async () => {
        const queryParams = queryString.stringify({
            client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            scope: "email profile",
            redirect_uri: CLIENT_URL + "/auth/google",
            display: "popup",
            response_type: "code",
        });
        const url = `https://accounts.google.com/o/oauth2/v2/auth?${queryParams}`;

        window.location.href = url;
    }

    const sendGoogleCode = async (code) => {
        const URL = AUTH_URL + `/login/google`;
        const res = await axios.post(URL, { code, redirectUri: CLIENT_URL + "/auth/google" });
        setUser(res.data.data.user);
        navigate("/");
    }

    const value = useMemo(
        () => ({
            user,
            login,
            signup,
            logout,
            getGoogleCode,
            sendGoogleCode,
            refreshTokens,
        }),
        [user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};