const Message = require('../models/Message');
const apiResponse = require('../utils/apiResponse');

const getMessages = async (req, res) => {
    const userId = req.user.id;
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const messages = await Message.findAndCountAll({
            where: { userId },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['timestamp', 'DESC']]
        });

        return apiResponse(res, 200, true, 'Messages history', {
            messages: messages.rows,
            total: messages.count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error(error);
        return apiResponse(res, 500, false, 'Server Error');
    }
};

module.exports = { getMessages };
