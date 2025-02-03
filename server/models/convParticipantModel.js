import sequelize from '../db.js';
import { DataTypes } from 'sequelize';
import { roleName } from '../shareVariable.js';

const ConvParticipant = sequelize.define('convParticipant', {
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
        timestamps: false,
        uniqueKeys: {
            unique_user_conversation: {
                fields: ['userId', 'conversationId']
            }
        }
    }
);

ConvParticipant.associate = (db) => {
    ConvParticipant.belongsTo(db.User, {
        foreignKey: {
            name: 'userId'
        }
    });

    ConvParticipant.belongsTo(db.Converstation, {
        foreignKey: {
            name: 'conversationId'
        }
    });
}

export default ConvParticipant;