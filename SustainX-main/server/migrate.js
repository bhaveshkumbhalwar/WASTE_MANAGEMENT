require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Reward = require('./models/Reward');
const StoreItem = require('./models/StoreItem');
const Order = require('./models/Order');
const OrderLog = require('./models/OrderLog');

const migrateDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for migration');

    // 1. Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Reward.deleteMany({});
    await StoreItem.deleteMany({});
    await Order.deleteMany({});
    await OrderLog.deleteMany({});
    console.log('🗑️  Cleared existing data collections');

    // 2. Drop old indexes from User collection (specifically userId which might be unique)
    try {
      await User.collection.dropIndexes();
      console.log('🗑️  Dropped old User indexes (including userId)');
    } catch (e) {
      console.log('⚠️  No indexes to drop or index drop failed:', e.message);
    }

    // Ensure new indexes (email unique) are built
    await User.syncIndexes();
    console.log('✅ Synced User indexes');


    // 4. Seed Users with Emails
    const student = await User.create({
      email: 'student@test.com',
      password: '112233',
      role: 'student',
      name: 'Alex Johnson',
      dept: 'Computer Science',
      block: 'A',
      rewardPoints: 120,
    });

    const collector = await User.create({
      email: 'collector@test.com',
      password: '112233',
      role: 'collector',
      name: 'Ravi Kumar',
      dept: 'Waste Management',
      block: 'A',
      rewardPoints: 0,
    });

    const admin = await User.create({
      email: 'admin@test.com',
      password: '112233',
      role: 'admin',
      name: 'Dr. Priya Singh',
      dept: 'Administration',
      block: 'A',
      rewardPoints: 0,
    });

    console.log(`👤 Seeded 3 users: student, collector, admin`);

    // 5. Seed Complaints using ObjectIds
    const complaints = await Complaint.create([
      {
        complaintId: 'WMS-0001',
        user: student._id,
        location: 'Block A - Ground Floor',
        wasteType: 'Mixed Waste',
        description: 'Large pile of garbage near the entrance. Needs immediate attention.',
        block: 'A',
        assignedTo: collector._id,
        status: 'completed',
        type: 'complaint',
        statusHistory: [
          { status: 'pending', note: 'Complaint submitted', updatedBy: student._id, timestamp: new Date('2026-03-10') },
          { status: 'in-progress', note: 'Assigned to collector', updatedBy: collector._id, timestamp: new Date('2026-03-11') },
          { status: 'completed', note: 'Area cleaned', updatedBy: collector._id, timestamp: new Date('2026-03-12') },
        ],
      },
      {
        complaintId: 'WMS-0002',
        user: student._id,
        location: 'Cafeteria East Wing',
        wasteType: 'Food Waste',
        description: 'Overflow of food waste from cafeteria bins.',
        block: 'A',
        assignedTo: collector._id,
        status: 'in-progress',
        type: 'complaint',
        statusHistory: [
          { status: 'pending', note: 'Complaint submitted', updatedBy: student._id, timestamp: new Date('2026-03-13') },
          { status: 'in-progress', note: 'Collector assigned', updatedBy: collector._id, timestamp: new Date('2026-03-14') },
        ],
      },
      {
        complaintId: 'WMS-0003',
        user: student._id,
        location: 'Library 2nd Floor',
        wasteType: 'Paper Waste',
        description: 'Scattered paper waste near the photocopier station.',
        block: 'B',
        assignedTo: null,
        status: 'pending',
        type: 'complaint',
        statusHistory: [
          { status: 'pending', note: 'Complaint submitted (no collector for Block B)', updatedBy: student._id, timestamp: new Date('2026-03-15') },
        ],
      },
    ]);
    console.log(`📋 Seeded ${complaints.length} complaints`);

    // 6. Seed Rewards
    const rewards = await Reward.create([
      { user: student._id, activity: 'Waste Photo Complaint', points: 50, date: new Date('2026-03-10') },
      { user: student._id, activity: 'Dustbin Full Alert (Scan)', points: 30, date: new Date('2026-03-12') },
      { user: student._id, activity: 'Waste Photo Complaint', points: 40, date: new Date('2026-03-13') },
    ]);
    console.log(`🏆 Seeded ${rewards.length} rewards`);

    // 7. Seed Store Items
    const storeItems = await StoreItem.create([
      {
        name: 'Bamboo Toothbrush',
        description: 'Eco-friendly bamboo toothbrush with soft charcoal bristles.',
        pointsRequired: 50,
        stock: 100,
        category: 'accessories',
        image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=400',
      },
      {
        name: 'Reusable Water Bottle',
        description: 'Stainless steel vacuum insulated water bottle (500ml).',
        pointsRequired: 200,
        stock: 50,
        category: 'accessories',
        image: 'https://images.unsplash.com/photo-1602117562507-60afba820a40?auto=format&fit=crop&q=80&w=400',
      },
      {
        name: 'Canvas Tote Bag',
        description: 'Durable organic cotton tote bag for plastic-free shopping.',
        pointsRequired: 80,
        stock: 150,
        category: 'other',
        image: 'https://images.unsplash.com/photo-1544816153-1215aca8aa37?auto=format&fit=crop&q=80&w=400',
      },
      {
        name: 'Recycled Paper Notebook',
        description: 'Hardcover notebook made from 100% recycled paper.',
        pointsRequired: 120,
        stock: 80,
        category: 'stationery',
        image: 'https://images.unsplash.com/photo-1531346878377-a5ec20888f23?auto=format&fit=crop&q=80&w=400',
      },
      {
        name: 'BPA-Free Lunch Box',
        description: 'Eco-friendly, microwave safe lunch box made from wheat straw.',
        pointsRequired: 150,
        stock: 60,
        category: 'home',
        image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=400',
      },
    ]);
    console.log(`🛒 Seeded ${storeItems.length} store items`);

    console.log('\n✅ Database migration and seeding successful!');
    console.log('─────────────────────────────');
    console.log('Login with these emails (Password: 112233):');
    console.log('  Student:   student@test.com');
    console.log('  Collector: collector@test.com');
    console.log('  Admin:     admin@test.com');
    console.log('─────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
};

migrateDB();
