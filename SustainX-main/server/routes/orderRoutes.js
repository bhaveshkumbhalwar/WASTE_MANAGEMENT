
const express = require('express');
const { getOrders, updateOrderStatus } = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All authenticated users can view orders (role-filtered in controller)
router.get('/', protect, getOrders);

// Collector/admin can update order status
router.put('/:id', protect, authorize('collector', 'admin'), updateOrderStatus);

module.exports = router;
