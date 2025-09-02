import { cryptoStorage } from './cryptoStorage';

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, bytes));
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function exportPublicKey(publicKey) {
    // Export the public key in SPKI format
    const exportedKey = await window.crypto.subtle.exportKey('spki', publicKey);

    // Convert the exported key (ArrayBuffer) to Base64
    const base64Key = arrayBufferToBase64(exportedKey);

    return base64Key;
}

export async function importPublicKey(base64Key) {
    // Convert Base64 to ArrayBuffer
    const arrayBuffer = base64ToArrayBuffer(base64Key);

    // Import the public key
    return await window.crypto.subtle.importKey(
        'spki', // Format of the key
        arrayBuffer,
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true, // Key is exportable
        [], // No additional usages for public key
    );
}

export async function storePrivateKey(privateKey) {
    const storageKey = cryptoStorage.getPrivateKeyId();
    const exportedKey = await window.crypto.subtle.exportKey('jwk', privateKey);

    await cryptoStorage.setItem(storageKey, exportedKey);
}

export async function removePrivateKey() {
    const storageKey = cryptoStorage.getPrivateKeyId();
    await cryptoStorage.removeItem(storageKey);
}

export async function exportAESKey(key) {
    try {
        const exportedKey = await window.crypto.subtle.exportKey('raw', key);
        const exportedKeyBase64 = btoa(
            String.fromCharCode(...new Uint8Array(exportedKey)),
        );
        return exportedKeyBase64;
    } catch (error) {
        console.error('Error exporting key:', error);
    }
}

export async function importAESKey(base64Key) {
    try {
        const keyData = Uint8Array.from(atob(base64Key), (c) =>
            c.charCodeAt(0),
        );

        console.log('keyData: ', keyData);

        const key = await window.crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt'],
        );
        return key;
    } catch (error) {
        console.error('Error importing key:', error);
    }
}

export async function storeGroupKey({ conversationId, userId, groupKey }) {
    if (!userId || !conversationId) {
        console.error(
            'User ID and conversationId are required to store group key',
        );
        return;
    }

    const storageKey = cryptoStorage.getGroupKeyId(userId, conversationId);
    const exportedKey = await window.crypto.subtle.exportKey('jwk', groupKey);

    await cryptoStorage.setItem(storageKey, exportedKey);
}

export async function importPrivateKey() {
    const storageKey = cryptoStorage.getPrivateKeyId();
    const exportedKey = await cryptoStorage.getItem(storageKey);

    if (!exportedKey) {
        console.error('No key data found for the user');
        return;
    }

    const privateKey = await window.crypto.subtle.importKey(
        'jwk', // Format of the key
        exportedKey,
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true, // Key is exportable
        ['deriveKey'], // Key usages
    );

    return privateKey;
}

export async function importGroupKey({ conversationId, userId }) {
    if (!userId || !conversationId) {
        console.warn(
            'User ID and conversationId are required to import group key',
        );
        return;
    }

    const storageKey = cryptoStorage.getGroupKeyId(userId, conversationId);
    const exportedKey = await cryptoStorage.getItem(storageKey);

    if (!exportedKey) {
        console.warn('No key data found for the conversation');
        return;
    }

    const groupKey = await window.crypto.subtle.importKey(
        'jwk',
        exportedKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt'],
    );

    return groupKey;
}

async function deriveSharedKey(privateKey, publicKey) {
    return await window.crypto.subtle.deriveKey(
        {
            name: 'ECDH',
            public: publicKey,
        },
        privateKey,
        { name: 'AES-GCM', length: 256 }, // Derive AES key
        true,
        ['encrypt', 'decrypt'],
    );
}

export async function generateECDHKeys() {
    return await window.crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256', // Use P-256 instead of X25519
        },
        true, // Key is exportable
        ['deriveKey'], // Allow key derivation
    );
}

export async function generateAesKey() {
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    );
    return key;
}

export async function encryptAESKeys(recipientPublicKey, message) {
    // 1. Generate ephemeral key pair for this encryption
    const ephemeralKeyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey'],
    );

    // 2. Derive shared secret using ephemeral private key and recipient's public key
    const sharedSecret = await deriveSharedKey(
        ephemeralKeyPair.privateKey,
        recipientPublicKey,
    );

    // 3. Encrypt the message
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        new TextEncoder().encode(message),
    );

    // 4. Export ephemeral public key
    const exportedEphemeralPublicKey = await crypto.subtle.exportKey(
        'raw',
        ephemeralKeyPair.publicKey,
    );

    // 5. Combine ephemeral public key, IV and encrypted content
    const ephemeralPubKeyArray = new Uint8Array(exportedEphemeralPublicKey);
    const combined = new Uint8Array(
        ephemeralPubKeyArray.length + iv.length + encryptedContent.byteLength,
    );
    combined.set(ephemeralPubKeyArray, 0); // Add ephemeral public key at the beginning
    combined.set(iv, ephemeralPubKeyArray.length); // Add IV after public key
    combined.set(
        new Uint8Array(encryptedContent),
        ephemeralPubKeyArray.length + iv.length,
    ); // Add encrypted content

    // 6. Encode the combined data as Base64
    return arrayBufferToBase64(combined.buffer);
}

