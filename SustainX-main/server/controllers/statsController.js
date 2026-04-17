const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @desc    Get dashboard stats (dynamic aggregation)
// @route   GET /api/stats/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const [statusAgg, roleAgg] = await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusMap = {};
    statusAgg.forEach((s) => (statusMap[s._id] = s.count));

    const roleMap = {};
    roleAgg.forEach((r) => (roleMap[r._id] = r.count));

    const total =
      (statusMap['pending'] || 0) +
      (statusMap['in-progress'] || 0) +
      (statusMap['completed'] || 0);

    res.json({
      total,
      pending: statusMap['pending'] || 0,
      progress: statusMap['in-progress'] || 0,
      done: statusMap['completed'] || 0,
      students: roleMap['student'] || 0,
      collectors: roleMap['collector'] || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getDashboardStats };
