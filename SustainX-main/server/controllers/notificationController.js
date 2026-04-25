const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// @desc    Get user notifications
// @route   GET /api/notifications

const getNotifications = async (req, res) => {
  try {
    const rawId = req.user._id || req.user.id;
    
    // Ensure we have a valid ObjectId for the query
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(rawId.toString());
    } catch (e) {
      userId = rawId; // fallback
    }

    console.log('--- DEBUG NOTIFICATIONS ---');
    console.log('Request User:', { id: req.user.id, _id: req.user._id, role: req.user.role });
    console.log('Converted Query User ID:', userId);
    
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
      
    console.log('Found Count:', notifications.length);
    console.log('---------------------------');

    res.json(notifications);
  } catch (err) {
    console.error(`❌ [NOTIFICATIONS ERROR]: ${err.message}`);
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

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Internal utility to create notifications
const createNotification = async (userId, message, type) => {
  try {
    if (!userId) {
      console.error('⚠️ [NOTIFICATION] Cannot create notification: No userId provided');
      return;
    }
    
    await Notification.create({
      user: userId,
      message,
      type
    });
    console.log(`🔔 [NOTIFICATION] Created for user ${userId}: "${message}" (${type})`);
  } catch (err) {
    console.error('❌ [NOTIFICATION ERROR]:', err.message);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
};
