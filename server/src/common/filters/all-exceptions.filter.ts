import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message = exception.message || 'Internal server error';

        // Handle TypeORM specific errors
        if (exception instanceof QueryFailedError) {
            status = HttpStatus.BAD_REQUEST;

            // Handle unique constraint violations
            if (exception.driverError?.code === '23505') {
                // Extract constraint details from the error
                const detail = exception.driverError.detail;
                if (detail?.includes('email')) {
                    message = 'Email already exists. Please use another email!';
                } else {
                    message =
                        'A record with the same unique value already exists.';
                }
            }
        }

        if (exception instanceof EntityNotFoundError) {
            status = HttpStatus.NOT_FOUND;
            message = 'Requested entity was not found.';
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

        if (
            exception instanceof HttpException &&
            status === HttpStatus.BAD_REQUEST
        ) {
            const response = exception.getResponse();
            if (
                typeof response === 'object' &&
                Array.isArray(response['message'])
            ) {
                message = response['message'].join(', ');
            } else {
                message = exception.message;
            }
        }
        console.log('exception: ', exception);

        response.status(status).json({
            status: 'error',
            message,
        });
    }
}
