import { useEffect, useRef } from "react";
import { axiosPrivate } from "../api/axios";
import { useAuth } from "./useAuth";

const useAxiosPrivate = () => {
    const { refreshTokens } = useAuth();
    const debounceTimeout = useRef(null); // Reference for debounce timeout

    useEffect(() => {
        const responseIntercept = axiosPrivate.interceptors.response.use(
            response => response,
            async (error) => {
                const prevRequest = error?.config;
                if (error?.response?.status === 401 && !prevRequest?.sent) {
                    prevRequest.sent = true;

                    // Debounce logic
                    if (debounceTimeout.current) {
                        clearTimeout(debounceTimeout.current); // Clear previous timeout
                    }

                    return new Promise((resolve, reject) => {
                        debounceTimeout.current = setTimeout(async () => {
                            try {
                                await refreshTokens();
                                resolve(axiosPrivate(prevRequest)); // Retry the request
                            } catch (refreshError) {
                                reject(refreshError);
                            }
                        }, 500); // 500ms debounce duration
                    });
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivate.interceptors.response.eject(responseIntercept);
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current); // Clear timeout on unmount
            }
        };
    }, []);

    return axiosPrivate;
};

export default useAxiosPrivate;
