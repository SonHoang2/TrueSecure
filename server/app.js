import express from 'express'
import userRoutes from './routes/userRoutes.js'
import globalErrorHandler from './controllers/errorController.js'
import path from 'path'
import cors from 'cors'
import { __dirname } from './shareVariable.js'
import { rateLimit } from 'express-rate-limit'
import morgan from 'morgan'
import AppError from './utils/AppError.js'

const app = express()

app.use(cors())

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100,
})

app.use(limiter)

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json());

app.use('/images', express.static(path.join(__dirname, '/upload/images/')));


app.use('/api/v1/users', userRoutes);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});


app.use(globalErrorHandler)


export default app;