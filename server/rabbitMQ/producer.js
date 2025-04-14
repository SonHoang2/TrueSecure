import { getRabbitChannel } from './index.js';

export async function sendOfflineMessage(receiverId, message) {
    const channel = getRabbitChannel();
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized");
    }

    console.log(`Sending message to offline user ${receiverId}:`, message);
    
    const queue = `offline_user_${receiverId}`;
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true
    });
}
