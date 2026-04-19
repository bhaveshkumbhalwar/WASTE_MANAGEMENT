const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT with id, role, and block embedded
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      block: user.block || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { userId, password, role } = req.body;
    console.log("Login attempt:", req.body);

    if (!userId || !password) {
      return res.status(400).json({ message: 'Please provide userId and password' });
    }

    const user = await User.findOne({ userId: userId.toUpperCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Role mismatch check
    if (role && user.role !== role) {
      return res.status(401).json({
        message: `This account is not a ${role} account. Please select the correct role.`,
      });
    }

    res.json({
      token: generateToken(user),
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

    // Check if userId already exists
    const existingId = await User.findOne({ userId });
    if (existingId) {
      return res.status(400).json({ message: 'User ID already exists. Try a different email.' });
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
      token: generateToken(user),
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
