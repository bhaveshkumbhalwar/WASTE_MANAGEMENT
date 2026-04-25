require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');

const debug = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected');

    const user = await User.findOne({ email: 'student@test.com' });
    if (!user) {
      console.log('❌ User student@test.com NOT FOUND');
      process.exit(1);
    }
    console.log('👤 Found User:', user._id);

    const count = await Notification.countDocuments({ user: user._id });
    console.log(`📊 Notification count for ${user._id}: ${count}`);

    const all = await Notification.find({ user: user._id });
    console.log('📄 Notifications:', JSON.stringify(all, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

debug();
