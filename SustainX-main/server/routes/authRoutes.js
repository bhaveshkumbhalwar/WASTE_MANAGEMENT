app.get("/api", (req, res) => {
    res.send("API is running...");
});












const express = require('express');
const { login, register, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);

module.exports = router;
