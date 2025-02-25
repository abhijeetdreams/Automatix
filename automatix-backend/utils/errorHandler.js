function handleSlackError(error) {
    return {
        error: error.message,
        details: error.data || 'No additional details',
        status: error.code || 500
    };
}

module.exports = {
    handleSlackError
};
