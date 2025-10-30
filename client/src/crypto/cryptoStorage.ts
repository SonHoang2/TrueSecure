import storage from 'redux-persist/lib/storage';

class CryptoStorage {
    async setItem(key: string, value: any) {
        try {
            await storage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to store crypto data:', error);
            throw new Error(
                `Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async getItem(key: string) {
        try {
            const data = await storage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to retrieve crypto data:', error);
            return null;
        }
    }

    async removeItem(key: string) {
        try {
            await storage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove crypto data:', error);
        }
    }

    async hasItem(key: string): Promise<boolean> {
        try {
            const data = await storage.getItem(key);
            return data !== null;
        } catch (error) {
            return false;
        }
    }

    getPrivateKeyId(): string {
        return `privateKey`;
    }

    getGroupKeyId(conversationId: number): string {
        return `groupKey_${conversationId}`;
    }
}

export const cryptoStorage = new CryptoStorage();
