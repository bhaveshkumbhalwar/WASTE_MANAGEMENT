

const express = require('express');
const { getDashboardStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
