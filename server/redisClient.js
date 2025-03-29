import { createClient } from 'redis';
import config from './config/config.js';

const REDIS_HOST = config.redis.host || 'redis';
const REDIS_PORT = config.redis.port || 6379;

const client = createClient({
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});
client.on('error', (err) => {
    console.error('Redis Client Error:', err);
    process.exit(1);
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
