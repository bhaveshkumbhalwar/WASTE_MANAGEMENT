require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a student to notify
    const user = await User.findOne({ role: 'student' });
    if (!user) {
      console.error('❌ No student found to notify. Register one first!');
      process.exit(1);
    }

    console.log(`🚀 Seeding notifications for: ${user.name} (${user.email})`);

    const examples = [
      {
        user: user._id,
        message: '🎉 Welcome to SustainX! 100 bonus points credited to your account.',
        type: 'reward',
        isRead: false
      },
      {
        user: user._id,
        message: '📢 Your complaint COMP-1714061800 has been registered in Block A.',
        type: 'complaint',
        isRead: false
      },
      {
        user: user._id,
        message: '🚨 IoT Alert: Smart Dustbin in your area reached 85% capacity!',
        type: 'iot',
        isRead: false
      },
      {
        user: user._id,
        message: '✅ Success! Your redemption for "Recycled Notebook" is ready for pickup.',
        type: 'reward',
        isRead: false
      }
    ];

    await Notification.insertMany(examples);
    console.log('✅ Successfully seeded 4 example notifications!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding:', err.message);
    process.exit(1);
  }
};

seed();
