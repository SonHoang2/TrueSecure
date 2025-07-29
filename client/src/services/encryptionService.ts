import * as cryptoUtils from '../utils/cryptoUtils';
import { CONVERSATIONS_URL, USERS_URL } from '../config/config';
import { ChatGroupRole } from '../enums/chat-role.enum';
import { AxiosInstance } from 'axios';
import { User, UserKeys } from '../types/users.types';

interface GetGroupKeyParams {
    conversationId: number;
    userKeys: UserKeys;
    userId: number;
    axiosPrivate: AxiosInstance;
}

class EncryptionError extends Error {
    constructor(
        message: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = 'EncryptionError';
    }
}

class PublicKeyNotFoundError extends EncryptionError {
    constructor(userId?: number) {
        super(`Public key not found${userId ? ` for user ${userId}` : ''}`);
        this.name = 'PublicKeyNotFoundError';
    }
}

class AdminNotFoundError extends EncryptionError {
    constructor() {
        super('Admin participant not found in conversation');
        this.name = 'AdminNotFoundError';
    }
}

export const initialize = async (
    userId: number,
    axiosPrivate: AxiosInstance,
): Promise<CryptoKey> => {
    try {
        let privateKey = await cryptoUtils.importPrivateKey(userId);

        if (!privateKey) {
            const { privateKey: newPrivateKey, publicKey } =
                await cryptoUtils.generateECDHKeys();

            const exportedPublicKey =
                await cryptoUtils.exportPublicKey(publicKey);

            await cryptoUtils.storePrivateKey(newPrivateKey, userId);

            await axiosPrivate.post(USERS_URL + '/public-key', {
                publicKey: exportedPublicKey,
            });

            privateKey = newPrivateKey;
        }

        return privateKey;
    } catch (error) {
        throw new EncryptionError(
            'Failed to initialize encryption keys',
            error instanceof Error ? error : new Error(String(error)),
        );
    }
};

export const getAdminPublicKey = async (
    participants: User[],
    axiosPrivate: AxiosInstance,
): Promise<CryptoKey> => {
    if (!participants || participants.length === 0) {
        throw new EncryptionError('Conversation participants not found');
    }

    const admin = participants.find(
        (participant) => participant.role === ChatGroupRole.ADMIN,
    );

    if (!admin) {
        throw new AdminNotFoundError();
    }

    try {
        const response = await axiosPrivate.get(
            `${USERS_URL}/${admin.id}/public-key`,
        );

        const { publicKey: exportedPublicKey } = response.data.data;

        if (!exportedPublicKey) {
            throw new PublicKeyNotFoundError(admin.id);
        }

        return await cryptoUtils.importPublicKey(exportedPublicKey);
    } catch (error) {
        if (error instanceof EncryptionError) {
            throw error;
        }
        throw new EncryptionError(
            `Failed to get admin public key for user ${admin.id}`,
            error instanceof Error ? error : new Error(String(error)),
        );
    }
};

export const getUserPublicKey = async (
    userId: number,
    axiosPrivate: AxiosInstance,
): Promise<CryptoKey> => {
    if (!userId) {
        throw new EncryptionError('User ID is required');
    }

    try {
        const response = await axiosPrivate.get(
            `${USERS_URL}/${userId}/public-key`,
        );
        const { publicKey: exportedPublicKey } = response.data.data;

        if (!exportedPublicKey) {
            throw new PublicKeyNotFoundError(userId);
        }

        return await cryptoUtils.importPublicKey(exportedPublicKey);
    } catch (error) {
        if (error instanceof EncryptionError) {
            throw error;
        }
        throw new EncryptionError(
            `Failed to get public key for user ${userId}`,
            error instanceof Error ? error : new Error(String(error)),
        );
    }
};

export const getGroupKey = async ({
    conversationId,
    userKeys,
    userId,
    axiosPrivate,
}: GetGroupKeyParams): Promise<CryptoKey> => {
    const { publicKey, privateKey } = userKeys;

    if (!publicKey || !privateKey) {
        throw new EncryptionError(
            'User keys (public and private) are required',
        );
    }

    console.log(
        'Getting group key for conversation:',
        conversationId,
        'and user:',
        userId,
    );

    if (!conversationId || !userId) {
        throw new EncryptionError('Conversation ID and User ID are required');
    }

    try {
        // Try to get cached group key first
        let groupKey = await cryptoUtils.importGroupKey({
            conversationId,
            userId,
        });

        if (!groupKey) {
            // Fetch encrypted group key from server
            const response = await axiosPrivate.get(
                `${CONVERSATIONS_URL}/${conversationId}/key`,
            );

            const { groupKey: exportedEncryptedKey } = response.data.data;

            if (!exportedEncryptedKey) {
                throw new EncryptionError(
                    'Encrypted group key not found on server',
                );
            }

            // Decrypt the group key
            const exportedKey = await cryptoUtils.decryptAESKeys({
                senderPublicKey: publicKey,
                recipientPrivateKey: privateKey,
                encryptedData: exportedEncryptedKey,
            });

            // Import and cache the group key
            groupKey = await cryptoUtils.importAESKey(exportedKey);

            await cryptoUtils.storeGroupKey({
                conversationId,
                userId,
                groupKey,
            });
        }

        if (!groupKey) {
            throw new EncryptionError('Failed to obtain or decrypt group key');
        }

        return groupKey;
    } catch (error) {
        if (error instanceof EncryptionError) {
            throw error;
        }
        throw new EncryptionError(
            `Failed to get group key for conversation ${conversationId}`,
            error instanceof Error ? error : new Error(String(error)),
        );
    }
};
