export type User = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    avatar: string;
    googleAccount: boolean;
    passwordChangedAt: Date | null;
    active: boolean;
    publicKey: string | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
};

export type UserKeys = {
    publicKey: string;
    privateKey: string;
};

export type Receiver = {
    id: string;
    avatar: string;
    firstName: string;
    lastName: string;
};

export type UserStatus = {
    onlineUsers: Record<string, boolean>;
    lastSeen: Record<string, string>;
};
