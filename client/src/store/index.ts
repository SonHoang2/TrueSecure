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
                // Ignore these action types
                ignoredActions: [
                    'persist/PERSIST',
                    'persist/REHYDRATE',
                    'auth/initializeEncryption/fulfilled', // Ignore encryption key initialization
                    'auth/updateRecipientPublicKey', // Ignore recipient key updates
                    'auth/setUserKeys', // Ignore setting user keys
                ],
                // Ignore these field paths in all actions
                ignoredActionsPaths: [
                    'meta.arg',
                    'payload.timestamp',
                    'payload.publicKey', // CryptoKey in action payload
                    'payload.privateKey', // CryptoKey in action payload
                    'payload.algorithm', // CryptoKey algorithm property
                    'payload', // UserKeys object containing CryptoKey
                    'meta.arg.axiosPrivate', // Ignore axios instance
                ],
                // Ignore these paths in the state
                ignoredPaths: [
                    'auth.userKeys', // Ignore entire userKeys object (contains CryptoKey objects)
                    'auth.userKeys.publicKey',
                    'auth.userKeys.privateKey',
                    'auth.userKeys.publicKey.algorithm',
                    'auth.userKeys.privateKey.algorithm',
                ],
            },
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
