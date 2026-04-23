const Reward = require('../models/Reward');
const User = require('../models/User');

// @desc    Get rewards for a user
// @route   GET /api/rewards
const getRewards = async (req, res) => {
  try {
    const filter = {};
    if (req.query.user) filter.user = req.query.user;
    else if (req.query.studentId) filter.user = req.query.studentId; // fallback mapping
    const rewards = await Reward.find(filter).populate('user', 'name email').sort({ date: -1 });
    res.json(rewards);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Award points to user
// @route   POST /api/rewards
const addReward = async (req, res) => {
  try {
    const { user: targetId, studentId, activity, points } = req.body;
    const finalTargetId = targetId || studentId;

    if (!finalTargetId || !activity || !points) {
      return res.status(400).json({ message: 'Please provide user, activity, and points' });
    }

    if (points < 1) {
      return res.status(400).json({ message: 'Points must be at least 1' });
    }

    // Find user and increment points
    const user = await User.findById(finalTargetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.rewardPoints = (user.rewardPoints || 0) + Number(points);
    await user.save();

    const reward = await Reward.create({
      user: user._id, // Relation using _id
      activity,
      points: Number(points),
      date: new Date(),
    });

    res.status(201).json({ reward, updatedPoints: user.rewardPoints });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getRewards, addReward };
