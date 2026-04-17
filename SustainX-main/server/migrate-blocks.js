/**
 * Migration script: Fix existing data to have block fields.
 *
 * Run with:  node migrate-blocks.js
 *
 * What it does:
 * 1. Sets block = 'A' on any collector that has block = null
 * 2. Sets block = 'A' on any complaint that has no block field
 * 3. Re-assigns complaints to collectors based on matching block
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ── Fix collectors with null block ──
    const colResult = await User.updateMany(
      { role: 'collector', $or: [{ block: null }, { block: { $exists: false } }] },
      { $set: { block: 'A' } }
    );
    console.log(`🚛 Fixed ${colResult.modifiedCount} collector(s) → block set to "A"`);

    // ── Fix complaints with no block ──
    const compResult = await Complaint.updateMany(
      { $or: [{ block: null }, { block: { $exists: false } }] },
      { $set: { block: 'A' } }
    );
    console.log(`📋 Fixed ${compResult.modifiedCount} complaint(s) → block set to "A"`);

    // ── Re-assign unassigned complaints to matching block collectors ──
    const unassigned = await Complaint.find({
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
    });

    let assignCount = 0;
    for (const comp of unassigned) {
      const collectors = await User.find({ role: 'collector', block: comp.block });
      if (collectors.length > 0) {
        const pick = collectors[Math.floor(Math.random() * collectors.length)];
        comp.assignedTo = pick.userId;
        await comp.save();
        assignCount++;
        console.log(`  → ${comp.complaintId} assigned to ${pick.userId} (Block ${comp.block})`);
      }
    }
    console.log(`🔗 Re-assigned ${assignCount} complaint(s) to block collectors`);

    // ── Summary ──
    console.log('\n─── Current State ───');
    const allCollectors = await User.find({ role: 'collector' }, 'userId block');
    allCollectors.forEach((c) => console.log(`  Collector: ${c.userId} → Block ${c.block}`));

    const allComplaints = await Complaint.find({}, 'complaintId block assignedTo');
    allComplaints.forEach((c) =>
      console.log(`  Complaint: ${c.complaintId} → Block ${c.block} → Assigned: ${c.assignedTo || 'NONE'}`)
    );

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
};

run();
