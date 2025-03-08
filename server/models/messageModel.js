import sequelize from '../db.js';
import { DataTypes } from 'sequelize';
import { MESSAGE_TYPE } from '../shareVariable.js';

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
        type: DataTypes.TEXT,
        allowNull: false
    },
    messageType: {
        type: DataTypes.ENUM(MESSAGE_TYPE.TEXT, MESSAGE_TYPE.IMAGE, MESSAGE_TYPE.FILE),
        defaultValue: MESSAGE_TYPE.TEXT
    },
    iv: {
        type: DataTypes.STRING,
    },
    ephemeralPublicKey: {
        type: DataTypes.STRING,
    }
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

    Message.hasMany(db.MessageStatus, {
        foreignKey: {
            name: 'messageId'
        }
    });
}

export default Message;