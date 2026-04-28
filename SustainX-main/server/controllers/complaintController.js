const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { uploadToCloudinary } = require('../middleware/upload');
const { createNotification } = require('./notificationController');

// @desc    Get all complaints (with role-based filtering)
// @route   GET /api/complaints
const getComplaints = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) query.status = status;

    // Role-based filtering
    if (req.user.role === 'student') {
      query.user = req.user.id;
    } else if (req.user.role === 'collector') {
      // Collectors only see complaints in their assigned block
      query.block = req.user.block;
    }

    const complaints = await Complaint.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ complaintId: req.params.id.toUpperCase() })
      .populate('user', 'name email')
      .populate('assignedTo', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Security check — extract the raw userId whether populated or not
    const complaintUserId = complaint.user?._id
      ? complaint.user._id.toString()
      : complaint.user?.toString();

    if (req.user.role === 'student' && complaintUserId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      return res.status(403).json({ message: 'Not authorized to view other blocks' });
    }

    res.json(complaint);
  } catch (err) {
    console.error("❌ [GET COMPLAINT]:", err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// @desc    Submit a new complaint
// @route   POST /api/complaints
const submitComplaint = async (req, res) => {
  try {
    const { location, wasteType, description, block, type } = req.body;

    if (!location || !wasteType || !description || !block) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Handle image upload
    let imageUrl = null;
    console.log(`📸 [SUBMIT] req.file present: ${!!req.file}`, req.file ? { fieldname: req.file.fieldname, mimetype: req.file.mimetype, size: req.file.size, hasBuffer: !!req.file.buffer } : 'NO FILE');

    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file, 'sustainx/complaints');
        console.log(`✅ [SUBMIT] Cloudinary URL: ${imageUrl}`);
      } catch (uploadErr) {
        console.error("❌ [SUBMIT] Cloudinary upload failed:", uploadErr.message);
        // Continue without image rather than failing the whole complaint
      }
    }

    const complaintId = 'COMP-' + Date.now();

    const complaint = await Complaint.create({
      complaintId,
      user: req.user.id,
      location,
      wasteType,
      description,
      block: block.toUpperCase(),
      image: imageUrl,
      type: type || 'complaint',
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          note: 'Complaint submitted',
          updatedBy: req.user.id,
          timestamp: new Date(),
        },
      ],
    });

    console.log(`✅ [SUBMIT] Saved ${complaintId} | image=${complaint.image}`);

    // ✅ Notify Student about registration
    await createNotification(
      req.user.id,
      `📢 Your complaint ${complaintId} has been registered successfully!`,
      'complaint'
    );

    // ✅ Notify Admins about new complaint
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        `📋 New complaint ${complaintId} filed in Block ${block.toUpperCase()}`,
        'complaint'
      );
    }

    res.status(201).json(complaint);
  } catch (err) {
    console.error("🔥 [SUBMIT] ERROR:", err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update complaint status (General)
// @route   PUT /api/complaints/:id/status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const { id } = req.params;

    const complaint = await Complaint.findOne({ complaintId: id.toUpperCase() });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Security
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      return res.status(403).json({ message: 'Not authorized to update other blocks' });
    }

    // If status is moving to in-progress, assign to the current collector
    if (req.user.role === 'collector' && !complaint.assignedTo) {
      complaint.assignedTo = req.user._id;
    }

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: req.user.id,
      timestamp: new Date(),
    });

    await complaint.save();

    // ✅ Notify Student about assignment if just assigned
    if (status === 'in-progress' || status === 'in_progress') {
      await createNotification(
        complaint.user,
        `🚛 Collector ${req.user.name} has picked up your complaint ${complaint.complaintId}`,
        'complaint'
      );
    }

    // ✅ Notify Student about status update
    await createNotification(
      complaint.user,
      `🔍 Complaint ${complaint.complaintId} status updated to: ${status}`,
      'complaint'
    );

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Complete complaint with image proof
// @route   POST /api/complaints/complete/:id
const completeComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🚀 [COMPLETE] Request for: ${id}`);

    // ── Step 1: Validate file ──
    if (!req.file) {
      console.log("❌ [COMPLETE] No file in request");
      return res.status(400).json({ message: 'Proof image is required.' });
    }

    console.log("📸 [COMPLETE] File received:", {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer,
    });

    // ── Step 2: Find complaint ──
    const complaint = await Complaint.findOne({ complaintId: id.toUpperCase() });
    if (!complaint) {
      console.log(`❌ [COMPLETE] Not found: ${id}`);
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // ── Step 3: Auth check ──
    const userId = (req.user._id || req.user.id).toString();
    const assignedId = complaint.assignedTo ? complaint.assignedTo.toString() : null;
    if (assignedId && assignedId !== userId) {
      console.log(`❌ [COMPLETE] Auth: user=${userId} assigned=${assignedId}`);
      return res.status(403).json({ message: 'Only the assigned collector can complete this.' });
    }

    // ── Step 4: Upload to Cloudinary ──
    let imageUrl;
    try {
      console.log("☁️ [COMPLETE] Uploading to Cloudinary...");
      imageUrl = await uploadToCloudinary(req.file, 'sustainx/completions');
      console.log("✅ [COMPLETE] Cloudinary URL:", imageUrl);
    } catch (uploadErr) {
      console.error("❌ [COMPLETE] Cloudinary FAILED:", uploadErr.message);
      return res.status(500).json({
        message: 'Image upload to Cloudinary failed',
        error: uploadErr.message,
      });
    }

    // ── Step 5: Save to DB ──
    complaint.status = 'completed';
    complaint.completionImage = imageUrl;
    complaint.statusHistory.push({
      status: 'completed',
      note: 'Completed with image proof',
      updatedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();
    console.log(`✅ [COMPLETE] DB saved: ${complaint.complaintId}`);

    // ── Step 6: Notify (non-blocking) ──
    createNotification(
      complaint.user,
      `✅ Your complaint ${complaint.complaintId} has been completed!`,
      'complaint'
    ).catch(e => console.error("⚠️ Notification error:", e.message));

    return res.json({
      success: true,
      message: 'Complaint completed successfully',
      complaintId: complaint.complaintId,
      completionImage: imageUrl,
    });

  } catch (err) {
    console.error("🔥 [COMPLETE] FATAL:", err);
    return res.status(500).json({
      message: `Server error: ${err.message}`,
      error: err.message,
    });
  }
};

module.exports = {
  getComplaints,
  getComplaintById,
  submitComplaint,
  updateComplaintStatus,
  completeComplaint,
};