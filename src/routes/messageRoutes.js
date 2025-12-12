const express = require('express');
const router = express.Router();
const { getMessages } = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getMessages);

module.exports = router;
