import dotenv from 'dotenv'

dotenv.config()

export default {
    env: process.env.NODE_ENV,
    server: process.env.SERVER_URL,
    port: process.env.PORT,
    database: {
        name: process.env.DB_NAME,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
        cookieExpiresIn: process.env.JWT_COOKIE_EXPIRES_IN
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD
    },
}