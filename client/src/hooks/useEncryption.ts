import { useEffect, useState } from 'react';
import * as cryptoUtils from '../utils/cryptoUtils';
import { CONVERSATIONS_URL, USERS_URL, ROLE } from '../config/config';

export const useEncryption = ({ userId, axiosPrivate }) => {
    type UserKeys = {
        publicKey: CryptoKey | null;
        privateKey: CryptoKey | null;
    };

    const [userKeys, setUserKeys] = useState<UserKeys>({
        publicKey: null,
        privateKey: null,
    });

    const getAdminPublicKey = async (convParticipants) => {
        try {
            if (!convParticipants) {
                console.error("Conversation participants not found!");
                return;
            }

            const adminId = convParticipants.find(participant => participant.role === ROLE.ADMIN).userId;

            const res = await axiosPrivate.get(USERS_URL + `/${adminId}/public-key`);
            const { publicKey: exportedPublicKey } = res.data.data;

            if (!exportedPublicKey) {
                console.error("Public key not found!");
                return;
            }

            const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);
            return publicKey;
        } catch (error) {
            console.error("Error getting Admin public key:", error);
        }
    }

    const getUserPublicKey = async (receiver) => {
        try {
            if (!receiver) {
                console.error("Receiver not found!");
                return;
            }

            const res = await axiosPrivate.get(USERS_URL + `/${receiver}/public-key`);
            const { publicKey: exportedPublicKey } = res.data.data;

            if (!exportedPublicKey) {
                console.error("Public key not found!");
                return;
            }

            const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);

            return publicKey;
        } catch (error) {
            console.error("Error getting User public key:", error);
        }
    }

    const getPrivateKey = async () => {
        try {
            let privateKey = userKeys.privateKey;
            if (!privateKey) {
                privateKey = await cryptoUtils.importPrivateKey(userId);
            }

            return privateKey;
        }
        catch (error) {
            console.error("Error getting private key:", error);
        }
    };

    const getGroupKey = async (conversationId) => {
        try {
            const { publicKey, privateKey } = userKeys;

            if (!publicKey || !privateKey) {
                console.error("Public key or private key is missing!");
                return;
            }

            let groupKey = await cryptoUtils.importGroupKey({ conversationId, userId });

            if (!groupKey) {
                const res = await axiosPrivate.get(CONVERSATIONS_URL + `/${conversationId}/key`);

                const { groupKey: exportedEncryptedKey } = res.data.data;

                const exportedKey = await cryptoUtils.decryptAESKeys({
                    senderPublicKey: publicKey,
                    recipientPrivateKey: privateKey,
                    encryptedData: exportedEncryptedKey,
                });

                groupKey = await cryptoUtils.importAESKey(exportedKey);

                await cryptoUtils.storeGroupKey({ conversationId, userId, groupKey });
            }

            return groupKey;
        }
        catch (error) {
            console.error("Error getting group key:", error);
        }
    }

    useEffect(() => {
        const initializeKeys = async () => {
            try {
                const { privateKey, publicKey } = await cryptoUtils.generateECDHKeys();

                const exportedPublicKey = await cryptoUtils.exportPublicKey(publicKey);

                await cryptoUtils.storePrivateKey(privateKey, userId);

                await axiosPrivate.post(USERS_URL + "/public-key", {
                    publicKey: exportedPublicKey,
                });
            } catch (error) {
                console.error("Error initializing key:", error);
            }
        };

        if (!cryptoUtils.hasPrivateKey(userId)) {
            initializeKeys();
        }
    }, [])

    return { userKeys, setUserKeys, getPrivateKey, getAdminPublicKey, getUserPublicKey, getGroupKey };
};