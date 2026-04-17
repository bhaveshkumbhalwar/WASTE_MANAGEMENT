const Complaint = require('../models/Complaint');

// Generate sequential complaint ID
const generateComplaintId = async () => {
  const count = await Complaint.countDocuments();
  return 'WMS-' + String(count + 1).padStart(4, '0');
};

// @desc    Get complaints (filtered)
// @route   GET /api/complaints
const getComplaints = async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId.toUpperCase();
    if (req.query.status) filter.status = req.query.status;

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.id.toUpperCase(),
    });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Submit complaint
// @route   POST /api/complaints
const submitComplaint = async (req, res) => {
  try {
    const { location, wasteType, description, type, locationData } = req.body;

    if (!location || !wasteType || !description) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const complaintId = await generateComplaintId();

    const complaint = await Complaint.create({
      complaintId,
      studentId: req.user.userId,
      location,
      wasteType,
      description,
      type: type || 'complaint',
      locationData: locationData || {},
      statusHistory: [
        {
          status: 'pending',
          note: 'Complaint submitted',
          updatedBy: req.user.userId,
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update complaint status
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
