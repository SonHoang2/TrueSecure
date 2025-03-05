export const CLIENT_URL = process.env.REACT_APP_CLIENT_URL;
export const SERVER_URL = process.env.REACT_APP_SERVER_URL;
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
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
})