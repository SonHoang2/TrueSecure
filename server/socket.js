import { Server } from "socket.io";
import { socketProtect } from "./controllers/authController.js";
import config from "./config/config.js";

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: config.client,
            credentials: true,
        },

    });

    io.use(socketProtect);

    const users = new Map([]);

    io.on('connection', async (socket) => {
        console.log("A user connected", socket.id);
        users.set(socket.user.id, socket.id);
        console.log('users', users);

        socket.on('sendMessage', (data) => {
            
            console.log('message: ' + data.to);

            // io.to(user).emit('receiveMessage', data);
        });

        socket.on("disconnect", () => {
            console.log("A user disconnected");
            users.delete(socket.user.id);
        });
    });

    return io;
}