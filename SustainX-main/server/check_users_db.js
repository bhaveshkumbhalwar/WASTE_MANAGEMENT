require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    const users = await User.find({}, 'email role');
    console.log('Users in DB:', users);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkUsers();
