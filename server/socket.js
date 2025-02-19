import { Server } from "socket.io";
import { socketProtect } from "./controllers/authController.js";
import config from "./config/config.js";
import ConvParticipant from "./models/convParticipantModel.js";
import Message from "./models/messageModel.js";
import MessageStatus from "./models/messageStatusModel.js";
import { messageStatus } from "./shareVariable.js"
import { Op } from "sequelize";

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

        socket.on('send-private-message', async (data) => {
            const receiverSocketId = onlineUsers.get(data.receiverId);
            const senderSocketId = onlineUsers.get(data.senderId);

            const message = await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                content: data.content,
                messageType: data.messageType
            });

            const status = await MessageStatus.create({
                messageId: message.id,
                userId: data.receiverId,
                status: messageStatus.Sent
            });

            io.to(receiverSocketId).emit('new-private-message', {
                ...data,
                messageId: message.id,
                messageStatusId: status.id
            });

            io.to(senderSocketId).emit('private-message-status-update', {
                messageId: message.id,
                status: messageStatus.Sent
            });
        });

        socket.on("private-message-seen", (data) => {
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

            io.to(senderSocketId).emit("private-message-status-update", {
                messageId: messageId,
                status: messageStatus.Seen
            });
        });

        socket.on('send-group-message', async (data) => {
            const message = await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                content: data.content,
                messageType: data.messageType
            });

            const participants = await ConvParticipant.findAll({
                where: {
                    conversationId: data.conversationId,
                    userId: { [Op.ne]: data.senderId }
                }
            });

            const statusEntries = await Promise.all(
                participants.map(async (participant) => {
                    return await MessageStatus.create({
                        messageId: message.id,
                        userId: participant.userId,
                        status: messageStatus.Sent
                    });
                })
            );

            const statusMap = new Map();
            statusEntries.forEach(entry => {
                statusMap.set(entry.userId, entry.id);
            });

            participants.forEach(async (participant) => {
                const userSocketId = onlineUsers.get(participant.userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('new-group-message', {
                        ...data,
                        messageId: message.id,
                        messageStatusId: statusMap.get(participant.userId)
                    });
                }
            });

            const senderSocketId = onlineUsers.get(data.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('group-message-status-update', {
                    messageId: message.id,
                    status: messageStatus.Sent
                });
            }
        });

        socket.on("group-message-seen", async (data) => {
            const status = await MessageStatus.findByPk(data.messageStatusId);
            if (!status) return;

            await status.update({ status: messageStatus.Seen });

            const message = await Message.findByPk(status.messageId);

            const participants = await ConvParticipant.findAll({
                where: { conversationId: conversation.id }
            });

            const updateData = {
                messageId: message.id,
                userId: status.userId,
                status: messageStatus.Seen
            };

            participants.forEach(participant => {
                const socketId = onlineUsers.get(participant.userId);
                if (socketId) {
                    io.to(socketId).emit('group-message-status-update', updateData);
                }
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