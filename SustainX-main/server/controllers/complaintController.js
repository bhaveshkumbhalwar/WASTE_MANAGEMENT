const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Reward = require('../models/Reward');


// Generate robust complaint ID
const generateComplaintId = async () => {
  // Sort by complaintId descending to get the highest alphanumeric ID (WMS-XXXX)
  // Filtering by prefix ensures we don't mix up with IOT- IDs
  const lastComplaint = await Complaint.findOne({ complaintId: /^WMS-/ })
    .sort({ complaintId: -1 });
    
  let nextNum = 1;
  if (lastComplaint && lastComplaint.complaintId) {
    const parts = lastComplaint.complaintId.split('-');
    if (parts.length >= 2) {
      const lastNum = parseInt(parts[1]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
  }
  return 'WMS-' + String(nextNum).padStart(4, '0');
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
        console.warn(`⚠️ [COMPLAINTS] Collector ${req.user.id} has NO block → empty result`);
        return res.json([]);
      }
      // CRITICAL: This is a MongoDB query filter, NOT JS filtering
      query.block = req.user.block;
    } else if (req.user.role === 'student') {
      query.user = req.user.id;
    }
    // admin: no mandatory filter

    // ══ OPTIONAL additive filters (admin only for cross-entity) ══
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.user && req.user.role === 'admin') {
      query.user = req.query.user;
    } else if (req.query.studentId && req.user.role === 'admin') {
      query.user = req.query.studentId; // Legacy fallback
    }
    if (req.query.block && req.user.role === 'admin') {
      query.block = req.query.block.toUpperCase();
    }

    // Debug log
    console.log(`📋 [GET /complaints] User: ${req.user.id} | Role: ${req.user.role} | Block: ${JSON.stringify(req.user.block)} | Query:`, JSON.stringify(query));

    const complaints = await Complaint.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

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
    })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Security: verify caller has access
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      return res.status(403).json({ message: 'Access denied: complaint belongs to a different block' });
    }
    if (req.user.role === 'student' && complaint.user._id.toString() !== req.user._id.toString()) {
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
    console.log("Submit Complaint Body:", req.body);
    const { location, block, wasteType, description, type, locationData } = req.body;
    const normalizedBlock = (block || 'A').toUpperCase();

    // Auto-assign logic
    const collectors = await User.find({ role: 'collector', block: normalizedBlock });
    let assignedTo = null;
    if (collectors.length > 0) {
      const randomIdx = Math.floor(Math.random() * collectors.length);
      assignedTo = collectors[randomIdx]._id;
    }

    const image = req.file ? req.file.path : "";

    // Step 5: Retry logic for collision safety
    let complaint;
    let attempts = 0;
    while (attempts < 3) {
      try {
        const complaintId = await generateComplaintId();
        complaint = await Complaint.create({
          complaintId,
          user: req.user.id,
          location,
          wasteType,
          description,
          block: normalizedBlock,
          image,
          assignedTo,
          type: type || 'complaint',
          locationData: locationData || {},
          status: 'pending',
          statusHistory: [
            {
              status: 'pending',
              note: 'Complaint submitted',
              updatedBy: req.user.id,
            },
          ],
        });
        break; // Success
      } catch (err) {
        if (err.code === 11000 && attempts < 2) {
          console.warn(`⚠️ [RETRY] Collision detected on attempt ${attempts + 1}, retrying...`);
          attempts++;
          continue;
        }
        throw err; // Re-throw if not collision or too many attempts
      }
    }

    console.log(`📋 [POST /complaints] Created ${complaint.complaintId} | Block: ${normalizedBlock}`);
    res.status(201).json(complaint);
  } catch (err) {
    console.error("COMPLAINT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update complaint status (block-enforced for collectors)
// @route   PUT /api/complaints/:id/status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note, rejectionReason } = req.body;
    
    // DEBUG LOG
    console.log(`📋 [PUT /api/complaints/${req.params.id}/status] Payload:`, JSON.stringify(req.body));

    if (!status) {
      return res.status(400).json({ message: 'Please provide a status' });
    }

    const validStatuses = ['pending', 'in-progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // STEP 2: REJECTION VALIDATION
    if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
      console.warn(`⚠️ [REJECT ERROR] Missing reason for complaint ${req.params.id}`);
      return res.status(400).json({ message: 'Rejection reason is required when rejecting a complaint.' });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id.toUpperCase(),
    });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Security: collector can only update complaints from their block
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      console.warn(`🚫 [ACCESS DENIED] Collector ${req.user.id} (Block ${req.user.block}) tried to update ${complaint.complaintId} (Block ${complaint.block})`);
      return res.status(403).json({ message: 'Access denied: cannot update complaints from another block' });
    }

    // Prevent updating already completed or rejected complaints
    if (['completed', 'rejected'].includes(complaint.status)) {
      return res.status(400).json({ message: `Cannot update a complaint that is already ${complaint.status}.` });
    }

    // STEP 3: SAVE DATA SAFELY
    if (status) complaint.status = status;

    if (status === 'rejected') {
      complaint.rejectionReason = rejectionReason.trim();
    }

    complaint.statusHistory.push({
      status,
      note: status === 'rejected'
        ? `Rejected: ${rejectionReason.trim()}`
        : (note || `Status updated to ${status}`),
      updatedBy: req.user.id,
    });

    // ── Reward Logic (Collector only — NOT for rejected) ──
    if (status === 'completed' && req.user.role === 'collector' && !complaint.rewardGiven) {
      if (complaint.assignedTo && complaint.assignedTo.toString() === req.user.id) {
        await User.findByIdAndUpdate(req.user.id, { $inc: { rewardPoints: 10 } });
        complaint.rewardGiven = true;
        await Reward.create({
          user: req.user.id,
          activity: `Resolved Complaint ${complaint.complaintId}`,
          points: 10,
        });
        console.log(`🏆 [REWARD] Collector ${req.user.id} earned 10 pts for ${complaint.complaintId}`);
      }
    }

    await complaint.save();
    console.log(`✅ [SUCCESS] ${complaint.complaintId} set to ${status}`);
    res.json(complaint);
  } catch (err) {
    console.error(`❌ [ERROR] updateComplaintStatus failed:`, err);
    res.status(500).json({ message: err.message });
  }
};


// @desc    Complete complaint with photo (collector only)
// @route   POST /api/complaints/complete/:id
const completeComplaint = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Proof of completion (image) is required.' });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id.toUpperCase(),
    });

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Validations
    if (complaint.status === 'completed') {
      return res.status(400).json({ message: 'Complaint is already marked as completed.' });
    }

    // Only assigned collector can complete
    if (complaint.assignedTo && complaint.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: only the assigned collector can complete this.' });
    }

    // Update complaint
    complaint.status = 'completed';
    complaint.completionImage = req.file.path;

    complaint.statusHistory.push({
      status: 'completed',
      note: 'Completed with image proof',
      updatedBy: req.user.id,
    });

    // Reward Logic (10 points for completion)
    if (!complaint.rewardGiven) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { rewardPoints: 10 } });
      complaint.rewardGiven = true;
      await Reward.create({
        user: req.user.id,
        activity: `Resolved Complaint ${complaint.complaintId} (with proof)`,
        points: 10,
      });
      console.log(`🏆 [REWARD] Collector ${req.user.id} earned 10 pts for ${complaint.complaintId}`);
    }

    await complaint.save();
    res.json(complaint);
  } catch (err) {
    console.error("COMPLETE COMPLAINT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


module.exports = { getComplaints, getComplaintById, submitComplaint, updateComplaintStatus, completeComplaint };
