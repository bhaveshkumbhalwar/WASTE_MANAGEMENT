const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: 'Please provide userId and password' });
    }

    const user = await User.findOne({ userId: userId.toUpperCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid ID or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid ID or password' });
    }

    // Role mismatch check
    if (role && user.role !== role) {
      return res.status(401).json({
        message: `This account is not a ${role} account. Please select the correct role.`,
      });
    }

    res.json({
      token: generateToken(user._id),
      user: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Register student
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, dept, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Generate userId from email prefix
    const rawId = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 12);
    const userId = rawId || 'STU' + Date.now().toString().slice(-6);

    // Check if user already exists
    const existing = await User.findOne({
      $or: [{ userId }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return res.status(400).json({ message: 'User ID or email already exists' });
    }

    const user = await User.create({
      userId,
      password,
      role: 'student',
      name,
      email: email.toLowerCase(),
      dept: dept || '',
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { login, register, getMe };
