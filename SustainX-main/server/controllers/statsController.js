const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Order = require('../models/Order');
const OrderLog = require('../models/OrderLog');

// @desc    Get dashboard stats (role-aware)
// @route   GET /api/stats/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const complaintMatch = {};
    if (req.user.role === 'collector') {
      if (!req.user.block) return res.json({ total: 0, pending: 0, progress: 0, done: 0, students: 0, collectors: 0 });
      complaintMatch.block = req.user.block;
    } else if (req.user.role === 'student') {
      complaintMatch.studentId = req.user.userId;
    }

    const [statusAgg, roleAgg, orderStats] = await Promise.all([
      Complaint.aggregate([
        { $match: complaintMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      // Admin only: Order analytics
      req.user.role === 'admin' 
        ? Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'delivered' }),
            OrderLog.countDocuments({ action: 'failed_verification' }),
            Order.aggregate([
              { $match: { status: 'delivered' } },
              { $group: { _id: '$block', count: { $sum: 1 } } }
            ])
          ])
        : Promise.resolve([0, 0, 0, []])
    ]);

    const statusMap = {};
    statusAgg.forEach((s) => (statusMap[s._id] = s.count));

    const roleMap = {};
    roleAgg.forEach((r) => (roleMap[r._id] = r.count));

    const [totalOrders, deliveredOrders, failedAttempts, blockPerformance] = orderStats;

    res.json({
      total: (statusMap['pending'] || 0) + (statusMap['in-progress'] || 0) + (statusMap['completed'] || 0),
      pending: statusMap['pending'] || 0,
      progress: statusMap['in-progress'] || 0,
      done: statusMap['completed'] || 0,
      students: roleMap['student'] || 0,
      collectors: roleMap['collector'] || 0,
      // Advanced Metrics
      orderAnalytics: {
        total: totalOrders,
        delivered: deliveredOrders,
        completionRate: totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0,
        failedAttempts,
        blockPerformance
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getDashboardStats };
