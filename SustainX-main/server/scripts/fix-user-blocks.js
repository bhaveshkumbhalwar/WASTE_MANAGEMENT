const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

const fixUserBlocks = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find users (students and collectors) with missing block
    const query = {
      role: { $in: ['student', 'collector'] },
      $or: [
        { block: { $exists: false } },
        { block: null },
        { block: '' }
      ]
    };

    const count = await User.countDocuments(query);
    console.log(`📊 Found ${count} users missing a block assignment.`);

    if (count > 0) {
      const result = await User.updateMany(query, { $set: { block: 'A' } });
      console.log(`✅ Successfully updated ${result.modifiedCount} users to default Block "A".`);
    } else {
      console.log('✨ No users found requiring update.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
};

fixUserBlocks();
