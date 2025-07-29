import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserKeys } from '../../types/users.types';
import * as EncryptionService from '../../services/encryptionService';
import { AxiosInstance } from 'axios';
import { axiosPrivate } from '../../api/axios';
import { AUTH_URL } from '../../config/config';

export interface User {
    id: number;
    username: string;
    email: string;
    avatar: string;
    isOnline: boolean;
    role: string;
}

export interface AuthState {
    user: User | null;
    userKeys: UserKeys | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isKeysInitialized: boolean;
}

const initialState: AuthState = {
    user: null,
    userKeys: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isKeysInitialized: false,
};

// Initialize encryption keys
export const initializeEncryption = createAsyncThunk(
    'auth/initializeEncryption',
    async (
        {
            userId,
            axiosPrivate,
        }: { userId: string; axiosPrivate: AxiosInstance },
        { rejectWithValue },
    ) => {
        try {
            const keys = await EncryptionService.initialize(
                userId,
                axiosPrivate,
            );
            return keys;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : 'Failed to initialize encryption',
            );
        }
    },
);

export const loginUser = createAsyncThunk(
    'auth/login',
    async (
        credentials: { email: string; password: string },
        { rejectWithValue },
    ) => {
        try {
            const response = await axiosPrivate.post(
                AUTH_URL + '/login',
                credentials,
            );
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    error.message ||
                    'Login failed',
            );
        }
    },
);

export const signupUser = createAsyncThunk(
    'auth/signup',
    async (
        credentials: {
            email: string;
            password: string;
            passwordConfirm: string;
            firstName: string;
            lastName: string;
        },
        { rejectWithValue },
    ) => {
        try {
            const response = await axiosPrivate.post(
                AUTH_URL + '/signup',
                credentials,
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    error.message ||
                    'Login failed',
            );
        }
    },
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await axiosPrivate.get(AUTH_URL + '/logout');
            return true;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    error.message ||
                    'Logout failed',
            );
        }
    },
);

export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosPrivate.get(AUTH_URL + '/refresh');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    error.message ||
                    'Token refresh failed',
            );
        }
    },
);

export const loginWithGoogle = createAsyncThunk(
    'auth/loginWithGoogle',
    async (
        googleAuthData: { code: string; redirectUri: string },
        { rejectWithValue },
    ) => {
        try {
            const response = await axiosPrivate.post(
                AUTH_URL + '/login/google',
                googleAuthData,
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                    error.message ||
                    'Google login failed',
            );
        }
    },
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        setUserKeys: (state, action: PayloadAction<UserKeys>) => {
            state.userKeys = action.payload;
        },
        clearAuth: (state) => {
            state.user = null;
            state.userKeys = null;
            state.isAuthenticated = false;
            state.error = null;
            state.isKeysInitialized = false;
        },
        clearError: (state) => {
            state.error = null;
        },
        updateUserStatus: (
            state,
            action: PayloadAction<{ userId: number; isOnline: boolean }>,
        ) => {
            if (state.user && state.user.id === action.payload.userId) {
                state.user.isOnline = action.payload.isOnline;
            }
        },
        updateRecipientPublicKey: (state, action: PayloadAction<CryptoKey>) => {
            if (state.userKeys) {
                state.userKeys = {
                    ...state.userKeys,
                    publicKey: action.payload,
                };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Login cases
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Logout cases
            .addCase(logoutUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.isLoading = false;
                state.user = null;
                state.userKeys = null;
                state.isAuthenticated = false;
                state.error = null;
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Refresh token cases
            .addCase(refreshToken.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(refreshToken.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
            })
            .addCase(refreshToken.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Initialize encryption cases
            .addCase(initializeEncryption.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(initializeEncryption.fulfilled, (state, action) => {
                state.isLoading = false;
                // Handle the case where action.payload is a CryptoKey (privateKey)
                if (action.payload) {
                    state.userKeys = {
                        privateKey: action.payload,
                        publicKey: null, // Will be set later when needed
                    };
                } else {
                    state.userKeys = null;
                }
                state.isKeysInitialized = true;
                state.error = null;
            })
            .addCase(initializeEncryption.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isKeysInitialized = false;
            });
    },
});

export const {
    setUser,
    setUserKeys,
    clearAuth,
    clearError,
    updateUserStatus,
    updateRecipientPublicKey,
} = authSlice.actions;

export default authSlice.reducer;
