import sequelize from '../db.js';
import { DataTypes } from 'sequelize';
import { messageType } from '../shareVariable.js';

const Message = sequelize.define('message', {
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
},
    {
        timestamps: true,
        updatedAt: false,
        createdAt: 'createdAt',
    }
);

Message.associate = (db) => {
    Message.belongsTo(db.Converstation, {
        foreignKey: {
            name: 'conversationId'
        }
    });

    Message.belongsTo(db.User, {
        foreignKey: {
            name: 'senderId'
        }
    });
}

export default Message;