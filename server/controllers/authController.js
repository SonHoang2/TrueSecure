import catchAsync from "../utils/catchAsync.js";
import User from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import jwt from 'jsonwebtoken';
import config from "../config/config.js";
import { sendEmail } from "../utils/email.js";
import { client } from "../redisClient.js";

export const protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.cookie) {
        token = req.headers.cookie.replace("access_token=", "");
    }
    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access', 401)
        );
    }
    // verification token
    const decoded = jwt.verify(token, config.jwt.secret);
    // check if user still exists
    const currentUser = await User.findOne(
        {
            where: {
                id: decoded.id,
                active: true
            }
        });
    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token does no longer exits.',
                401
            ));
    }
    // check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password! Please log in again.', 401));
    }

    req.user = currentUser;
    next();
})

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin, ...]  .role = 'user'
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError("You do not have permission to perform this action", 403)
            )
        }
        next();
    }
}

const signToken = id => {
    return jwt.sign({ id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user.id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + config.jwt.cookieExpiresIn * 60 * 60 * 1000
        ),
        httpOnly: true
    };
    // cookie only send on secure connection (https)
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('access_token', token, cookieOptions);

    // remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        data: {
            user
        }
    })
}

export const signup = catchAsync(
    async (req, res, next) => {
        const { firstName, lastName, email, password, passwordConfirm } = req.body;

        if (!firstName || !lastName || !email || !password || !passwordConfirm) {
            return next(new AppError('Please provide all required fields!', 400));
        }

        if (password !== passwordConfirm) {
            return next(new AppError('Passwords do not match!', 400));
        }

        const filter = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
        }

        const newUser = await User.create(filter);

        createSendToken(newUser, 201, res);
    }
);

export const login = catchAsync(
    async (req, res, next) => {
        const { email, password } = req.body;

        if (!email || !password) {
            next(new AppError('Please provide email and password!', 400));
        }

        const user = await User.scope('withPassword').findOne({ where: { email: email} });
        
        if (!user || !user.validPassword(password)) {
            next(new AppError('Incorrect email or password', 401));
        }

        if (!user.active) {
            next(new AppError('Your account has been deactivated and can no longer be used.', 401));
        }

        createSendToken(user, 200, res);
    }
)

export const logout = (req, res) => {
    res.cookie('access_token', '', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json(
        { status: 'success' }
    );
}

export const forgotPassword = catchAsync(
    async (req, res, next) => {
        const { email } = req.body;
        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return next(new AppError('There is no user with email address.', 404));
        }

        const resetToken = user.createPasswordResetToken();

        await client.set(resetToken, email, 'EX', 10 * 60);

        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            html: `
            <div>
                <p>Your token is: ${resetToken}</p>
                <p>If you didn't forget your password, please ignore this email!</p>
            </div>
        `,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        })
    }
)

export const resetPassword = catchAsync(
    async (req, res, next) => {
        const { resetToken } = req.params;
        const { password, passwordConfirm } = req.body;

        const email = await client.get(resetToken);

        console.log(email);

        if (!email) {
            return next(new AppError('Token is invalid or has expired', 400));
        }

        if (!password || !passwordConfirm) {
            return next(new AppError('Please provide password and passwordConfirm', 400));
        }

        if (password !== passwordConfirm) {
            return next(new AppError('Passwords do not match', 400));
        }

        const user = await User.scope('withPassword').findOne({ where: { email: email } });

        await user.update({
            password: password,
            passwordChangedAt: Date.now() - 1000
        });

        await client.del(resetToken);

        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully!'
        })
    }
)