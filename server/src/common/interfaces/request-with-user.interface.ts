import { Request } from 'express';

interface User {
    id: number;
}

export interface RequestWithUser extends Request {
    user: User;
    deviceUuid?: string;
}
