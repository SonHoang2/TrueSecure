import { Server } from "socket.io";
import AppError from "./utils/AppError.js";
import { socketProtect } from "./controllers/authController.js";

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.use(socketProtect);

    io.on('connection', async (socket) => {
        console.log('a user connected', socket.id);
        socket.on('sendMessage', (data) => {
            console.log('message: ' + data.text);

            socket.broadcast.emit('receiveMessage', data);
        });
    
        socket.on("disconnect", () => {
            console.log("A user disconnected");
        });
    });    
}