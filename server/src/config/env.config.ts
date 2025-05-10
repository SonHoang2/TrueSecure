export default () => ({
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    sslKey: process.env.SSL_KEY,
    sslCert: process.env.SSL_CERT,
    client: process.env.CLIENT_URL,
});
