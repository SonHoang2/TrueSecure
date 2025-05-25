import { MessageStatus } from '../enums/messageStatus.enum';

const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('chatAppDB', 1);

        request.onerror = (event) =>
            reject(
                'Error opening IndexedDB: ' +
                    (event.target as IDBOpenDBRequest).error,
            );
        request.onsuccess = (event) =>
            resolve((event.target as IDBOpenDBRequest).result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

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
                // Add this compound index:
                objectStore.createIndex(
                    'conversationId_createdAt',
                    ['conversationId', 'createdAt'],
                    { unique: false },
                );
            }
        };
    });
};

export const storeMessagesInIndexedDB = async (data: {
    id: string;
    senderId: string;
    conversationId: string;
    content: string;
    createdAt: string;
    status: MessageStatus | null;
    statuses?: Array<{ userId: string; status: MessageStatus }>;
}) => {
    try {
        const {
            id,
            senderId,
            conversationId,
            content,
            createdAt,
            status,
            statuses,
        } = data;

        if (!id || !senderId || !conversationId || !content || !createdAt) {
            console.error('Invalid message data:', {
                id,
                senderId,
                conversationId,
                content,
                createdAt,
            });
            return;
        }

        if (status === undefined && (!statuses || statuses.length === 0)) {
            console.warn('Message has neither status nor statuses array:', {
                id,
                senderId,
            });
        }

        const db = await openDatabase();
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        const messageData = {
            id,
            senderId,
            conversationId,
            content,
            createdAt,
            ...(status !== undefined && status !== null && { status }),
            ...(statuses && statuses.length > 0 && { statuses }),
        };

        store.put(messageData);

        tx.oncomplete = () => {
            console.log('Message stored in IndexedDB');
        };

        tx.onerror = (event) => {
            console.error(
                'Failed to store message:',
                (event.target as IDBTransaction).error,
            );
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
        const index = store.index('conversationId_createdAt');

        const messages: any[] = [];

        return await new Promise<any[]>((resolve, reject) => {
            // Lower and upper bound for the compound index
            const range = IDBKeyRange.bound(
                [conversationId, ''],
                [conversationId, '\uffff'],
            );
            const request = index.openCursor(range, 'next'); // Ascending order

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
                    .result;
                if (cursor) {
                    messages.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(messages); // Already sorted by createdAt
                }
            };

            request.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    } catch (err) {
        console.error('IndexedDB error:', err);
        return [];
    }
};
