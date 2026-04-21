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
    const { name, email, dept, password, block } = req.body;

    const studentBlock = block || 'A';

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Generate userId from email prefix
    const rawId = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10);
    
    let userId = rawId || 'STU' + Date.now().toString().slice(-6);

    // Ensure uniqueness by appending random digits if ID is taken
    let isUnique = await User.findOne({ userId });
    let attempts = 0;
    while (isUnique && attempts < 5) {
      const suffix = Math.floor(100 + Math.random() * 900); // 3 random digits
      userId = `${rawId}${suffix}`;
      isUnique = await User.findOne({ userId });
      attempts++;
    }

    const user = await User.create({
      userId,
      password,
      role: 'student',
      name,
      email: email.toLowerCase(),
      dept: dept || '',
      block: studentBlock,
    });

    res.status(201).json({
      token: generateToken(user),
      user: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Forgot Password Request
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ message: 'Please provide both User ID and Email' });
    }

    const user = await User.findOne({ 
      userId: userId.trim().toUpperCase(), 
      email: email.trim().toLowerCase() 
    });

    if (!user) {
      // For security, you might want to return the same message regardless of whether user exists
      // but for this project's purpose of debugging/internal use, being explicit is fine.
      return res.status(404).json({ message: 'User not found with matching ID and email.' });
    }

    // Since we don't have SMTP setup, we simulate the "Reset Email Sent"
    console.log(`🔑 [PASSWORD RESET] Request received for ${user.userId} (${user.email})`);
    
    res.json({ 
      message: 'Password reset request received. Instructions have been sent to your administrator or registered email.' 
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

module.exports = { login, register, getMe, forgotPassword };
