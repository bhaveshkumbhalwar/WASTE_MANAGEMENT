const Reward = require('../models/Reward');
const User = require('../models/User');

// @desc    Get rewards for a user
// @route   GET /api/rewards
const getRewards = async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId.toUpperCase();
    else if (req.query.studentId) filter.userId = req.query.studentId.toUpperCase(); // fallback
    const rewards = await Reward.find(filter).sort({ date: -1 });
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
    const { userId, studentId, activity, points } = req.body;
    const targetId = userId || studentId;

    if (!targetId || !activity || !points) {
      return res.status(400).json({ message: 'Please provide userId, activity, and points' });
    }

    if (points < 1) {
      return res.status(400).json({ message: 'Points must be at least 1' });
    }

    // Find user and increment points
    const user = await User.findOne({ userId: targetId.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.rewardPoints = (user.rewardPoints || 0) + Number(points);
    await user.save();

    const reward = await Reward.create({
      userId: targetId.toUpperCase(),
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
