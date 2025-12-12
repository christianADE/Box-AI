const express = require('express');
const router = express.Router();
const { getQR, getStatus, logout } = require('../controllers/whatsappController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/qr', protect, getQR);
router.get('/status', protect, getStatus);
router.post('/logout', protect, logout);

module.exports = router;
