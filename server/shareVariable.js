import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const roleName = Object.freeze({
    User: 'user',
    Admin: 'admin',
})

export const messageType = Object.freeze({
    Text: 'text',
    Image: 'image',
    File: 'file'
})

export const messageStatus = Object.freeze({
    Sent: 'sent',
    Delivered: 'delivered',
    Seen: 'seen'
})