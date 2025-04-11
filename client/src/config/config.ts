export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL;
export const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const IMAGES_URL = `${SERVER_URL}/images`;
export const AUTH_URL = "/api/v1/auth";
export const USERS_URL = "/api/v1/users";
export const CONVERSATIONS_URL = "/api/v1/conversations";

export const MESSAGE_STATUS = Object.freeze({
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    SEEN: 'seen'
});

export const ROUTES = Object.freeze({
    SIGN_UP: "/auth/signup",
    LOGIN: "/auth/login",
    CHAT: "/chat",
})

export const ROLE = Object.freeze({
    ADMIN: 'admin',
    MEMBER: 'member'
});