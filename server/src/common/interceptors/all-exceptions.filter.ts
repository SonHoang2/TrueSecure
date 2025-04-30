// all-exceptions.filter.ts
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message = exception.message || 'Internal server error';

        // Handle specific errors
        if (exception.name === 'SequelizeUniqueConstraintError') {
            if (exception.errors?.[0]?.message === 'email must be unique') {
                message = 'Email already exists. Please use another email!';
                status = 400;
            }
        }

        if (exception.name === 'SequelizeValidationError') {
            const errors = Object.values(exception.errors).map(
                (el: any) => el.message,
            );
            message = `Invalid input data. ${errors.join('. ')}`;
            status = 400;
        }

        if (exception.name === 'JsonWebTokenError') {
            message = 'Invalid token. Please log in again';
            status = 401;
        }

        if (exception.name === 'TokenExpiredError') {
            message = 'Your token has expired! Please log in again';
            status = 401;
        }

        if (exception.code === 'LIMIT_FILE_SIZE') {
            message = 'File size should be less than 10 MB';
            status = 400;
        }

        response.status(status).json({
            status: 'error',
            message,
        });
    }
}
