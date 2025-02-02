import sequelize from '../db.js';
import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { roleName } from '../shareVariable.js';
import AppError from '../utils/AppError.js';

const User = sequelize.define('user', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                args: true,
                msg: "The email is invalid"
            },
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING,
        defaultValue: 'user-avatar-default.jpg'
    },
    googleAccount: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    passwordChangedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    role: {
        type: DataTypes.ENUM(roleName.User, roleName.Admin),
        defaultValue: 'user'
    },
},
    {
        timestamps: false,
        defaultScope: {
            attributes: { exclude: ['password'] },
        },
        scopes: {
            withPassword: {
                attributes: {},
            },
        },
    }
);

User.associate = (models) => {
    User.hasMany(models.ConvParticipant, {
        foreignKey: 'userId',
    });
}

const passwordValidation = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,20}$/;
    if (!regex.test(password)) {
        throw new AppError(
            "Password must be 12-20 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        );
    }
}

User.beforeCreate(async (user, options) => {
    passwordValidation(user.password);
    user.password = await bcrypt.hash(user.password, 12);
});

User.beforeUpdate(async (user, options) => {
    if (user.changed('password')) {
        passwordValidation(user.password);
        user.password = await bcrypt.hash(user.password, 12);
    }
});

User.prototype.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

User.prototype.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

User.prototype.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

        return JWTTimestamp < changedTimestamp;
    }

    return false;
};



export default User;