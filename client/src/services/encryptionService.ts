import * as cryptoUtils from '../crypto/cryptoUtils';
import { CONVERSATIONS_URL } from '../config/config';
import { AxiosInstance } from 'axios';
import { UserKey } from '../types/users.types';

interface GetGroupKeyParams {
    conversationId: number;
    userKey: UserKey;
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

export const initializeUserKey = async (): Promise<{
    privateKey: CryptoKey;
    publicKey: string;
}> => {
    try {
        const { privateKey, publicKey } = await cryptoUtils.generateECDHKeys();

        const exportedPublicKey = await cryptoUtils.exportPublicKey(publicKey);

        await cryptoUtils.storePrivateKey(privateKey);

        return { privateKey, publicKey: exportedPublicKey };
    } catch (error) {
        throw new EncryptionError(
            'Failed to initialize encryption keys',
            error instanceof Error ? error : new Error(String(error)),
        );
    }
};

export const getGroupKey = async ({
    conversationId,
    userKey,
    userId,
    axiosPrivate,
}: GetGroupKeyParams): Promise<CryptoKey> => {
    const { privateKey } = userKey;

    if (!privateKey) {
        throw new EncryptionError('User private keys are required');
    }

    if (!conversationId || !userId) {
        throw new EncryptionError('Conversation ID and User ID are required');
    }

    try {
        let groupKey = await cryptoUtils.importGroupKey({
            conversationId,
            userId,
        });

        if (!groupKey) {
            const response = await axiosPrivate.get(
                `${CONVERSATIONS_URL}/${conversationId}/key`,
            );

            const { groupKey: exportedEncryptedKey, adminPublicKey } =
                response.data.data;

            if (!exportedEncryptedKey) {
                throw new EncryptionError(
                    'Encrypted group key not found on server',
                );
            }

            // Decrypt the group key
            const exportedKey = await cryptoUtils.decryptAESKeys(
                privateKey,
                exportedEncryptedKey,
            );

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
