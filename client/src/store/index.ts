import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import conversationSlice from './slices/conversationSlice';
import uiSlice from './slices/uiSlice';
import { authPersistConfig } from './persistConfig';

// Create persisted auth reducer
const persistedAuthReducer = persistReducer(authPersistConfig, authSlice);

export const store = configureStore({
    reducer: {
        auth: persistedAuthReducer,
        chat: chatSlice,
        conversations: conversationSlice,
        ui: uiSlice,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'persist/PERSIST',
                    'persist/REHYDRATE',
                    'auth/initializeEncryption/fulfilled',
                    'auth/loadUserKeyFromStorage/fulfilled',
                    'auth/loginUser/fulfilled',
                    'auth/signupUser/fulfilled',
                    'auth/updateRecipientPublicKey',
                    'auth/setUserKeys',
                ],
                ignoredActionsPaths: [
                    'meta.arg',
                    'payload.timestamp',
                    'payload.publicKey',
                    'payload.privateKey',
                    'payload.userKey',
                    'payload.userKey.privateKey',
                    'payload.algorithm',
                    'payload',
                    'meta.arg.axiosPrivate',
                ],
                ignoredPaths: [
                    'auth.userKey',
                    'auth.userKey.privateKey',
                    'auth.userKey.privateKey.algorithm',
                ],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
