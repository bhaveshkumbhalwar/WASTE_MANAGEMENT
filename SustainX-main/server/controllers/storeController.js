const StoreItem = require('../models/StoreItem');
const Order = require('../models/Order');
const User = require('../models/User');
const Reward = require('../models/Reward');

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

// @desc    Redeem item (student/collector)
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

    // ── Generate Unique 6-Char Pickup Code ──
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      exists = await Order.findOne({ pickupCode: code });
    }

    const order = await Order.create({
      orderId,
      userId: user.userId,
      userName: user.name,
      item: item._id,
      itemName: item.name,
      pointsSpent: item.pointsRequired,
      pickupCode: code,
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

    const validStatuses = ['pending', 'approved', 'ready_for_pickup', 'delivered'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findOne({ orderId: req.params.id.toUpperCase() });
    // ── Strict Status Transition Validation ──
    const validTransitions = {
      pending: ['approved'],
      approved: ['ready_for_pickup'],
      ready_for_pickup: ['delivered'],
    };

    if (validTransitions[order.status] && !validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition: ${order.status} → ${status}. Allowed: ${validTransitions[order.status].join(', ')}`,
      });
    }

    order.status = status;

    // ── Reward Logic (Collector only) ──
    if (status === 'delivered' && req.user.role === 'collector' && !order.rewardGiven) {
      // Atomic increment of collector's rewardPoints
      const collector = await User.findOneAndUpdate(
        { userId: req.user.userId },
        { $inc: { rewardPoints: 20 } },
        { new: true }
      );

      if (collector) {
        order.rewardGiven = true;
        // Create Reward Log entry
        await Reward.create({
          userId: req.user.userId,
          activity: `Delivered Order ${order.orderId}`,
          points: 20,
        });
        console.log(`🏆 [REWARD] Collector ${req.user.userId} earned 20 pts for delivery ${order.orderId}`);
      }
    }

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


module.exports = { getStoreItems, createStoreItem, redeemItem, getOrders, updateOrderStatus };
