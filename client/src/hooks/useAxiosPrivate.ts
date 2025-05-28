import { useEffect, useRef } from 'react';
import { axiosPrivate } from '../api/axios';
import { useAuth } from './useAuth';

let refreshPromise: Promise<void> | null = null;

const useAxiosPrivate = () => {
    const { refreshTokens } = useAuth();
    const debounceTimeout = useRef(null);

    useEffect(() => {
        const responseIntercept = axiosPrivate.interceptors.response.use(
            (response) => response,
            async (error) => {
                const prevRequest = error?.config;
                const isAuthEndpoint =
                    prevRequest?.url?.includes('/login') ||
                    prevRequest?.url?.includes('/signup') ||
                    prevRequest?.url?.includes('/refresh');

                if (
                    error?.response?.status === 401 &&
                    !prevRequest?.sent &&
                    !isAuthEndpoint
                ) {
                    prevRequest.sent = true;

                    if (!refreshPromise) {
                        refreshPromise = (async () => {
                            try {
                                await refreshTokens();
                            } finally {
                                refreshPromise = null;
                            }
                        })();
                    }

                    try {
                        await refreshPromise;
                        return axiosPrivate(prevRequest);
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            },
        );

        return () => {
            axiosPrivate.interceptors.response.eject(responseIntercept);
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    return axiosPrivate;
};

export default useAxiosPrivate;
