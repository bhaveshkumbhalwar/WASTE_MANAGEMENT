const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/read/:id
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Ensure user owns the notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Internal utility to create notifications
const createNotification = async (userId, message, type) => {
  try {
    await Notification.create({
      user: userId,
      message,
      type
    });
    console.log(`🔔 [NOTIFICATION] Created for user ${userId}: ${message}`);
  } catch (err) {
    console.error('❌ [NOTIFICATION ERROR]:', err.message);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createNotification
};
