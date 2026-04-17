const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all users (admin)
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id.toUpperCase() }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Create user (admin)
// @route   POST /api/users
const createUser = async (req, res) => {
  try {
    const { userId, role, name, email, dept, password } = req.body;

    if (!userId || !name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const existing = await User.findOne({
      $or: [{ userId: userId.toUpperCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return res.status(400).json({ message: 'User ID or email already exists' });
    }

    const user = await User.create({
      userId: userId.toUpperCase(),
      password,
      role: role || 'student',
      name,
      email: email.toLowerCase(),
      dept: dept || '',
    });

    res.status(201).json(user.toJSON());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update user fields
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only allow self-update or admin
    if (req.user.role !== 'admin' && req.user.userId !== user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowedFields = ['name', 'email', 'dept', 'avatar'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    await user.save();
    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Change password
// @route   PUT /api/users/:id/password
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide old and new passwords' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ userId: req.params.id.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only allow self-update
    if (req.user.userId !== user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.id.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User ${user.name} deleted` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, changePassword, deleteUser };
