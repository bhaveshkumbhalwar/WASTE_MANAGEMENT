const mongoose = require('mongoose');

const binDataSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true,
      index: true,
    },
    block: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      required: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BinData', binDataSchema);
