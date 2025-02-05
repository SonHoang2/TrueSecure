import { Server } from "socket.io";
import { socketProtect } from "./controllers/authController.js";
import config from "./config/config.js";
import Message from "./models/messageModel.js";

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: config.client,
            credentials: true,
        },

    });

    io.use(socketProtect);

    const users = new Map([]);

    io.on('connection', (socket) => {
        console.log("A user connected", socket.id);
        users.set(socket.user.id, socket.id);
        console.log('users', users);

        socket.on('private message', async (data) => {
            await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                messageType: data.messageType
            });

            const userId = users.get(data.receiverId);
            console.log('userId', userId);

            io.to(userId).emit('private message', data);
        });

        socket.on("disconnect", () => {
            console.log("A user disconnected");
            users.delete(socket.user.id);
        });
    });

    return io;
}