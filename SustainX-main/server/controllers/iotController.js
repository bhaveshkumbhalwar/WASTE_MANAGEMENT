const Complaint = require('../models/Complaint');
const BinData = require('../models/BinData');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// @desc    Receive IoT data from ESP32 smart dustbin
// @route   POST /api/iot/data
// @access  Public (no authentication required — ESP32 devices send data directly)
const processIotData = async (req, res) => {
  try {
    console.log("📡 [IOT] BODY:", req.body);
    const { block, level, binId } = req.body;

    // 1. Validate required fields
    if (!block || level === undefined) {
      return res.status(400).json({ message: 'Missing required fields: block, level' });
    }

    const normalizedBlock = block.toUpperCase();
    const binLabel = binId || 'UNKNOWN';
    const numericLevel = Number(level);

    console.log(`📡 [IOT] Data received | Block: ${normalizedBlock} | Bin: ${binLabel} | Level: ${numericLevel}%`);

    // 2. Always save raw sensor reading to BinData
    await BinData.create({
      binId: binLabel,
      block: normalizedBlock,
      level: numericLevel,
    });
    console.log(`💾 [IOT] Sensor reading saved: ${binLabel} → ${numericLevel}%`);

    // 3. Threshold Check — only create alert if level >= 80
    if (numericLevel < 80) {
      return res.json({
        message: 'Level below threshold, no alert created',
        level: numericLevel,
        block: normalizedBlock,
        binId: binLabel
      });
    }

    // 4. Prevent Duplicate Alerts (same block + same binId if provided)
    const dupeQuery = {
      block: normalizedBlock,
      type: 'iot',
      status: { $in: ['pending', 'in-progress', 'in_progress'] }
    };
    if (binId) {
      dupeQuery.binId = binLabel;
    }

    const existing = await Complaint.findOne(dupeQuery);

    if (existing) {
      console.log(`⚠️ [IOT] Active alert already exists for Block ${normalizedBlock} Bin ${binLabel} (${existing.complaintId})`);
      return res.json({ message: 'Alert already active', complaintId: existing.complaintId });
    }

    // 5. Find Collector for the block
    const collector = await User.findOne({
      role: 'collector',
      block: normalizedBlock
    });

    // 5b. Find Admin to own the system complaint
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      // Fallback if no admin exists (should not happen in prod)
      adminUser = await User.findOne({});
    }

    // 6. Create Auto-Complaint
    const complaintId = 'IOT-' + Date.now();
    const complaint = await Complaint.create({
      complaintId,
      user: adminUser._id, // Required ObjectId — system-owned complaint
      location: `Block ${normalizedBlock} - Smart Dustbin ${binLabel}`,
      wasteType: 'Mixed Waste',
      description: `🚨 AUTOMATED IoT ALERT: Dustbin "${binLabel}" in Block ${normalizedBlock} is ${numericLevel}% FULL. Immediate collection required.`,
      block: normalizedBlock,
      status: 'pending',
      type: 'iot',
      binId: binLabel,
      assignedTo: collector ? collector._id : null,
      statusHistory: [
        {
          status: 'pending',
          note: collector
            ? `IoT Alert triggered by Bin ${binLabel}. Auto-assigned to collector (Block ${normalizedBlock})`
            : `IoT Alert triggered by Bin ${binLabel}. No collector assigned for this block.`,
          updatedBy: adminUser._id,
          timestamp: new Date()
        }
      ]
    });

    // ✅ Notify Assigned Collector
    if (collector) {
      await createNotification(
        collector._id,
        `🚨 New IoT Alert! Bin ${binLabel} in your block (${normalizedBlock}) is full!`,
        'iot'
      );
    }

    // ✅ Notify Admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        `🚨 IoT Alert: Bin ${binLabel} (Block ${normalizedBlock}) reached ${numericLevel}%!`,
        'iot'
      );
    }

    console.log(`🚨 [IOT] Auto-complaint created: ${complaintId} | Bin: ${binLabel} | Assigned to: ${collector ? collector._id : 'NONE'}`);

    res.status(201).json({
      message: 'Complaint created successfully',
      complaintId: complaint.complaintId,
      binId: binLabel,
      level: numericLevel,
      block: normalizedBlock,
      assignedTo: complaint.assignedTo
    });

  } catch (err) {
    console.error('❌ [IOT] Error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get latest bin data (most recent reading per bin)
// @route   GET /api/iot/data
// @access  Public
const getIotData = async (req, res) => {
  try {
    // Get the latest reading for each unique binId using aggregation
    const latestBins = await BinData.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$binId',
          binId: { $first: '$binId' },
          block: { $first: '$block' },
          level: { $first: '$level' },
          lastUpdated: { $first: '$createdAt' },
        }
      },
      { $sort: { block: 1, binId: 1 } }
    ]);

    console.log(`📡 [IOT] GET /data → returning ${latestBins.length} bin(s)`);
    res.json(latestBins);
  } catch (err) {
    console.error('❌ [IOT] GET Error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { processIotData, getIotData };
