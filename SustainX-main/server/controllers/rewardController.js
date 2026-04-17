const Reward = require('../models/Reward');
const User = require('../models/User');

// @desc    Get rewards for a student
// @route   GET /api/rewards
const getRewards = async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId.toUpperCase();
    const rewards = await Reward.find(filter).sort({ date: -1 });
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Award points to student
// @route   POST /api/rewards
const addReward = async (req, res) => {
  try {
    const { studentId, activity, points } = req.body;

    if (!studentId || !activity || !points) {
      return res.status(400).json({ message: 'Please provide studentId, activity, and points' });
    }

    if (points < 1) {
      return res.status(400).json({ message: 'Points must be at least 1' });
    }

    // Find student and increment points
    const student = await User.findOne({ userId: studentId.toUpperCase() });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.rewardPoints = (student.rewardPoints || 0) + Number(points);
    await student.save();

    const reward = await Reward.create({
      studentId: studentId.toUpperCase(),
      activity,
      points: Number(points),
      date: new Date(),
    });

    res.status(201).json({ reward, updatedPoints: student.rewardPoints });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getRewards, addReward };
