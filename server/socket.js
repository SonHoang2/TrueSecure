import { Server } from "socket.io";
import { socketProtect } from "./controllers/authController.js";
import config from "./config/config.js";
import Message from "./models/messageModel.js";
import MessageStatus from "./models/messageStatusModel.js";
import { messageStatus } from "./shareVariable.js"

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

        io.emit('online-users', {
            onlineUsers: Array.from(onlineUsers.keys()),
            lastSeen: Object.fromEntries(lastSeen)
        });

        console.log("Online users", onlineUsers);

        // Handle offer
        socket.on("offer", (data) => {
            console.log("Offer received", data);
            const receiverSocketId = onlineUsers.get(data.receiverId);

            io.to(receiverSocketId).emit("offer", { offer: data.offer, sender: data.sender });

        });

        // Handle answer
        socket.on("answer", (data) => {
            console.log("Answer received", data);
            const receiverSocketId = onlineUsers.get(data.receiverId);

            io.to(receiverSocketId).emit("answer", { answer: data.answer });

        });

        // Handle ICE candidate
        socket.on("ice-candidate", (data) => {
            console.log("ICE candidate received", data);
            const receiverSocketId = onlineUsers.get(data.receiverId);
            io.to(receiverSocketId).emit("ice-candidate", { candidate: data.candidate });
        });

        socket.on("call-rejected", (data) => {
            console.log("Call rejected", data);
            const receiverSocketId = onlineUsers.get(data.receiverId);
            io.to(receiverSocketId).emit("call-rejected");
        });

        socket.on("call-ended", (data) => {
            console.log("Call ended", data);
            const receiverSocketId = onlineUsers.get(data.receiverId);
            io.to(receiverSocketId).emit("call-ended");
        });

        socket.on('send-message', async (data) => {
            const receiverSocketId = onlineUsers.get(data.receiverId);
            const senderSocketId = onlineUsers.get(data.senderId);

            const message = await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                messageType: data.messageType
            });

            const status = await MessageStatus.create({
                messageId: message.id,
                userId: data.receiverId,
                status: messageStatus.Sent
            });

            io.to(receiverSocketId).emit('new-message', {
                ...data,
                messageId: message.id,
                messageStatusId: status.id
            });

            io.to(senderSocketId).emit('message-status-update', {
                messageId: message.id,
                status: messageStatus.Sent
            });
        });

        socket.on("message-seen", (data) => {
            const senderSocketId = onlineUsers.get(data.senderId);

            const { messageId } = data;

            MessageStatus.update(
                { status: messageStatus.Seen },
                {
                    where: {
                        id: data.messageStatusId
                    }
                }
            );

            io.to(senderSocketId).emit("message-status-update", {
                messageId: messageId,
                status: messageStatus.Seen
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