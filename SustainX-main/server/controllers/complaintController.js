const Complaint = require('../models/Complaint');
const User = require('../models/User');

// Generate sequential complaint ID
const generateComplaintId = async () => {
  const count = await Complaint.countDocuments();
  return 'WMS-' + String(count + 1).padStart(4, '0');
};

// @desc    Get complaints (role-based filtered at DB query level)
// @route   GET /api/complaints
//
// SECURITY ENFORCEMENT (MongoDB query level — not JS filtering):
//   - collector: ONLY complaints where complaint.block === user.block
//   - student:   ONLY complaints where complaint.studentId === user.userId
//   - admin:     ALL complaints (optional query filters apply)
const getComplaints = async (req, res) => {
  try {
    const query = {};

    // ══ MANDATORY role-based filters (CANNOT be overridden) ══
    if (req.user.role === 'collector') {
      if (!req.user.block) {
        console.warn(`⚠️ [COMPLAINTS] Collector ${req.user.userId} has NO block → empty result`);
        return res.json([]);
      }
      // CRITICAL: This is a MongoDB query filter, NOT JS filtering
      query.block = req.user.block;
    } else if (req.user.role === 'student') {
      query.studentId = req.user.userId;
    }
    // admin: no mandatory filter

    // ══ OPTIONAL additive filters (admin only for cross-entity) ══
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.studentId && req.user.role === 'admin') {
      query.studentId = req.query.studentId.toUpperCase();
    }
    if (req.query.block && req.user.role === 'admin') {
      query.block = req.query.block.toUpperCase();
    }

    // Debug log
    console.log(`📋 [GET /complaints] User: ${req.user.userId} | Role: ${req.user.role} | Block: ${JSON.stringify(req.user.block)} | Query:`, JSON.stringify(query));

    const complaints = await Complaint.find(query).sort({ createdAt: -1 });

    console.log(`📋 [GET /complaints] → ${complaints.length} result(s)`);

    res.json(complaints);
  } catch (err) {
    console.error(`❌ [GET /complaints] Error:`, err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get single complaint (role-enforced)
// @route   GET /api/complaints/:id
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.id.toUpperCase(),
    });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Security: verify caller has access
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      return res.status(403).json({ message: 'Access denied: complaint belongs to a different block' });
    }
    if (req.user.role === 'student' && complaint.studentId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied: this is not your complaint' });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Submit complaint (block is required)
// @route   POST /api/complaints
const submitComplaint = async (req, res) => {
  try {
    const { location, wasteType, description, block, type, locationData } = req.body;

    if (!location || !wasteType || !description || !block) {
      return res.status(400).json({ message: 'Please fill all required fields (including block)' });
    }

    const validBlocks = ['A', 'B', 'C', 'D', 'E'];
    const normalizedBlock = block.toUpperCase();
    if (!validBlocks.includes(normalizedBlock)) {
      return res.status(400).json({ message: 'Invalid block. Must be A, B, C, D, or E.' });
    }

    const complaintId = await generateComplaintId();

    // Auto-assign to a collector with the same block
    let assignedTo = null;
    const collectors = await User.find({ role: 'collector', block: normalizedBlock });
    if (collectors.length > 0) {
      const randomIdx = Math.floor(Math.random() * collectors.length);
      assignedTo = collectors[randomIdx].userId;
    }

    // Image from multer (optional)
    const image = req.file ? req.file.filename : null;

    const complaint = await Complaint.create({
      complaintId,
      studentId: req.user.userId,
      location,
      wasteType,
      description,
      block: normalizedBlock,
      assignedTo,
      type: type || 'complaint',
      locationData: locationData || {},
      image,
      statusHistory: [
        {
          status: 'pending',
          note: assignedTo
            ? `Complaint submitted and auto-assigned to collector ${assignedTo} (Block ${normalizedBlock})`
            : `Complaint submitted (no collector available for Block ${normalizedBlock})`,
          updatedBy: req.user.userId,
          timestamp: new Date(),
        },
      ],
    });

    console.log(`📋 [POST /complaints] Created ${complaintId} | Block: ${normalizedBlock} | Assigned: ${assignedTo || 'NONE'}`);

    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update complaint status (block-enforced for collectors)
// @route   PUT /api/complaints/:id/status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Please provide a status' });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id.toUpperCase(),
    });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Security: collector can only update complaints from their block
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      console.warn(`🚫 [PUT /complaints] Collector ${req.user.userId} (Block ${req.user.block}) tried to update ${complaint.complaintId} (Block ${complaint.block})`);
      return res.status(403).json({ message: 'Access denied: cannot update complaints from another block' });
    }

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: req.user.userId,
      timestamp: new Date(),
    });

    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getComplaints, getComplaintById, submitComplaint, updateComplaintStatus };
