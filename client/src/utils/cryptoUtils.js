// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
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

export async function generateRSAKeys() {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptMessage(recipientPublicKey, message) {
    // Generate AES key
    const aesKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // Encrypt message
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(message)
    );

    // Encrypt AES key with RSA
    const exportedAesKey = await crypto.subtle.exportKey("raw", aesKey);
    const encryptedAesKey = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        recipientPublicKey,
        exportedAesKey
    );

    return {
        content: arrayBufferToBase64(encryptedContent),
        key: arrayBufferToBase64(encryptedAesKey),
        iv: arrayBufferToBase64(iv)
    };
}

export async function decryptMessage(privateKey, encryptedData) {
    // Decrypt AES key
    const aesKeyBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToArrayBuffer(encryptedData.key)
    );

    // Import AES key
    const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        { name: "AES-GCM" },
        true,
        ["decrypt"]
    );

    // Decrypt content
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToArrayBuffer(encryptedData.iv)
        },
        aesKey,
        base64ToArrayBuffer(encryptedData.content)
    );

    return new TextDecoder().decode(decrypted);
}
