import { getRabbitChannel } from './index.js';
import { io } from '../socket.js';

const consumerTags = new Map();

export async function consumeMessages(userId, socketId) {
    const channel = getRabbitChannel();
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized");
    }

    const queue = `offline_user_${userId}`;
    await channel.assertQueue(queue, { durable: true });

    const { consumerTag } = await channel.consume(queue, (msg) => {
        if (msg !== null) {
            console.log(`Received message from queue ${queue}:`, msg.content.toString());

            const message = JSON.parse(msg.content.toString());

            io.to(socketId).emit('new-private-message', {
                ...message,
                messageId: message.messageId,
            });

            channel.ack(msg);
        }
    }, {
        noAck: false
    });

    consumerTags.set(userId, consumerTag);
    console.log(`Started consuming for user ${userId} with tag ${consumerTag}`);
}

export async function cancelConsumeMessages(userId) {
    const channel = getRabbitChannel();
    const consumerTag = consumerTags.get(userId);
    if (channel && consumerTag) {
        await channel.cancel(consumerTag);
        consumerTags.delete(userId);
        console.log(`Stopped consuming for user ${userId}`);
    }
}
