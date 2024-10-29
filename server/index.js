import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
    },
});

app.use(cors());


io.on('connection', (socket) => {
    console.log('a user connected', socket.id);
    socket.on('chat', (data) => {
        console.log('message: ' + data);
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

httpServer.listen(5000, () => {
    console.log("server is running on port 5000");
});