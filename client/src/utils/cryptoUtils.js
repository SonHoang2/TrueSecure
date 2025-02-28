export async function generateECDHKeys() {
    return await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256", // Use P-256 instead of X25519
        },
        true, // Key is exportable
        ["deriveKey"] // Allow key derivation
    );
}

export async function encryptMessage(recipientPublicKey, message) {
    // 1. Generate ephemeral ECDH key pair for this session
    const ephemeralKeyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );

    // 2. Derive shared secret using recipient's public key
    const sharedSecret = await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: recipientPublicKey,
        },
        ephemeralKeyPair.privateKey,
        { name: "AES-GCM", length: 256 }, // Derive AES key
        true,
        ["encrypt"]
    );

    // 3. Encrypt the message
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedSecret,
        new TextEncoder().encode(message)
    );

    // 4. Export ephemeral public key to send to recipient
    const exportedEphemeralPublicKey = await crypto.subtle.exportKey(
        "raw",
        ephemeralKeyPair.publicKey
    );

    return {
        content: arrayBufferToBase64(encryptedContent),
        iv: arrayBufferToBase64(iv.buffer),
        ephemeralPublicKey: arrayBufferToBase64(exportedEphemeralPublicKey)
    };
}

export async function decryptMessage(privateKey, encryptedData) {
    // 1. Import sender's ephemeral public key
    const ephemeralPublicKey = await crypto.subtle.importKey(
        "raw",
        base64ToArrayBuffer(encryptedData.ephemeralPublicKey),
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    // 2. Derive shared secret using recipient's private key
    const sharedSecret = await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: ephemeralPublicKey,
        },
        privateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["decrypt"]
    );

    // 3. Decrypt the message
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToArrayBuffer(encryptedData.iv) },
        sharedSecret,
        base64ToArrayBuffer(encryptedData.content)
    );

    return new TextDecoder().decode(decrypted);
}


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
    const exportedKey = await window.crypto.subtle.exportKey("spki", publicKey);

    // Convert the exported key (ArrayBuffer) to Base64
    const base64Key = arrayBufferToBase64(exportedKey);

    return base64Key;
}

export async function importPublicKey(base64Key) {
    // Convert Base64 to ArrayBuffer
    const arrayBuffer = base64ToArrayBuffer(base64Key);

    // Import the public key
    return await window.crypto.subtle.importKey(
        "spki", // Format of the key
        arrayBuffer,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true, // Key is exportable
        [] // No additional usages for public key
    );
}

export async function exportAndStorePrivateKey(privateKey) {
    // Export the private key in JWK format (or PKCS8 if preferred)
    const exportedKey = await window.crypto.subtle.exportKey("jwk", privateKey);

    // Convert the exported key to a string and store it in localStorage
    localStorage.setItem("privateKey", JSON.stringify(exportedKey));
    console.log("Private key stored in localStorage.");
}

export async function retrieveAndImportPrivateKey() {
    // Retrieve the private key from localStorage
    const exportedKeyString = localStorage.getItem("privateKey");
    if (!exportedKeyString) {
        throw new Error("No private key found in localStorage.");
    }

    // Parse the exported key
    const exportedKey = JSON.parse(exportedKeyString);

    // Import the private key
    const privateKey = await window.crypto.subtle.importKey(
        "jwk", // Format of the key
        exportedKey,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true, // Key is exportable
        ["deriveKey", "deriveBits"] // Key usages
    );

    return privateKey;
}
