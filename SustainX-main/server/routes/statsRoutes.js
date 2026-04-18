app.get("/api", (req, res) => {
    res.send("API is running...");
});


const express = require('express');
const { getDashboardStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
