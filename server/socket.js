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

    const onlineUsers = new Map([]);
    const lastSeen = new Map(); 

    io.on('connection', (socket) => {
        console.log("A user connected", socket.id);
        onlineUsers.set(socket.user.id, socket.id);

        io.emit('online users', {
            onlineUsers: Array.from(onlineUsers.keys()),
            lastSeen: Object.fromEntries(lastSeen)
        });

        socket.on('private message', async (data) => {
            const userId = onlineUsers.get(data.receiverId);
            io.to(userId).emit('private message', data);
            
            await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                messageType: data.messageType
            });
        });

        socket.on("disconnect", () => {
            console.log("A user disconnected");
            onlineUsers.delete(socket.user.id);
            lastSeen.set(socket.user.id, new Date());
        });
    });

    return io;
}