import sequelize from '../db.js';
import { DataTypes } from 'sequelize';
import { MESSAGE_STATUS } from '../shareVariable.js';

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
        type: DataTypes.ENUM(MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.SEEN),
        defaultValue: MESSAGE_STATUS.SENT
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