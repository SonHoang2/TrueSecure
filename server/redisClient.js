import { createClient } from 'redis';

const client = createClient();

client.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

const connectRedis = async () => {
    try {
        if (!client.isOpen) {
            await client.connect();
            console.log('Redis client connected successfully.');
        }
    } catch (error) {
        console.error('Error connecting to Redis:', error);
        process.exit(1); // Exit the process if Redis connection fails
    }
};

export { client, connectRedis };
