import sequelize from '../db.js';
import { messageStatus } from '../shareVariable.js';

const messageStatus = sequelize.define('messageStatus', {
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

export default messageStatus;