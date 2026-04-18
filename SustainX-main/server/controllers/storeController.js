const StoreItem = require('../models/StoreItem');
const Order = require('../models/Order');
const User = require('../models/User');

// ── Generate sequential order ID ──
const generateOrderId = async () => {
  const count = await Order.countDocuments();
  return 'ORD-' + String(count + 1).padStart(4, '0');
};

// ──────────────────────────────────────────────────────────────
// STORE ITEMS
// ──────────────────────────────────────────────────────────────

// @desc    Get all active store items
// @route   GET /api/store
const getStoreItems = async (req, res) => {
  try {
    const items = await StoreItem.find({ isActive: true }).sort({ pointsRequired: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Create store item (admin only)
// @route   POST /api/store
const createStoreItem = async (req, res) => {
  try {
    const { name, description, image, pointsRequired, stock, category } = req.body;

    if (!name || !description || !pointsRequired) {
      return res.status(400).json({ message: 'Name, description, and pointsRequired are required.' });
    }

    const item = await StoreItem.create({
      name,
      description,
      image: image || null,
      pointsRequired: Number(pointsRequired),
      stock: stock != null ? Number(stock) : 0,
      category: category || 'other',
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// REDEEM
// ──────────────────────────────────────────────────────────────

// @desc    Redeem item (student only)
// @route   POST /api/store/redeem
const redeemItem = async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: 'Please provide itemId.' });
    }

    // 1. Find item
    const item = await StoreItem.findById(itemId);
    if (!item || !item.isActive) {
      return res.status(404).json({ message: 'Item not found or unavailable.' });
    }

    // 2. Check stock
    if (item.stock <= 0) {
      return res.status(400).json({ message: 'Item is out of stock.' });
    }

    // 3. Fetch fresh user (points may have changed)
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 4. Check points
    if ((user.rewardPoints || 0) < item.pointsRequired) {
      return res.status(400).json({
        message: `Insufficient points. Need ${item.pointsRequired}, you have ${user.rewardPoints || 0}.`,
      });
    }

    // 5. Deduct points
    user.rewardPoints -= item.pointsRequired;
    await user.save();

    // 6. Decrease stock
    item.stock -= 1;
    await item.save();

    // 7. Create order
    const orderId = await generateOrderId();
    const order = await Order.create({
      orderId,
      userId: user.userId,
      userName: user.name,
      item: item._id,
      itemName: item.name,
      pointsSpent: item.pointsRequired,
    });

    console.log(`🛒 [STORE] ${user.userId} redeemed "${item.name}" for ${item.pointsRequired} pts → Order ${orderId}`);

    res.status(201).json({
      order,
      remainingPoints: user.rewardPoints,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// ORDERS
// ──────────────────────────────────────────────────────────────

// @desc    Get orders (role-filtered)
// @route   GET /api/orders
const getOrders = async (req, res) => {
  try {
    const query = {};

    // Students only see their own orders
    if (req.user.role === 'student') {
      query.userId = req.user.userId;
    }

    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const orders = await Order.find(query)
      .populate('item', 'name image pointsRequired')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update order status (collector/admin)
// @route   PUT /api/orders/:id
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, approved, or delivered.' });
    }

    const order = await Order.findOne({ orderId: req.params.id.toUpperCase() });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.status = status;
    await order.save();

    console.log(`📦 [ORDER] ${order.orderId} → status: ${status} (by ${req.user.userId})`);

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getStoreItems, createStoreItem, redeemItem, getOrders, updateOrderStatus };
