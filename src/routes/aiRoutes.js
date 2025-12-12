const express = require('express');
const router = express.Router();
const { updateConfig, getConfig, testAI } = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/config', protect, updateConfig);
router.get('/config', protect, getConfig);
router.post('/generate', protect, testAI);

module.exports = router;
