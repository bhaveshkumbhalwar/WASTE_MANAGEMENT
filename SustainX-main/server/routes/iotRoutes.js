const express = require('express');
const router = express.Router();
const { processIotData, getIotData } = require('../controllers/iotController');

// GET  /api/iot/data  → Latest bin readings (public)
router.get('/data', getIotData);

// POST /api/iot/data  → Receive sensor data from ESP32 (public)
router.post('/data', processIotData);

module.exports = router;
