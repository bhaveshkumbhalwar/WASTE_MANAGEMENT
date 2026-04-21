
const express = require('express');
const { getOrders, updateOrderStatus, getOrderById, assignOrder } = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All authenticated users can view orders (role-filtered in controller)
router.get('/', protect, getOrders);

// Get single order details
router.get('/:id', protect, getOrderById);

// Collector takes an order
router.post('/assign/:id', protect, authorize('collector'), assignOrder);

// Collector/admin can update order status
router.put('/:id', protect, authorize('collector', 'admin'), updateOrderStatus);

module.exports = router;
