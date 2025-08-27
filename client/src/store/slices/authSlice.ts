import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserKey } from '../../types/users.types';
import * as EncryptionService from '../../services/encryptionService';
import { AxiosInstance } from 'axios';
import { axiosPrivate } from '../../api/axios';
import { AUTH_URL, USERS_URL } from '../../config/config';
import * as cryptoUtils from '../../crypto/cryptoUtils';

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
    userKey: UserKey | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isKeysInitialized: boolean;
}

const initialState: AuthState = {
    user: null,
    userKey: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isKeysInitialized: false,
};

export const loadUserKeyFromStorage = createAsyncThunk(
    'auth/loadUserKeyFromStorage',
    async (_, { rejectWithValue }) => {
        try {
            const privateKey = await cryptoUtils.importPrivateKey();

            if (!privateKey) {
                throw new Error('No private key found in storage');
            }

            return privateKey;
        } catch (error: any) {
            return rejectWithValue(
                error.message || 'Failed to load private key from storage',
            );
        }
    },
);

export const loginUser = createAsyncThunk(
    'auth/login',
    async (
        credentials: { username: string; password: string },
        { rejectWithValue },
    ) => {
        try {
            const { privateKey, publicKey } =
                await EncryptionService.initializeUserKeys();

            let deviceUuid = await cryptoUtils.getDeviceUuid();

            const response = await axiosPrivate.post(AUTH_URL + '/login', {
                username: credentials.username,
                password: credentials.password,
                publicKey,
                ...(deviceUuid && { deviceUuid }),
            });

            return {
                user: response.data.data.user,
                privateKey: privateKey,
            };
        } catch (error: any) {
            try {
                await cryptoUtils.removePrivateKey();
            } catch (cleanupError) {
                console.warn('Failed to cleanup private key:', cleanupError);
            }

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
            username: string;
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
            await Promise.all([
                cryptoUtils.removePrivateKey(),
                cryptoUtils.clearDeviceUuid(),
            ]);
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
        setUserKey: (state, action: PayloadAction<UserKey>) => {
            state.userKey = action.payload;
        },
        clearAuth: (state) => {
            state.user = null;
            state.userKey = null;
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
                state.userKey = {
                    privateKey: action.payload.privateKey,
                };
                state.isAuthenticated = true;
                state.isKeysInitialized = true;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Signup cases
            .addCase(signupUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signupUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.userKey = action.payload.userKey;
                state.isAuthenticated = true;
                state.isKeysInitialized = true;
                state.error = null;
            })
            .addCase(signupUser.rejected, (state, action) => {
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
                state.userKey = null;
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
            // Load keys from storage cases
            .addCase(loadUserKeyFromStorage.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loadUserKeyFromStorage.fulfilled, (state, action) => {
                state.isLoading = false;
                state.userKey = {
                    privateKey: action.payload,
                };
                state.isKeysInitialized = true;
                state.error = null;
            })
            .addCase(loadUserKeyFromStorage.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isKeysInitialized = false;
            });
    },
});

export const { setUser, setUserKey, clearAuth, clearError, updateUserStatus } =
    authSlice.actions;

export default authSlice.reducer;
