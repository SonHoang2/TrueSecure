import { createServer } from "http";
import { Server } from "socket.io";
import sequelize from "./db.js";
import app from "./app.js";

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

// sequelize.sync({ force: true })

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);
    socket.on('sendMessage', (data) => {
        console.log('message: ' + data.text);
        socket.broadcast.emit('receiveMessage', data);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

server.listen(5000, () => {
    console.log("server is running on port 5000");
});