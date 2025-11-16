import * as cryptoUtils from '../crypto/cryptoUtils';
import { CONVERSATIONS_URL, USERS_URL } from '../config/config';
import { AxiosInstance } from 'axios';
import { User, UserKey } from '../types/users.types';

interface GetGroupKeyParams {
    conversationId: number;
    userKey: UserKey;
    userId: number;
    axiosPrivate: AxiosInstance;
    deviceUuid: string;
    currentGroupEpoch: number;
}

export interface UserDevice {
    deviceUuid: string;
    publicKey: string;
}

export const initializeUserKey = async () => {
    try {
        const { privateKey, publicKey } = await cryptoUtils.generateECDHKeys();

        const exportedPublicKey = await cryptoUtils.exportPublicKey(publicKey);

        await cryptoUtils.storePrivateKey(privateKey);

        return { privateKey, publicKey: exportedPublicKey };
    } catch (error) {
        console.error('Failed to initialize encryption keys', error);
    }
};

export const getGroupKey = async ({
    conversationId,
    userKey,
    userId,
    axiosPrivate,
    deviceUuid,
    currentGroupEpoch,
}: GetGroupKeyParams) => {
    const { privateKey } = userKey;

    if (!privateKey) throw new Error('User private keys are required');
    if (!conversationId || !userId)
        throw new Error('Conversation ID and User ID are required');
    if (!deviceUuid) throw new Error('Device UUID is required');
    if (!currentGroupEpoch) throw new Error('Current Group Epoch is required');

    let groupKey = await cryptoUtils.importGroupKey({
        conversationId,
    });

    let localEpoch = await cryptoUtils.getLocalGroupEpoch(conversationId);

    console.log(
        'Local Epoch:',
        localEpoch,
        'Current Group Epoch:',
        currentGroupEpoch,
    );

    if (groupKey && currentGroupEpoch === localEpoch) return groupKey;

    let response;
    try {
        response = await axiosPrivate.get(
            `${CONVERSATIONS_URL}/${conversationId}/key`,
            {
                params: { deviceUuid },
            },
        );
    } catch (apiError: any) {
        console.error(
            `Failed to fetch group key from server: ${
                apiError.response?.data?.message || apiError.message
            }`,
            apiError,
        );
    }

    if (!response || !response.data) {
        console.error('Server did not return a valid response');
        return;
    }

    const { encryptedGroupKey, groupEpoch: newGroupEpoch } =
        response.data.data || response.data;

    if (!encryptedGroupKey) {
        console.error('No encrypted group key found in server response');
        return;
    }

    let decryptedKey;
    try {
        decryptedKey = await cryptoUtils.decryptAESKeys(
            privateKey,
            encryptedGroupKey,
        );
    } catch (decryptError) {
        console.error('Failed to decrypt group key');
        return;
    }

    try {
        groupKey = await cryptoUtils.importAESKey(decryptedKey);
    } catch (error) {
        console.error('Failed to import decrypted group key');
    }

    if (!groupKey) {
        console.error('Failed to import group key');
        return;
    }

    try {
        await cryptoUtils.storeGroupKey({
            conversationId,
            groupKey,
        });

        await cryptoUtils.storeLocalGroupEpoch(conversationId, newGroupEpoch);

        await axiosPrivate.patch(
            `${CONVERSATIONS_URL}/${conversationId}/confirm-key`,
            {},
            {
                headers: { 'x-device-uuid': deviceUuid },
            },
        );
    } catch (storeError) {
        console.warn('Failed to store group key locally:', storeError);
    }
    return groupKey;
};

export async function distributeGroupKeys(params: {
    conversationId: number;
    members: User[];
    publicKeys: Map<number, { deviceUuid: string; publicKey: string }[]>;
    axiosPrivate: AxiosInstance;
}) {
    const { conversationId, members, publicKeys, axiosPrivate } = params;

    const aesKey = await cryptoUtils.generateAesKey();

    const encryptedPayloads: {
        deviceUuid: string;
        encryptedGroupKey: string;
    }[] = [];

    for (const participant of members) {
        const devices = publicKeys.get(participant.id);
        if (!devices) continue;

        for (const device of devices) {
            const recipientPublicKey = await cryptoUtils.importPublicKey(
                device.publicKey,
            );
            const exportedAESKey = await cryptoUtils.exportAESKey(aesKey);
            const encryptedAesKey = await cryptoUtils.encryptAESKeys(
                recipientPublicKey,
                exportedAESKey,
            );

            encryptedPayloads.push({
                deviceUuid: device.deviceUuid,
                encryptedGroupKey: encryptedAesKey,
            });
        }
    }

    try {
        await axiosPrivate.post(CONVERSATIONS_URL + `/keys`, {
            conversationId,
            encryptedKeys: encryptedPayloads,
        });

        await cryptoUtils.storeGroupKey({
            conversationId,
            groupKey: aesKey,
        });
    } catch (error) {
        console.error('Error distributing group keys:', error);

        console.error(
            'Failed to distribute group keys to server',
            error instanceof Error ? error : new Error(String(error)),
        );
    }
}

export const getUserPublicKeys = async ({
    axiosPrivate,
    userIds,
}: any): Promise<Map<number, UserDevice[]>> => {
    const publicKeys = new Map<number, UserDevice[]>();

    for (const userId of userIds) {
        try {
            const res = await axiosPrivate.get(
                `${USERS_URL}/${userId}/public-keys`,
            );
            const devices = res.data?.data?.devices;

            if (!devices || devices.length === 0) {
                throw new Error(
                    `User ${userId} doesn't have any public keys/devices.`,
                );
            }

            publicKeys.set(userId, devices);
        } catch (error: any) {
            if (error.response?.status === 404) {
                throw new Error(
                    `User ${userId} doesn't have any public keys/devices.`,
                );
            }
            throw error;
        }
    }

    return publicKeys;
};

export const validateUserKeys = async ({
    members,
    axiosPrivate,
}: {
    members: User[];
    axiosPrivate: AxiosInstance;
}) => {
    const userIds = members.map((m) => m.id);
    return await getUserPublicKeys({ userIds, axiosPrivate });
};
