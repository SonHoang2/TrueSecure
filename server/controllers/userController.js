import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { query } from '../utils/filter.js';
import { Op } from 'sequelize';

export const getAllUsers = catchAsync(async (req, res, next) => {
    const { page, limit, sort, fields } = query(req);

    const users = await User.findAll({
        limit: limit,
        offset: (page - 1) * limit,
        order: sort,
        attributes: fields,
    });

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});

export const getUser = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const getMe = catchAsync(async (req, res, next) => {

    req.params.id = req.user.id;
    next();
});

export const createUser = catchAsync(async (req, res, next) => {
    const filter = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password
    }

    const user = await User.create(filter);

    res.status(201).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const updateUser = catchAsync(async (req, res, next) => {
    const user = await User.findOne({
        where: {
            id: req.params.id
        },
    });

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    await user.update(req.body);

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findOne({
        where: {
            id: req.params.id
        },
    });

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    await user.update({ active: false });

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const createPublicKey = catchAsync(
    async (req, res) => {
        const { publicKey } = req.body;
        const { id } = req.user;

        await User.update({ publicKey }, { where: { id } });

        res.status(200).json({
            status: 'success',
        });
    }
)

export const getPublicKey = catchAsync(
    async (req, res) => {
        const { userId } = req.params;

        const user = await User.findOne({ where: { id: userId }, attributes: ['publicKey'] });

        if (!user) {
            return next(new AppError('No user found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                publicKey: user.publicKey
            }
        });
    }
)


export const searchUsers = catchAsync(async (req, res, next) => {
    const { name } = req.query;

    const users = await User.findAll({
        where: {
            [Op.or]: [
                {
                    firstName: {
                        [Op.like]: `%${name}%`
                    }
                },
                {
                    lastName: {
                        [Op.like]: `%${name}%`
                    }
                },
                {
                    [Op.and]: [
                        { firstName: { [Op.like]: `%${name.split(' ')[0]}%` } },
                        { lastName: { [Op.like]: `%${name.split(' ')[1]}%` } }
                    ]
                }
            ],
            id: {
                [Op.ne]: req.user.id
            }
        }
    });

    res.status(200).json({
        status: 'success',
        data: {
            users
        }
    });
});