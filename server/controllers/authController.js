import catchAsync from "../utils/catchAsync.js";
import User from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import jwt from 'jsonwebtoken';
import config from "../config/config.js";
// import { sendEmail } from "../utils/email.js";
// import { client } from "../redisClient.js";

export const protect = catchAsync(async (req, res, next) => {
    const { access_token: accessToken, refresh_token : refreshToken } = req.cookies;

    if (refreshToken) {
        return next()
    }

    if (!accessToken) {
        return next(
            new AppError('You are not logged in! Please log in to get access', 401)
        );
    }
    // verification token
    const decoded = jwt.verify(accessToken, config.jwt.secret);
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

export const socketProtect = async (socket, next) => {
    let token;

    if (socket.handshake.headers.cookie) {
        token = socket.handshake.headers.cookie.replace("access_token=", "");
    }
    if (!token) {
        return next(
            new Error('Unauthorized')
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
            new Error('Unauthorized')
        );
    }
    // check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return new Error('Unauthorized');
    }

    socket.user = currentUser;

    next();
}

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

const signToken = (id, time) => {
    return jwt.sign({ id }, config.jwt.secret, {
        expiresIn: time
    });
};

const createSendToken = async (user, statusCode, res) => {
    const accessToken = signToken(user.id, config.jwt.ATExpiresIn);
    const refreshToken = signToken(user.id, config.jwt.RTExpiresIn);

    const ATOptions = {
        expires: new Date(
            Date.now() + config.jwt.ATCookieExpiresIn * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: config.env === 'production' ? true : false
    };

    const RTOptions = {
        expires: new Date(
            Date.now() + config.jwt.RTCookieExpiresIn * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: config.env === 'production' ? true : false,
        path: '/api/v1/auth/'
    };

    res.cookie('access_token', accessToken, ATOptions);
    res.cookie('refresh_token', refreshToken, RTOptions);

    const value = String(user.id);

    await client.set(refreshToken, value, 'EX', 7 * 24 * 60 * 60); // auto delete after 7 days

    // remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        data: {
            user
        }
    });
};


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

        const user = await User.scope('withPassword').findOne({ where: { email: email } });

        if (!user || !user.validPassword(password)) {
            next(new AppError('Incorrect email or password', 401));
        }

        if (!user.active) {
            next(new AppError('Your account has been deactivated and can no longer be used.', 401));
        }

        createSendToken(user, 200, res);
    }
)

export const logout = catchAsync(
    async (req, res) => {
        const { refresh_token: refreshToken } = req.cookies;

        const user = await client.get(refreshToken);
        if (user) {
            await client.del(refreshToken);
        }

        const ATOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false
        };

        const RTOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            path: '/api/v1/auth/'
        };

        res.clearCookie('access_token', ATOptions);
        res.clearCookie('refresh_token', RTOptions);

        res.status(200).json(
            { status: 'success' }
        );
    }
)

export const refreshToken = catchAsync(
    async (req, res, next) => {
        const { refresh_token: refreshToken } = req.cookies;

        if (!refreshToken) {
            return next(new AppError('You are not logged in! Please log in to get access', 401));
        }

        const user = await client.get(refreshToken);
        if (!user) {
            jwt.verify(refreshToken, config.jwt.secret, async (err, decoded) => {
                if (err) {
                    return next(new AppError('Invalid token', 403));
                }
                // Detected refresh token reuse!
                console.log('attempted refresh token reuse! User: ', decoded.id);
                return next(new AppError('Invalid token', 403));
            });
        }

        await client.del(refreshToken);

        const accessToken = signToken(user, config.jwt.ATExpiresIn);
        const newRefreshToken = signToken(user, config.jwt.RTExpiresIn);

        await client.set(newRefreshToken, user, 'EX', 7 * 24 * 60 * 60); // auto delete after 7 day

        const ATOptions = {
            expires: new Date(
                Date.now() + config.jwt.ATCookieExpiresIn * 60 * 60 * 1000
            ),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false
        };

        const RTOptions = {
            expires: new Date(
                Date.now() + config.jwt.RTCookieExpiresIn * 24 * 60 * 60 * 1000
            ),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            path: '/api/v1/auth/'
        };

        res.cookie('access_token', accessToken, ATOptions);
        res.cookie('refresh_token', newRefreshToken, RTOptions);

        res.json({
            status: 'success'
        })
    }
)