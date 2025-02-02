import sequelize from '../db.js';
import { roleName } from '../shareVariable.js';

const convParticipant = sequelize.define('convParticipant', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM(roleName.Admin, roleName.User),
        defaultValue: roleName.User
    }
},
    {
        timestamps: false
    }
);

export default convParticipant;