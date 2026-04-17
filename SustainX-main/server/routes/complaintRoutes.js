const express = require('express');
const {
  getComplaints,
  getComplaintById,
  submitComplaint,
  updateComplaintStatus,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getComplaints);
router.get('/:id', protect, getComplaintById);
router.post('/', protect, authorize('student'), submitComplaint);
router.put('/:id/status', protect, authorize('collector', 'admin'), updateComplaintStatus);

module.exports = router;
