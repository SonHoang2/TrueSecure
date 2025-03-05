import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const ROLE_NAME = Object.freeze({
    USER: 'user',
    ADMIN: 'admin',
});

export const MESSAGE_TYPE = Object.freeze({
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file',
});

export const MESSAGE_STATUS = Object.freeze({
    SENT: 'sent',
    DELIVERED: 'delivered',
    SEEN: 'seen',
});
