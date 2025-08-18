export type User = {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    avatar: string;
    googleAccount: boolean;
    passwordChangedAt: Date | null;
    active: boolean;
    publicKey: string | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
    role: string;
};

export type UserKeys = {
    publicKey: CryptoKey | null;
    privateKey: CryptoKey | null;
};

export type UserKeysExported = {
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
