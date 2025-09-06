import { AxiosError } from 'axios';

export const extractErrorMessage = (
    error: unknown,
    fallback = 'Something went wrong',
): string => {
    // If error is already a string (from rejectWithValue), return it
    if (typeof error === 'string') {
        return error;
    }

    // Handle Axios errors
    if (error instanceof AxiosError) {
        return error.response?.data?.message || fallback;
    }

    // Handle generic Error objects
    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};
