import { Server } from "socket.io";
import { socketProtect } from "./controllers/authController.js";
import config from "./config/config.js";
import ConvParticipant from "./models/convParticipantModel.js";
import Message from "./models/messageModel.js";
import MessageStatus from "./models/messageStatusModel.js";
import { MESSAGE_STATUS } from "./shareVariable.js"
import { Op } from "sequelize";
import { client } from "./redisClient.js";
import catchAsyncSocket from "./utils/catchAsyncSocket.js";

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: config.client,
            credentials: true,
        },
    });

    io.use(socketProtect);

    io.on('connection', catchAsyncSocket(async (socket) => {
        console.log("A user connected", socket.id);

        // Add user to Redis online users
        await client.hSet('onlineUsers', socket.user.id, socket.id);

        // Get all online users and last seen data
        const [onlineUsers, lastSeen] = await Promise.all([
            client.hGetAll('onlineUsers'),
            client.hGetAll('lastSeen')
        ]);

        io.emit('online-users', {
            onlineUsers: onlineUsers,
            lastSeen: lastSeen
        });

        console.log("Online users", onlineUsers);

        // Handle offer
        socket.on("offer", catchAsyncSocket(async (data) => {
            const receiverSocketId = await client.hGet("onlineUsers", data.receiverId.toString());
            io.to(receiverSocketId).emit("offer", { 
                offer: data.offer,
                sender: data.sender,
                isVideo: data.isVideo 
            });
        }));

        // Handle answer
        socket.on("answer", catchAsyncSocket(async (data) => {
            const receiverSocketId = await client.hGet("onlineUsers", data.receiverId.toString());
            io.to(receiverSocketId).emit("answer", { answer: data.answer });
        }));

        // Handle ICE candidate
        socket.on("ice-candidate", catchAsyncSocket(async (data) => {
            const receiverSocketId = await client.hGet("onlineUsers", data.receiverId.toString());
            io.to(receiverSocketId).emit("ice-candidate", { candidate: data.candidate });
        }));

        socket.on("call-rejected", catchAsyncSocket(async (data) => {
            const receiverSocketId = await client.hGet("onlineUsers", data.receiverId.toString());
            io.to(receiverSocketId).emit("call-rejected");
        }));

        socket.on("call-ended", catchAsyncSocket(async (data) => {
            const receiverSocketId = await client.hGet("onlineUsers", data.receiverId.toString());
            io.to(receiverSocketId).emit("call-ended");
        }));

        socket.on('send-private-message', catchAsyncSocket(async (data) => {
            const receiverSocketId = await client.hGet("onlineUsers", data.receiverId.toString());
            const senderSocketId = await client.hGet("onlineUsers", data.senderId.toString());

            const message = await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                content: data.content,
                messageType: data.messageType,
                iv: data.iv,
                ephemeralPublicKey: data.ephemeralPublicKey
            });

            const status = await MessageStatus.create({
                messageId: message.id,
                userId: data.receiverId,
                status: MESSAGE_STATUS.SENT
            });

            io.to(receiverSocketId).emit('new-private-message', {
                ...data,
                messageId: message.id,
                messageStatusId: status.id
            });

            io.to(senderSocketId).emit('private-message-status-update', {
                messageId: message.id,
                status: MESSAGE_STATUS.SENT
            });
        }));

        socket.on("private-message-seen", catchAsyncSocket(async (data) => {
            const senderSocketId = await client.hGet("onlineUsers", data.senderId.toString());

            const { messageId } = data;

            MessageStatus.update(
                { status: MESSAGE_STATUS.SEEN },
                {
                    where: {
                        id: data.messageStatusId
                    }
                }
            );

            io.to(senderSocketId).emit("private-message-status-update", {
                messageId: messageId,
                status: MESSAGE_STATUS.SEEN
            });
        }));

        socket.on('send-group-message', catchAsyncSocket(async (data) => {
            const message = await Message.create({
                conversationId: data.conversationId,
                senderId: data.senderId,
                content: data.content,
                messageType: data.messageType,
                iv: data.iv,
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
                        status: MESSAGE_STATUS.SENT
                    });
                })
            );

            const statusMap = new Map();
            statusEntries.forEach(entry => {
                statusMap.set(entry.userId, entry.id);
            });

            participants.forEach(async (participant) => {
                const userSocketId = await client.hGet("onlineUsers", participant.userId.toString());
                if (userSocketId) {
                    io.to(userSocketId).emit('new-group-message', {
                        ...data,
                        messageId: message.id,
                        messageStatusId: statusMap.get(participant.userId)
                    });
                }
            });

            const senderSocketId = await client.hGet("onlineUsers", data.senderId.toString());
            if (senderSocketId) {
                io.to(senderSocketId).emit('group-message-status-update', {
                    messageId: message.id,
                    status: MESSAGE_STATUS.SENT
                });
            }
        }));

        socket.on("group-message-seen", catchAsyncSocket(async (data) => {
            const status = await MessageStatus.findByPk(data.messageStatusId);
            if (!status) return;

            await status.update({ status: MESSAGE_STATUS.SEEN });

            const message = await Message.findByPk(status.messageId);

            const participants = await ConvParticipant.findAll({
                where: { conversationId: message.conversationId },
                raw: true
            });

            const updateData = {
                messageId: message.id,
                userId: status.userId,
                status: MESSAGE_STATUS.SEEN
            };

            participants.forEach(async participant => {
                const socketId = await client.hGet("onlineUsers", participant.userId.toString());
                if (socketId) {
                    io.to(socketId).emit('group-message-status-update', updateData);
                }
            });
        }));

        socket.on("disconnect", catchAsyncSocket(async () => {
            console.log("A user disconnected");
            await Promise.all([
                client.hDel('onlineUsers', socket.user.id.toString()),
                client.hSet('lastSeen', socket.user.id.toString(), new Date().toISOString())
            ]);
            
        }));
    }));

    return io;
}
