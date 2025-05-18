import { MessageStatus } from "../enums/messageStatus.enum";

const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('chatAppDB', 1);

        request.onerror = (event) =>
            reject('Error opening IndexedDB: ' + event.target.errorCode);
        request.onsuccess = (event) => resolve(event.target.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('messages')) {
                const objectStore = db.createObjectStore('messages', {
                    keyPath: 'id',
                });

                objectStore.createIndex('senderId', 'senderId', {
                    unique: false,
                });
                objectStore.createIndex('conversationId', 'conversationId', {
                    unique: false,
                });
                objectStore.createIndex('createdAt', 'createdAt', {
                    unique: false,
                });
            }
        };
    });
};

export const storeMessagesInIndexedDB = async ({
    messageId,
    senderId,
    conversationId,
    content,
    createdAt,
    status,
}: {
    messageId: string;
    senderId: string;
    conversationId: string;
    content: string;
    createdAt: string;
    status: MessageStatus;
}) => {
    try {
        if (
            !messageId ||
            !senderId ||
            !conversationId ||
            !content ||
            !createdAt
        ) {
            console.error('Invalid message data:', {
                messageId,
                senderId,
                conversationId,
                content,
                createdAt,
            });
            return;
        }

        const db = await openDatabase();
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        type MessageData = {
            id: string;
            senderId: string;
            conversationId: string;
            content: string;
            createdAt: string;
            status: MessageStatus;
        };

        const messageData: MessageData = {
            id: messageId,
            senderId,
            conversationId,
            content,
            createdAt,
            status,
        };

        console.log('Storing message in IndexedDB:', messageData);

        store.put(messageData);

        tx.oncomplete = () => {
            console.log('Message stored in IndexedDB');
        };

        tx.onerror = (event) => {
            console.error('Failed to store message:', event.target.error);
        };
    } catch (err) {
        console.error('IndexedDB error:', err);
    }
};

export const getMessagesFromIndexedDB = async (
    conversationId: string,
): Promise<any[]> => {
    try {
        const db = await openDatabase();
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const index = store.index('conversationId');

        const messages = await new Promise<any[]>((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.only(conversationId));

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });

        console.log('Messages retrieved from IndexedDB:', messages);
        return messages;
    } catch (err) {
        console.error('IndexedDB error:', err);
        return [];
    }
};
