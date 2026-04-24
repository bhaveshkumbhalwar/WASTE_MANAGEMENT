const StoreItem = require('../models/StoreItem');
const Order = require('../models/Order');
const User = require('../models/User');
const Reward = require('../models/Reward');

const OrderLog = require('../models/OrderLog');

// ── Generate sequential order ID ──
const generateOrderId = async () => {
  const lastOrder = await Order.findOne({ orderId: /^ORD-/ }).sort({ orderId: -1 });
  let nextNum = 1;
  if (lastOrder && lastOrder.orderId) {
    const parts = lastOrder.orderId.split('-');
    if (parts.length >= 2) {
      const lastNum = parseInt(parts[1]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
  }
  return 'ORD-' + String(nextNum).padStart(4, '0');
};

// HELPER: Audit logging
const createAuditLog = async (orderId, action, userId, details = '') => {
  try {
    await OrderLog.create({ orderId, action, performedBy: userId, details });
  } catch (err) {
    console.error(`❌ [AUDIT] Failed to log ${action} for ${orderId}:`, err.message);
  }
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
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
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
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// REDEEM
// ──────────────────────────────────────────────────────────────

// @desc    Redeem item (student/collector)
// @route   POST /api/store/redeem
const redeemItem = async (req, res) => {
  try {
    console.log("USER:", req.user);
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
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // NEW: Check for block assignment BEFORE saving (prevents validation crash)
    if (!user.block) {
      return res.status(400).json({
        message: 'Your account lacks a Campus Block assignment. Please update your profile or contact administrator before redeeming.',
      });
    }

    // 4. Check points
    if (user.rewardPoints < item.pointsRequired) {
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

    // ── Generate Unique 6-Char Pickup Code ──
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      exists = await Order.findOne({ pickupCode: code });
    }

    // ── Generate Expiration Date (24h) ──
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 8. Create order
    const orderId = await generateOrderId();

    const order = await Order.create({
      orderId,
      userName: user.name,
      user: user._id, // Relation using _id
      block: user.block,
      item: item._id,
      itemName: item.name,
      pointsUsed: item.pointsRequired,
      pickupCode: code,
      expiresAt,
    });

    console.log(`🛒 [ORDER] Created: ${order.orderId} | Block: ${order.block} | User: ${user._id}`);

    res.status(201).json({
      order,
      remainingPoints: user.rewardPoints,
    });
  } catch (err) {
    console.error("REDEEM ERROR:", err);
    res.status(500).json({ message: err.message });
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
      query.user = req.user._id;
    }

    // Collectors: see unassigned orders OR orders assigned specifically to me (NO block filter)
    if (req.user.role === 'collector') {
      query.$or = [
        { assignedTo: null },
        { assignedTo: req.user._id }
      ];
    }

    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    let select = '';
    // Collector can only see code AFTER delivery (for receipt)
    if (req.user.role === 'collector' && req.query.status !== 'delivered') {
      select = '-pickupCode';
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('item', 'name image pointsRequired')
      .select(select)
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
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
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // ── Security Check (Collector) ──
    if (req.user.role === 'collector' && order.block !== req.user.block) {
      console.warn(`🚫 [ACCESS DENIED] Collector ${req.user._id} tried to update Order ${order.orderId} (Block ${order.block})`);
      return res.status(403).json({ message: 'Access denied: cannot update orders from another block' });
    }

    // ── Expiration & Lockout Checks ──
    if (order.status !== 'delivered') {
      if (order.expiresAt && new Date() > order.expiresAt) {
        return res.status(400).json({ message: 'This pickup order has expired. Please contact admin for a reset.' });
      }
      if (order.failedAttempts >= 3) {
        await createAuditLog(order.orderId, 'locked', req.user._id, 'Too many failed attempts');
        return res.status(400).json({ message: 'Order is locked due to multiple failed verification attempts.' });
      }
    }

    // ── Delivery Verification Step ──
    if (status === 'delivered') {
      const { verificationCode } = req.body;
      if (!verificationCode) {
        return res.status(400).json({ message: 'Pickup code is required for delivery confirmation.' });
      }
      
      if (verificationCode.toUpperCase() !== order.pickupCode.toUpperCase()) {
        order.failedAttempts += 1;
        await order.save();
        await createAuditLog(order.orderId, 'failed_verification', req.user._id, `Attempt ${order.failedAttempts}`);
        return res.status(400).json({ 
          message: 'Invalid pickup code. Please check your code and try again.',
        });
      }
      // Success!
      order.deliveredAt = new Date();
      await createAuditLog(order.orderId, 'delivered', req.user._id);
    }

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
      const collector = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { rewardPoints: 20 } },
        { new: true }
      );

      if (collector) {
        order.rewardGiven = true;
        // Create Reward Log entry
        await Reward.create({
          user: req.user._id, // Relation using _id
          activity: `Delivered Order ${order.orderId}`,
          points: 20,
        });
        console.log(`🏆 [REWARD] Collector ${req.user._id} earned 20 pts for delivery ${order.orderId}`);
      }
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


// @desc    Get order by ID (role-enforced)
// @route   GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    let select = '';
    // Fetch first to check status, or just use a conditional selection
    // Since getOrderById usually fetches a specific order, we can check status after fetch
    // But .select() happens during fetch. Let's fetch the status first or just select it and then filter.
    // Actually, we can just fetch the whole thing and null out the code in the response if not delivered.
    
    const order = await Order.findOne({
      orderId: req.params.id.toUpperCase(),
    }).populate('user', 'name email');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Hide code for collectors if NOT delivered
    if (req.user.role === 'collector' && order.status !== 'delivered') {
      order.pickupCode = undefined;
    }

    // Security: collector/admin can see, student only if it's their own
    if (req.user.role === 'student' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'collector' && order.block !== req.user.block) {
      console.warn(`🚫 [ACCESS DENIED] Collector ${req.user._id} tried to view Order ${order.orderId} (Block ${order.block})`);
      return res.status(403).json({ message: 'Access denied: order belongs to another block' });
    }

    // Audit Log: Viewed
    await createAuditLog(order.orderId, 'viewed', req.user._id);

    res.json(order);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

const assignOrder = async (req, res) => {
  try {
    console.log("--- ASSIGN DEBUG ---");
    console.log("Order ID from Params:", req.params.id);
    console.log("Collector ID from Auth:", req.user._id);

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.error("❌ Order NOT found by _id");
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log("Current order.assignedTo:", order.assignedTo);

    // 1. Concurrency Check: Ensure not already assigned
    if (order.assignedTo) {
      return res.status(400).json({ message: `Order already assigned to ${order.assignedCollectorName}` });
    }

    // 2. Perform Assignment
    order.assignedTo = req.user._id;
    order.assignedCollectorName = req.user.name;
    
    // Auto-approve unassigned orders when taken
    if (order.status === 'pending') {
      order.status = 'approved';
    }

    await order.save();
    
    console.log(`🤝 [SUCCESS] Order ${order.orderId} taken by Collector ${req.user._id}`);
    res.json(order);
  } catch (err) {
    console.error("ASSIGN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStoreItems, createStoreItem, redeemItem, getOrders, updateOrderStatus, getOrderById, assignOrder };
