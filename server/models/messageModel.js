import sequelize from '../db.js';
import { messageType } from '../shareVariable.js';

const message = sequelize.define('message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    messageType: {
        type: DataTypes.ENUM(messageType.Text, messageType.Image, messageType.File),
        defaultValue: messageType.Text
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
},
    {
        timestamps: false
    }
);

export default message;