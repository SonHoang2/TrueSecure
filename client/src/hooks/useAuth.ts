import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
    loginUser,
    logoutUser,
    clearAuth,
    setUser,
    signupUser,
    refreshToken,
} from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { AUTH_URL, CLIENT_URL, GOOGLE_CLIENT_ID } from '../config/config';
import queryString from 'query-string';
import { axiosPrivate } from '../api/axios';
import { Routes } from '../enums/routes.enum';

interface LoginCredentials {
    email: string;
    password: string;
}

interface SignupCredentials {
    email: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
}

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const {
        user,
        isAuthenticated,
        isLoading,
        error,
        userKeys,
        isKeysInitialized,
    } = useAppSelector((state) => state.auth);

    const login = useCallback(
        async (credentials: LoginCredentials) => {
            try {
                const result = await dispatch(loginUser(credentials)).unwrap();
                navigate('/');
                return result;
            } catch (error) {
                throw error;
            }
        },
        [dispatch, navigate],
    );

    const signup = useCallback(
        async (credentials: SignupCredentials) => {
            try {
                const result = await dispatch(signupUser(credentials)).unwrap();
                navigate('/');
                return result;
            } catch (error) {
                throw error;
            }
        },
        [dispatch, navigate],
    );

    const logout = useCallback(async () => {
        try {
            await dispatch(logoutUser()).unwrap();
            navigate(Routes.LOGIN);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [dispatch, navigate]);

    const getGoogleCode = useCallback(async () => {
        const queryParams = queryString.stringify({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile',
            redirect_uri: CLIENT_URL + '/auth/google',
            display: 'popup',
            response_type: 'code',
        });

        const url = `https://accounts.google.com/o/oauth2/v2/auth?${queryParams}`;
        window.location.href = url;
    }, []);

    const sendGoogleCode = useCallback(
        async (code: string) => {
            try {
                const res = await axiosPrivate.post(
                    AUTH_URL + `/login/google`,
                    {
                        code,
                        redirectUri: CLIENT_URL + '/auth/google',
                    },
                );

                navigate('/');
            } catch (error) {
                throw error;
            }
        },
        [dispatch, navigate],
    );

    const refreshTokens = useCallback(async () => {
        try {
            const result = await dispatch(refreshToken()).unwrap();
            return result;
        } catch (error) {
            console.log('Token Refresh Failed', error);
            dispatch(clearAuth());
        }
    }, [dispatch, user]);

    return {
        // State
        user,
        isAuthenticated,
        isLoading,
        error,
        userKeys,
        isKeysInitialized,

        // Actions
        login,
        signup,
        logout,
        getGoogleCode,
        sendGoogleCode,
        refreshTokens,
    };
};
