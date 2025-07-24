import { useAuth } from './useAuth';

export const useAuthUser = () => {
    const { user, isAuthenticated } = useAuth();

    if (!user || !isAuthenticated) {
        throw new Error('User should exist in protected route');
    }

    return user;
};
