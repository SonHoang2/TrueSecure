import { createServer } from "http";
import { initSocket } from "./socket.js";
import sequelize from "./db.js";
import app from "./app.js";

const server = createServer(app);

try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

// sequelize.sync({ force: true })

initSocket(server);

server.listen(5000, () => {
    console.log("server is running on port 5000");
});