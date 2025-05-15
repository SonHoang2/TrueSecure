import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as EncryptionService from '../services/encryptionService';

type EncryptionContextType = {
    publicKey: CryptoKey | null;
    privateKey: CryptoKey | null;
} | null;

const EncryptionContext = createContext<EncryptionContextType>(null);

export const EncryptionProvider = ({ children, userId, axiosPrivate }) => {
    const [userKeys, setUserKeys] = useState<EncryptionContextType>(null);

    useEffect(() => {
        EncryptionService.initialize(userId, axiosPrivate).then((privateKey) =>
            setUserKeys((prevKeys) => ({ ...prevKeys, privateKey })),
        );
    }, [userId]);

    const value = useMemo(
        () => ({
            userKeys,
            setUserKeys,
        }),
        [userKeys?.privateKey, userKeys?.publicKey],
    );

    return (
        <EncryptionContext.Provider value={value}>
            {children}
        </EncryptionContext.Provider>
    );
};

export const useEncryptionContext = () => useContext(EncryptionContext);
