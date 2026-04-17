const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @desc    Get dashboard stats (role-aware)
// @route   GET /api/stats/dashboard
//
// Security:
//   - admin:     global stats across all complaints + user counts
//   - collector: stats scoped to their assigned block only
//   - student:   stats scoped to their own complaints only
const getDashboardStats = async (req, res) => {
  try {
    // ── Build match filter based on role ──
    const complaintMatch = {};
    if (req.user.role === 'collector') {
      if (!req.user.block) {
        // No block = no complaints — return zeros
        console.warn(`⚠️ [STATS] Collector ${req.user.userId} has NO block → zero stats`);
        return res.json({ total: 0, pending: 0, progress: 0, done: 0, students: 0, collectors: 0 });
      }
      complaintMatch.block = req.user.block;
    } else if (req.user.role === 'student') {
      complaintMatch.studentId = req.user.userId;
    }
    // Admin: no filter — global stats

    console.log(`📊 [STATS] User: ${req.user.userId} | Role: ${req.user.role} | Block: ${JSON.stringify(req.user.block)} | Match:`, JSON.stringify(complaintMatch));

    const [statusAgg, roleAgg] = await Promise.all([
      Complaint.aggregate([
        { $match: complaintMatch },
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
