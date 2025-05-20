import { User } from '../../types/users.types';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface SignupCredentials {
    email: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
}

export interface AuthContextType {
    user: User | null;
    login(credentials: LoginCredentials): Promise<void>;
    signup(credentials: SignupCredentials): Promise<void>;
    logout(): Promise<void>;
    getGoogleCode(): void;
    sendGoogleCode(code: string): Promise<void>;
    refreshTokens(): Promise<void>;
}

export interface AuthProviderProps {
    children: React.ReactNode;
}
