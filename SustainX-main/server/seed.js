require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Reward = require('./models/Reward');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Reward.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed Users
    const users = await User.create([
      {
        userId: 'TESTSTUD',
        password: '112233',
        role: 'student',
        name: 'Alex Johnson',
        email: 'alex.johnson@campus.edu',
        dept: 'Computer Science',
        rewardPoints: 120,
      },
      {
        userId: 'TESTCOLLECTOR',
        password: '112233',
        role: 'collector',
        name: 'Ravi Kumar',
        email: 'ravi.kumar@campus.edu',
        dept: 'Waste Management',
        block: 'A',
        rewardPoints: 0,
      },
      {
        userId: 'TESTADMIN',
        password: '112233',
        role: 'admin',
        name: 'Dr. Priya Singh',
        email: 'admin@campus.edu',
        dept: 'Administration',
        rewardPoints: 0,
      },
    ]);
    console.log(`👤 Seeded ${users.length} users`);

    // Seed Complaints
    const complaints = await Complaint.create([
      {
        complaintId: 'WMS-0001',
        studentId: 'TESTSTUD',
        location: 'Block A - Ground Floor',
        wasteType: 'Mixed Waste',
        description: 'Large pile of garbage near the entrance. Needs immediate attention.',
        block: 'A',
        assignedTo: 'TESTCOLLECTOR',
        status: 'completed',
        type: 'complaint',
        statusHistory: [
          { status: 'pending', note: 'Complaint submitted', updatedBy: 'TESTSTUD', timestamp: new Date('2026-03-10') },
          { status: 'in-progress', note: 'Assigned to collector', updatedBy: 'TESTCOLLECTOR', timestamp: new Date('2026-03-11') },
          { status: 'completed', note: 'Area cleaned', updatedBy: 'TESTCOLLECTOR', timestamp: new Date('2026-03-12') },
        ],
      },
      {
        complaintId: 'WMS-0002',
        studentId: 'TESTSTUD',
        location: 'Cafeteria East Wing',
        wasteType: 'Food Waste',
        description: 'Overflow of food waste from cafeteria bins.',
        block: 'A',
        assignedTo: 'TESTCOLLECTOR',
        status: 'in-progress',
        type: 'complaint',
        statusHistory: [
          { status: 'pending', note: 'Complaint submitted', updatedBy: 'TESTSTUD', timestamp: new Date('2026-03-13') },
          { status: 'in-progress', note: 'Collector assigned', updatedBy: 'TESTCOLLECTOR', timestamp: new Date('2026-03-14') },
        ],
      },
      {
        complaintId: 'WMS-0003',
        studentId: 'TESTSTUD',
        location: 'Library 2nd Floor',
        wasteType: 'Paper Waste',
        description: 'Scattered paper waste near the photocopier station.',
        block: 'B',
        assignedTo: null,
        status: 'pending',
        type: 'complaint',
        statusHistory: [
          { status: 'pending', note: 'Complaint submitted (no collector for Block B)', updatedBy: 'TESTSTUD', timestamp: new Date('2026-03-15') },
        ],
      },
    ]);
    console.log(`📋 Seeded ${complaints.length} complaints`);

    // Seed Rewards
    const rewards = await Reward.create([
      { studentId: 'TESTSTUD', activity: 'Waste Photo Complaint', points: 50, date: new Date('2026-03-10') },
      { studentId: 'TESTSTUD', activity: 'Dustbin Full Alert (Scan)', points: 30, date: new Date('2026-03-12') },
      { studentId: 'TESTSTUD', activity: 'Waste Photo Complaint', points: 40, date: new Date('2026-03-13') },
    ]);
    console.log(`🏆 Seeded ${rewards.length} rewards`);

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────');
    console.log('Test Accounts (password: 112233):');
    console.log('  Student:   TESTSTUD');
    console.log('  Collector: TESTCOLLECTOR');
    console.log('  Admin:     TESTADMIN');
    console.log('─────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seedDB();
