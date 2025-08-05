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

export async function storePrivateKey(privateKey, userId) {
    if (!userId) {
        console.error('User ID is required to store private key');
        return;
    }

    const storageKey = cryptoStorage.getPrivateKeyId(userId);
    const exportedKey = await window.crypto.subtle.exportKey('jwk', privateKey);

    await cryptoStorage.setItem(storageKey, exportedKey);
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

export async function importPrivateKey(userId) {
    if (!userId) {
        console.error('User ID is required to import private key');
        return;
    }

    const storageKey = cryptoStorage.getPrivateKeyId(userId);
    const exportedKey = await cryptoStorage.getItem(storageKey);

    if (!exportedKey) {
        console.error('No key data found for the user');
        return;
    }

    // Import the private key
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

export async function encryptAESKeys({
    recipientPublicKey,
    senderPrivateKey,
    message,
}) {
    // 1. Derive shared secret using recipient's public key and sender's private key
    const sharedSecret = await deriveSharedKey(
        senderPrivateKey,
        recipientPublicKey,
    );

    // 2. Encrypt the message
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        new TextEncoder().encode(message),
    );

    // 3. Combine IV and encrypted content into a single Uint8Array
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv, 0); // Add IV at the beginning
    combined.set(new Uint8Array(encryptedContent), iv.length); // Add encrypted content after IV

    // 4. Encode the combined data as Base64
    return arrayBufferToBase64(combined.buffer);
}

export async function decryptAESKeys({
    senderPublicKey,
    recipientPrivateKey,
    encryptedData,
}) {
    try {
        // 1. Decode the Base64 string into an ArrayBuffer
        const combined = base64ToArrayBuffer(encryptedData);

        // 2. Extract the IV (first 12 bytes) and the encrypted content (remaining bytes)
        const iv = combined.slice(0, 12); // IV is 12 bytes for AES-GCM
        const encryptedContent = combined.slice(12);

        // 3. Derive shared secret using recipient's private key and sender's public key
        const sharedSecret = await deriveSharedKey(
            recipientPrivateKey,
            senderPublicKey,
        );

        // 4. Decrypt the message
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
        ...encryptedData, // Includes encryptedContent and iv
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

// File-specific aliases (same as unified functions)
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
