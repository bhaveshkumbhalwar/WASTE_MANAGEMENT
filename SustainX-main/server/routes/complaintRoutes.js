










const express = require('express');
const {
  getComplaints,
  getComplaintById,
  submitComplaint,
  updateComplaintStatus,
  completeComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', protect, getComplaints);
router.get('/:id', protect, getComplaintById);
router.post('/', protect, authorize('student'), upload.single('image'), submitComplaint);
router.put('/:id/status', protect, authorize('collector', 'admin'), updateComplaintStatus);
router.post('/complete/:id', protect, authorize('collector'), upload.single('image'), completeComplaint);

module.exports = router;
