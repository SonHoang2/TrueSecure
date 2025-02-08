import { createServer } from "http";
import { initSocket } from "./socket.js";
import sequelize from "./db.js";
import app from "./app.js";
import Converstation from "./models/conversationModel.js";
import ConvParticipant from "./models/convParticipantModel.js";
import Message from "./models/messageModel.js";
import User from "./models/userModel.js";
import MessageStatus from "./models/messageStatusModel.js";
import { connectRedis } from "./redisClient.js";

const server = createServer(app);

try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

const db = {
    User,
    Converstation,
    ConvParticipant,
    Message,
    MessageStatus
}

Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

await connectRedis();

// sequelize.sync({ force: true })

initSocket(server);

server.listen(5000, () => {
    console.log("server is running on port 5000");
});