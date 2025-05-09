export default () => ({
    jwt: {
        secret: process.env.JWT_SECRET,
        accessToken: {
            expiresIn: process.env.JWT_AT_EXPIRES_IN,
            cookieExpiresIn: parseInt(
                process.env.JWT_AT_COOKIE_EXPIRES_IN || '1',
                10,
            ),
        },
        refreshToken: {
            expiresIn: process.env.JWT_RT_EXPIRES_IN,
            cookieExpiresIn: parseInt(
                process.env.JWT_RT_COOKIE_EXPIRES_IN || '7',
                10,
            ),
        },
    },
});
