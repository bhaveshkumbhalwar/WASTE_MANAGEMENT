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
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreItem',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    pointsSpent: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'ready_for_pickup', 'delivered'],
      default: 'pending',
      index: true,
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
    rewardGiven: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
