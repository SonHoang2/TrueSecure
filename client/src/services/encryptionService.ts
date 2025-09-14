import * as cryptoUtils from '../crypto/cryptoUtils';
import { CONVERSATIONS_URL } from '../config/config';
import { AxiosInstance } from 'axios';
import { UserKey } from '../types/users.types';

interface GetGroupKeyParams {
    conversationId: number;
    userKey: UserKey;
    userId: number;
    axiosPrivate: AxiosInstance;
    deviceUuid: string;
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
    deviceUuid,
}: GetGroupKeyParams): Promise<CryptoKey> => {
    const { privateKey } = userKey;

    if (!privateKey) {
        throw new EncryptionError('User private keys are required');
    }

    if (!conversationId || !userId) {
        throw new EncryptionError('Conversation ID and User ID are required');
    }

    if (!deviceUuid) {
        throw new EncryptionError('Device UUID is required');
    }

    let groupKey = await cryptoUtils.importGroupKey({
        conversationId,
        userId,
    });

    if (groupKey) {
        return groupKey;
    }

    let response;
    try {
        response = await axiosPrivate.get(
            `${CONVERSATIONS_URL}/${conversationId}/key`,
            {
                params: { deviceUuid },
            },
        );
    } catch (apiError: any) {
        throw new EncryptionError(
            `Failed to fetch group key from server: ${
                apiError.response?.data?.message || apiError.message
            }`,
            apiError,
        );
    }

    const { encryptedGroupKey } = response.data.data || response.data;

    if (!encryptedGroupKey) {
        throw new EncryptionError(
            'No encrypted group key found for this device',
        );
    }

    let decryptedKey;
    try {
        decryptedKey = await cryptoUtils.decryptAESKeys(
            privateKey,
            encryptedGroupKey,
        );
    } catch (decryptError) {
        throw new EncryptionError(
            'Failed to decrypt group key',
            decryptError instanceof Error
                ? decryptError
                : new Error(String(decryptError)),
        );
    }

    try {
        groupKey = await cryptoUtils.importAESKey(decryptedKey);
    } catch (importError) {
        throw new EncryptionError(
            'Failed to import decrypted group key',
            importError instanceof Error
                ? importError
                : new Error(String(importError)),
        );
    }

    if (!groupKey) {
        throw new EncryptionError('Failed to import group key');
    }

    try {
        await cryptoUtils.storeGroupKey({
            conversationId,
            userId,
            groupKey,
        });
    } catch (storeError) {
        console.warn('Failed to store group key locally:', storeError);
    }

    return groupKey;
};
