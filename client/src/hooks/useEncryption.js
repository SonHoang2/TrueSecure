import { useEffect, useState } from 'react';
import * as cryptoUtils from '../utils/cryptoUtils';
import { USERS_URL } from '../config/config';

export const useEncryption = ({ userId, axiosPrivate }) => {
    const [userKeys, setUserKeys] = useState({
        publicKey: null,
        privateKey: null,
    });

    async function getPublicKey (receiverId){
        try {
            const res = await axiosPrivate.get(USERS_URL + `/${receiverId}/public-key`);
            const { publicKey: exportedPublicKey } = res.data.data;

            if (!exportedPublicKey) {
                console.error("Public key not found!");
                setUserKeys(prev => ({ ...prev, publicKey: null }));
                return;
            }

            const publicKey = await cryptoUtils.importPublicKey(exportedPublicKey);

            setUserKeys(prev => ({ ...prev, publicKey }));
        }
        catch (error) {
            console.error("Error getting public key:", error);
        }
    };


    const getPrivateKey = async () => {
        try {
            let privateKey = userKeys.privateKey;
            if (!privateKey) {
                privateKey = await cryptoUtils.importPrivateKey(userId);
            }
            setUserKeys(prev => ({ ...prev, privateKey }));

            return privateKey;
        }
        catch (error) {
            console.error("Error getting private key:", error);
        }
    };

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

    return { userKeys, setUserKeys, getPrivateKey, getPublicKey };
};