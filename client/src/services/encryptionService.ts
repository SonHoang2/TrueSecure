import * as cryptoUtils from '../utils/cryptoUtils';
import { CONVERSATIONS_URL, USERS_URL } from '../config/config';
import { ChatGroupRole } from '../enums/chat-role.enum';

export const initialize = async (userId, axiosPrivate) => {
    try {
        let privateKey = await cryptoUtils.importPrivateKey(userId);

        if (!privateKey) {
            const { privateKey, publicKey } =
                await cryptoUtils.generateECDHKeys();

            const exportedPublicKey =
                await cryptoUtils.exportPublicKey(publicKey);

            await cryptoUtils.storePrivateKey(privateKey, userId);

            await axiosPrivate.post(USERS_URL + '/public-key', {
                publicKey: exportedPublicKey,
            });
            return privateKey;
        }

        return privateKey;
    } catch (error) {
        console.error('Error initializing key:', error);
    }
};

export const getAdminPublicKey = async (convParticipants, axiosPrivate) => {
    try {
        if (!convParticipants) {
            console.error('Conversation participants not found!');
            return;
        }

        const adminId = convParticipants.find(
            (participant) => participant.role === ChatGroupRole.ADMIN,
        ).userId;

        const res = await axiosPrivate.get(
            USERS_URL + `/${adminId}/public-key`,
        );
        const { publicKey: exportedPublicKey } = res.data.data;

        if (!exportedPublicKey) {
            console.error('Public key not found!');
            return;
        }

        const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);
        return publicKey;
    } catch (error) {
        console.error('Error getting Admin public key:', error);
    }
};

export const getUserPublicKey = async (userId, axiosPrivate) => {
    try {
        if (!userId) {
            console.error('userId not found!');
            return;
        }

        const res = await axiosPrivate.get(USERS_URL + `/${userId}/public-key`);
        const { publicKey: exportedPublicKey } = res.data.data;

        if (!exportedPublicKey) {
            console.error('Public key not found!');
            return;
        }

        const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);

        return publicKey;
    } catch (error) {
        console.error('Error getting User public key:', error);
    }
};

export const getGroupKey = async ({
    conversationId,
    userKeys,
    userId,
    axiosPrivate,
}) => {
    try {
        const { publicKey, privateKey } = userKeys;
        
        if (!publicKey || !privateKey) {
            console.error('Public key or private key is missing!');
            return;
        }

        let groupKey = await cryptoUtils.importGroupKey({
            conversationId,
            userId,
        });

        if (!groupKey) {
            const res = await axiosPrivate.get(
                CONVERSATIONS_URL + `/${conversationId}/key`,
            );

            const { groupKey: exportedEncryptedKey } = res.data.data;

            const exportedKey = await cryptoUtils.decryptAESKeys({
                senderPublicKey: publicKey,
                recipientPrivateKey: privateKey,
                encryptedData: exportedEncryptedKey,
            });

            groupKey = await cryptoUtils.importAESKey(exportedKey);

            await cryptoUtils.storeGroupKey({
                conversationId,
                userId,
                groupKey,
            });
        }

        return groupKey;
    } catch (error) {
        console.error('Error getting group key:', error);
    }
};
