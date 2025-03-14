import dotenv from 'dotenv'

dotenv.config()

export default {
    env: process.env.NODE_ENV,
    server: process.env.SERVER_URL,
    client: process.env.CLIENT_URL,
    port: process.env.PORT,
    sslKey: process.env.SSL_KEY,
    sslCert: process.env.SSL_CERT,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    database: {
        name: process.env.DB_NAME,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        ATExpiresIn : process.env.JWT_AT_EXPIRES_IN,
        RTExpiresIn : process.env.JWT_RT_EXPIRES_IN,
        ATCookieExpiresIn : process.env.JWT_AT_COOKIE_EXPIRES_IN,
        RTCookieExpiresIn : process.env.JWT_RT_COOKIE_EXPIRES_IN,
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD
    },
}