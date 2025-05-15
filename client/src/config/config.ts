export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL;
export const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const AUTH_URL = '/api/v1/auth';
export const USERS_URL = '/api/v1/users';
export const CONVERSATIONS_URL = '/api/v1/conversations';

export enum MESSAGE_STATUS {
    SENDING = 'sending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    SEEN = 'seen',
}

export enum ROUTES {
    SIGN_UP = '/auth/signup',
    LOGIN = '/auth/login',
    CHAT = '/chat',
}

export enum ROLE {
    ADMIN = 'admin',
    MEMBER = 'member',
}
