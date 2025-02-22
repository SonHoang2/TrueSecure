export default (handler) => {
    return async function (data, callback) {
        try {
            await handler.call(this, data, callback);
        } catch (error) {
            // Operational error (trusted)
            if (error.isOperational) {
                this.emit('error', {
                    status: error.status,
                    message: error.message,
                    code: error.statusCode
                });
            } else {
                // Programming/unknown error
                console.error(`💥 Socket Error (${this.id}):`, error);
                this.emit('error', {
                    status: 'error',
                    message: 'Something went wrong!',
                    code: 500
                });
            }
        }
    };
};