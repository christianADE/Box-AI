/**
 * Standard API Response Structure
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - status of the request
 * @param {string} message - Message to return
 * @param {object} data - Data to return (optional)
 */
const apiResponse = (res, statusCode, success, message, data = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data
    });
};

module.exports = apiResponse;
