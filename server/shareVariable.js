import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const roleName = {
    User: 'user',
    Admin: 'admin',
}

export const messageType = {
    Text: 'text',
    Image: 'image',
    File: 'file'
}

export const messageStatus = {
    Sent: 'sent',
    Delivered: 'delivered',
    Seen: 'seen'
}