const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — verify JWT token and attach full user to req.user
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB to ensure data is current (block might have changed)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request — this includes role, block, userId etc.
    req.user = user;
    console.log("AUTH USER:", req.user);

    // Debug: verify block is available (remove in production)
    if (user.role === 'collector') {
      console.log(`🔑 [AUTH] Collector ${user.userId} authenticated | block: ${JSON.stringify(user.block)}`);
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Role-based access
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: `Role '${req.user.role}' is not authorized` });
    }
    next();
  };
};

module.exports = { protect, authorize };
