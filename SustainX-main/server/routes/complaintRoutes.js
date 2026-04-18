app.get("/api", (req, res) => {
  res.send("API is running...");
});











const express = require('express');
const {
  getComplaints,
  getComplaintById,
  submitComplaint,
  updateComplaintStatus,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', protect, getComplaints);
router.get('/:id', protect, getComplaintById);
router.post('/', protect, authorize('student'), upload.single('image'), submitComplaint);
router.put('/:id/status', protect, authorize('collector', 'admin'), updateComplaintStatus);

module.exports = router;
