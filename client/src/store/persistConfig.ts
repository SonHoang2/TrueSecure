import storage from 'redux-persist/lib/storage';

// Persist config for auth slice - only persist user and isAuthenticated
export const authPersistConfig = {
    key: 'auth',
    storage,
    whitelist: ['user', 'isAuthenticated'], // Only persist these fields
    blacklist: ['userKeys', 'isLoading', 'error', 'isKeysInitialized'], // Explicitly exclude these fields
};
