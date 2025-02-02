import sequelize from '../db.js';
import { DataTypes } from 'sequelize';
import { messageStatus } from '../shareVariable.js';

const MessageStatus = sequelize.define('messageStatus', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    messageId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(messageStatus.Sent, messageStatus.Delivered, messageStatus.Seen),
        defaultValue: messageStatus.Sent
    },
},
    {
        timestamps: false
    }
);

MessageStatus.associate = (models) => {
    MessageStatus.belongsTo(models.Message, {
        foreignKey: {
            name: 'messageId',
            allowNull: false
        }
    });
    MessageStatus.belongsTo(models.User, {
        foreignKey: {
            name: 'userId',
            allowNull: false
        }
    });
}

export default MessageStatus;