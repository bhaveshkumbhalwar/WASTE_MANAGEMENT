require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testLogin = async (email, password, role) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('User found:', user.email, 'Role:', user.role);

    const isMatch = await user.matchPassword(password);
    console.log('Password match:', isMatch);

    if (role && user.role !== role) {
      console.log('❌ Role mismatch. Expected:', role, 'Got:', user.role);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

// Test with known user from DB check
testLogin('admin@test.com', '112233', 'admin');
