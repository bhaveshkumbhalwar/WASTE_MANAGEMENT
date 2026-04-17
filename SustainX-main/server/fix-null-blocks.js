// Quick fix: find and patch complaints with missing block
require('dotenv').config();
const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const orphans = await Complaint.find({ $or: [{ block: null }, { block: { $exists: false } }] });
  console.log(`Found ${orphans.length} complaint(s) with null/missing block:`);
  orphans.forEach(c => console.log(`  ${c.complaintId} | block: ${JSON.stringify(c.block)} | student: ${c.studentId} | created: ${c.createdAt}`));

  if (orphans.length > 0) {
    const result = await Complaint.updateMany(
      { $or: [{ block: null }, { block: { $exists: false } }] },
      { $set: { block: 'A' } }
    );
    console.log(`\nPatched ${result.modifiedCount} complaint(s) → block set to "A"`);

    // Re-assign if needed
    for (const comp of orphans) {
      const updated = await Complaint.findById(comp._id);
      if (!updated.assignedTo) {
        const cols = await User.find({ role: 'collector', block: updated.block });
        if (cols.length > 0) {
          updated.assignedTo = cols[Math.floor(Math.random() * cols.length)].userId;
          await updated.save();
          console.log(`  ${updated.complaintId} → assigned to ${updated.assignedTo}`);
        }
      }
    }
  }

  // Final verification
  const remaining = await Complaint.find({ $or: [{ block: null }, { block: { $exists: false } }] });
  console.log(`\nRemaining null-block complaints: ${remaining.length}`);

  await mongoose.disconnect();
})();