export async function decryptAESKeys(recipientPrivateKey, encryptedData) {
    try {
        // 1. Decode the Base64 string into an ArrayBuffer
        const combined = base64ToArrayBuffer(encryptedData);

        // 2. Extract the ephemeral public key (first 65 bytes for P-256 raw format), IV (next 12 bytes) and encrypted content
        const ephemeralPublicKeyBytes = combined.slice(0, 65); // 65 bytes for P-256 raw format
        const iv = combined.slice(65, 77); // IV is 12 bytes for AES-GCM
        const encryptedContent = combined.slice(77);

        // 3. Import the ephemeral public key
        const ephemeralPublicKey = await crypto.subtle.importKey(
            'raw',
            ephemeralPublicKeyBytes,
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            [],
        );

        // 4. Derive shared secret using recipient's private key and ephemeral public key
        const sharedSecret = await deriveSharedKey(
            recipientPrivateKey,
            ephemeralPublicKey,
        );

        // 5. Decrypt the message
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            sharedSecret,
            encryptedContent,
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Error decrypting AES keys:', error);
    }
}

// Unified encryption function that handles both text and binary data
async function encryptData(key, data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Handle both string and ArrayBuffer/binary data
    const dataToEncrypt =
        typeof data === 'string' ? new TextEncoder().encode(data) : data;

    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataToEncrypt,
    );

    return {
        encryptedContent: arrayBufferToBase64(encryptedContent),
        iv: arrayBufferToBase64(iv.buffer),
    };
}

// Unified decryption function - returns ArrayBuffer (caller decides if text or binary)
async function decryptData(key, encryptedData) {
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToArrayBuffer(encryptedData.iv) },
        key,
        base64ToArrayBuffer(encryptedData.content),
    );

    return decrypted; // Return ArrayBuffer - caller converts to string if needed
}

// Unified private message encryption that handles both text and binary data
export async function encryptPrivateData(recipientPublicKey, data) {
    const ephemeralKeyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey'],
    );

    const sharedSecret = await deriveSharedKey(
        ephemeralKeyPair.privateKey,
        recipientPublicKey,
    );

    const encryptedData = await encryptData(sharedSecret, data);

    const exportedEphemeralPublicKey = await crypto.subtle.exportKey(
        'raw',
        ephemeralKeyPair.publicKey,
    );

    return {
        ...encryptedData,
        ephemeralPublicKey: arrayBufferToBase64(exportedEphemeralPublicKey),
    };
}

// Unified private message decryption - returns ArrayBuffer
export async function decryptPrivateData(privateKey, encryptedData) {
    const ephemeralPublicKey = await crypto.subtle.importKey(
        'raw',
        base64ToArrayBuffer(encryptedData.ephemeralPublicKey),
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        [],
    );

    const sharedSecret = await deriveSharedKey(privateKey, ephemeralPublicKey);

    return await decryptData(sharedSecret, encryptedData);
}

// Unified group message encryption that handles both text and binary data
export async function encryptGroupData(groupKey, data) {
    return await encryptData(groupKey, data);
}

// Unified group message decryption - returns ArrayBuffer
export async function decryptGroupData(groupKey, encryptedData) {
    return await decryptData(groupKey, encryptedData);
}

// Legacy wrappers for backward compatibility
export async function encryptPrivateMessage(recipientPublicKey, message) {
    return await encryptPrivateData(recipientPublicKey, message);
}

export async function decryptPrivateMessage(privateKey, encryptedData) {
    const decrypted = await decryptPrivateData(privateKey, encryptedData);
    return new TextDecoder().decode(decrypted);
}

export async function encryptGroupMessage(groupKey, message) {
    return await encryptGroupData(groupKey, message);
}

export async function decryptGroupMessage(groupKey, encryptedData) {
    const decrypted = await decryptGroupData(groupKey, encryptedData);
    return new TextDecoder().decode(decrypted);
}

export async function encryptPrivateFile(recipientPublicKey, arrayBuffer) {
    return await encryptPrivateData(recipientPublicKey, arrayBuffer);
}

export async function decryptPrivateFile(privateKey, encryptedData) {
    return await decryptPrivateData(privateKey, encryptedData);
}

export async function encryptGroupFile(groupKey, arrayBuffer) {
    return await encryptGroupData(groupKey, arrayBuffer);
}

export async function decryptGroupFile(groupKey, encryptedData) {
    return await decryptGroupData(groupKey, encryptedData);
}

export async function getDeviceUuid(): Promise<string | null> {
    return await cryptoStorage.getItem('deviceUuid');
}

export async function setDeviceUuid(uuid: string): Promise<void> {
    await cryptoStorage.setItem('deviceUuid', uuid);
}

export async function clearDeviceUuid(): Promise<void> {
    await cryptoStorage.removeItem('deviceUuid');
}
