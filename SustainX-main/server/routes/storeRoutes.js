const express = require('express');
const {
  getStoreItems,
  createStoreItem,
  redeemItem,
} = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Anyone authenticated can browse items
router.get('/', protect, getStoreItems);

// Admin can create items
router.post('/', protect, authorize('admin'), createStoreItem);

// Student can redeem
router.post('/redeem', protect, authorize('student'), redeemItem);

module.exports = router;
