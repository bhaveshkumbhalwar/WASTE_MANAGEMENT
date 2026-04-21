const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    block: {
      type: String,
      index: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreItem',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    pointsUsed: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'ready_for_pickup', 'delivered'],
      default: 'pending',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedCollectorName: {
      type: String,
      default: null,
    },
    pickupLocation: {
      type: String,
      default: 'Admin Office / College Store Room',
    },
    pickupTime: {
      type: String,
      default: '10 AM – 5 PM',
    },
    pickupCode: {
      type: String,
      unique: true,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    rewardGiven: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
