import AppError from '../utils/AppError.js';
import config from '../config/config.js';

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path} : ${err.value}.`
    return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
    console.log(err.errors[0]);
    let message = '';

    if (err.errors[0].message === 'email must be unique') {
        message = `Email already exists. Please use another email!`;
    }

    return new AppError(message, 400);
}

const handleJWTError = err => new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = err => new AppError('Your token has expired! Please log in again', 401);

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        })
    } else {
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        })
    }
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleFileSizeError = err => new AppError(`File size should be less than 10 MB`, 400);

export default (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.errmsg = err.errmsg;

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.name === "SequelizeUniqueConstraintError") error = handleDuplicateFieldsDB(error);
    if (error.name === "SequelizeValidationError") error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (error.code === 'LIMIT_FILE_SIZE') error = handleFileSizeError(error);
    if (config.env === 'development') {
        console.log(err);
    }
    sendErrorProd(error, res);
}