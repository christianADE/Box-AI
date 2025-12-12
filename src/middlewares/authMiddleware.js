const jwt = require('jsonwebtoken');
const User = require('../models/User');
const apiResponse = require('../utils/apiResponse');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findByPk(decoded.id);

            if (!req.user) {
                return apiResponse(res, 401, false, 'Not authorized, user not found');
            }

            next();
        } catch (error) {
            console.error(error);
            return apiResponse(res, 401, false, 'Not authorized, token failed');
        }
    }

    if (!token) {
        return apiResponse(res, 401, false, 'Not authorized, no token');
    }
};

module.exports = { protect };
