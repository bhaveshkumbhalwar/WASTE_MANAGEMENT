const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @desc    Receive IoT data from ESP32 smart dustbin
// @route   POST /api/iot/data
// @access  Public (no authentication required — ESP32 devices send data directly)
const processIotData = async (req, res) => {
  try {
    const { block, level, binId } = req.body;

    // 1. Validate required fields
    if (!block || level === undefined) {
      return res.status(400).json({ message: 'Missing required fields: block, level' });
    }

    const normalizedBlock = block.toUpperCase();
    const binLabel = binId || 'UNKNOWN';

    console.log(`📡 [IOT] Data received | Block: ${normalizedBlock} | Bin: ${binLabel} | Level: ${level}%`);

    // 2. Threshold Check — only create alert if level >= 80
    if (level < 80) {
      return res.json({
        message: 'Level below threshold, no alert created',
        level,
        block: normalizedBlock,
        binId: binLabel
      });
    }

    // 3. Prevent Duplicate Alerts (same block + same binId if provided)
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

    // 4. Find Collector for the block
    const collector = await User.findOne({
      role: 'collector',
      block: normalizedBlock
    });

    // 4b. Find Admin to own the system complaint
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      // Fallback if no admin exists (should not happen in prod)
      adminUser = await User.findOne({});
    }

    // 5. Create Auto-Complaint
    const complaintId = 'IOT-' + Date.now();
    const complaint = await Complaint.create({
      complaintId,
      user: adminUser._id, // Required ObjectId — system-owned complaint
      location: `Block ${normalizedBlock} - Smart Dustbin ${binLabel}`,
      wasteType: 'Mixed Waste',
      description: `🚨 AUTOMATED IoT ALERT: Dustbin "${binLabel}" in Block ${normalizedBlock} is ${level}% FULL. Immediate collection required.`,
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

    console.log(`🚨 [IOT] Auto-complaint created: ${complaintId} | Bin: ${binLabel} | Assigned to: ${collector ? collector._id : 'NONE'}`);

    res.status(201).json({
      message: 'Complaint created successfully',
      complaintId: complaint.complaintId,
      binId: binLabel,
      level,
      block: normalizedBlock,
      assignedTo: complaint.assignedTo
    });

  } catch (err) {
    console.error('❌ [IOT] Error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { processIotData };
