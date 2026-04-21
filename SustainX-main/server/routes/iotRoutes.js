const express = require('express');
const router = express.Router();
const { processIotData } = require('../controllers/iotController');

// Define routes
router.post('/data', processIotData);

module.exports = router;
