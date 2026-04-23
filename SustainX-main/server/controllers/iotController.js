const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @desc    Receive IoT data from ESP32
// @route   POST /api/iot/data
const processIotData = async (req, res) => {
  try {
    const { block, level } = req.body;
    const apiKey = req.headers['x-api-key'];

    // 1. Security Check
    if (apiKey !== process.env.IOT_SECRET) {
      console.warn(`🔐 [IOT] Unauthorized access attempt from block: ${block}`);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!block || level === undefined) {
      return res.status(400).json({ message: 'Missing block or level' });
    }

    console.log(`📡 [IOT] Data received | Block: ${block} | Level: ${level}%`);

    // 2. Threshold Check
    if (level < 80) {
      return res.json({ message: 'Level below threshold, no alert created' });
    }

    // 3. Prevent Duplicate Alerts
    const existing = await Complaint.findOne({
      block,
      type: 'iot',
      status: { $in: ['pending', 'in-progress', 'in_progress'] }
    });

    if (existing) {
      console.log(`⚠️ [IOT] Active alert already exists for Block ${block} (${existing.complaintId})`);
      return res.json({ message: 'Alert already active', complaintId: existing.complaintId });
    }

    // 4. Find Collector for the block
    const collector = await User.findOne({
      role: 'collector',
      block: block.toUpperCase()
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
      user: adminUser._id, // Required ObjectId
      location: `Block ${block} - Smart Dustbin`,
      wasteType: 'Mixed Waste',
      description: `AUTOMATED ALERT: Dustbin in Block ${block} is reported ${level}% FULL by sensor.`,
      block: block.toUpperCase(),
      status: 'pending',
      type: 'iot',
      assignedTo: collector ? collector._id : null,
      statusHistory: [
        {
          status: 'pending',
          note: collector 
            ? `IoT Alert triggered. Auto-assigned to collector (Block ${block})`
            : 'IoT Alert triggered. No collector assigned for this block.',
          updatedBy: adminUser._id,
          timestamp: new Date()
        }
      ]
    });

    console.log(`🚨 [IOT] Auto-complaint created: ${complaintId} | Assigned to: ${collector ? collector._id : 'NONE'}`);

    res.status(201).json({
      message: 'Complaint created successfully',
      complaintId: complaint.complaintId,
      assignedTo: complaint.assignedTo
    });

  } catch (err) {
    console.error('❌ [IOT] Error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { processIotData };
