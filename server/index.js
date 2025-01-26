import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(cors());


io.on('connection', (socket) => {
    console.log('a user connected', socket.id);
    socket.on('chat', (data) => {
        console.log('message: ' + data);

        io.emit("chat", data);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

app.get('/messages', function (req, res) {
    res.json({
        message: [
            "hello",
            "world",
        ]
    });
});

server.listen(5000, () => {
    console.log("server is running on port 5000");
});