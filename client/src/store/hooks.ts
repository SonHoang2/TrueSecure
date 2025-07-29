import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for specific slices
// export const useAuth = () => useAppSelector(state => state.auth);
export const useChat = () => useAppSelector((state) => state.chat);
export const useConversations = () =>
    useAppSelector((state) => state.conversations);
export const useUI = () => useAppSelector((state) => state.ui);
export const useEncryptionState = () =>
    useAppSelector((state) => state.encryption);
