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

    // Security check
    if (req.user.role === 'student' && complaint.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'collector' && complaint.block !== req.user.block) {
      return res.status(403).json({ message: 'Not authorized to view other blocks' });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Submit a new complaint
// @route   POST /api/complaints
const submitComplaint = async (req, res) => {
  try {
    const { location, wasteType, description, block } = req.body;

    if (!location || !wasteType || !description || !block) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      console.log("📸 [SUBMIT] req.file:", {
        fieldname: req.file.fieldname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        path: req.file.path || 'N/A',
      });

      if (req.file.path || req.file.url || req.file.secure_url) {
        imageUrl = req.file.path || req.file.url || req.file.secure_url;
      } else if (req.file.buffer) {
        imageUrl = await uploadToCloudinary(req.file, 'sustainx/complaints');
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

    console.log("📸 [COMPLETE] Request received for:", id);
    
    // Detailed file logging
    if (req.file) {
      console.log("📸 [COMPLETE] req.file details:", {
        fieldname: req.file.fieldname,
        mimetype: req.file.mimetype,
        size: `${(req.file.size / 1024).toFixed(2)} KB`,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer ? req.file.buffer.length : 0,
        path: req.file.path || 'N/A',
      });
    } else {
      console.log("❌ [COMPLETE] req.file is UNDEFINED");
      return res.status(400).json({
        message: 'Image is required. Please upload a photo as proof of completion.'
      });
    }

    const complaint = await Complaint.findOne({
      complaintId: id.toUpperCase(),
    });

    if (!complaint) {
      console.log("❌ [COMPLETE] Complaint not found:", id);
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // 🔐 Security — only assigned collector can complete
    if (complaint.assignedTo && complaint.assignedTo.toString() !== req.user.id) {
      console.log("❌ [COMPLETE] Auth failure. Assigned:", complaint.assignedTo, "User:", req.user.id);
      return res.status(403).json({
        message: 'Only the assigned collector can complete this complaint'
      });
    }

    // ✅ Process Image
    let imageUrl = null;

    // Case 1: multer-storage-cloudinary already uploaded (if someone switches storage back)
    if (req.file.path || req.file.url || req.file.secure_url) {
      imageUrl = req.file.path || req.file.url || req.file.secure_url;
      console.log("🔥 [COMPLETE] Using pre-uploaded URL:", imageUrl);
    }
    // Case 2: memoryStorage — upload buffer to Cloudinary
    else if (req.file.buffer) {
      console.log("🔥 [COMPLETE] Uploading buffer to Cloudinary...");
      
      // Check for environment variables as they are common failure points in production
      if (!process.env.CLOUD_NAME || !process.env.API_KEY || !process.env.API_SECRET) {
        console.error("❌ [COMPLETE] Cloudinary environment variables are MISSING!");
        throw new Error("Server configuration error: Cloudinary credentials missing");
      }

      try {
        imageUrl = await uploadToCloudinary(req.file, 'sustainx/completions');
        console.log("🔥 [COMPLETE] Cloudinary upload successful:", imageUrl);
      } catch (uploadErr) {
        console.error("❌ [COMPLETE] Cloudinary upload failed:", uploadErr);
        return res.status(500).json({
          message: 'Failed to upload completion image to cloud storage',
          error: uploadErr.message
        });
      }
    }

    if (!imageUrl) {
      console.error("❌ [COMPLETE] Image upload resulted in null URL");
      return res.status(500).json({
        message: 'Image upload failed — no URL was returned from Cloudinary'
      });
    }

    // ✅ Update Complaint
    complaint.status = 'completed';
    complaint.completionImage = imageUrl;

    complaint.statusHistory.push({
      status: 'completed',
      note: 'Completed with image proof',
      updatedBy: req.user.id,
      timestamp: new Date()
    });

    await complaint.save();

    console.log(`✅ [COMPLETE] ${complaint.complaintId} saved successfully`);

    // ✅ Notify Student
    try {
      await createNotification(
        complaint.user,
        `✅ Great news! Your complaint ${complaint.complaintId} has been completed!`,
        'complaint'
      );
    } catch (notifErr) {
      console.error("⚠️ [COMPLETE] Notification failed but complaint saved:", notifErr.message);
      // Don't fail the whole request if notification fails
    }

    res.json({
      success: true,
      message: 'Completed successfully',
      complaintId: complaint.complaintId,
      completionImage: imageUrl
    });

  } catch (err) {
    console.error("🔥 [COMPLETE] FATAL ERROR:", err);
    res.status(500).json({
      message: 'Internal server error while completing complaint',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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