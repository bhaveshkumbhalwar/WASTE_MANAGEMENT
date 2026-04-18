const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      required: true,
    },
    note: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
    },
    locationData: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, default: '' },
    },
    wasteType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    block: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      required: true,
      index: true,
    },
    assignedTo: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
      index: true,
    },
    type: {
      type: String,
      enum: ['complaint', 'scan'],
      default: 'complaint',
    },
    statusHistory: [statusHistorySchema],
    image: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
