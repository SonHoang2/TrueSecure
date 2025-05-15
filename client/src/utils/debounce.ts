const debounce = (func, delay) => {
    let timeoutId;
    const debounced = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };

    debounced.cancel = () => {
        clearTimeout(timeoutId);
    };

    return debounced;
};

export default debounce;
