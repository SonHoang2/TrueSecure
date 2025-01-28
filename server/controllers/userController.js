import User from '../models/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { query } from '../utils/filter.js';

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

    console.log("user:", user);


    await user.update({ active: false });

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});