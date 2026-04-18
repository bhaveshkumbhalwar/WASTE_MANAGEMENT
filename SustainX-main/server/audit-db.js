require('dotenv').config();
const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');

async function audit() {
  await mongoose.connect(process.env.MONGO_URI);
  const complaints = await Complaint.find({});
  console.log(`Auditing ${complaints.length} complaints...`);
  
  for (const c of complaints) {
    try {
      await c.validate();
    } catch (err) {
      console.log(`❌ Validation failed for ${c.complaintId}:`, err.message);
    }
  }
  process.exit(0);
}

audit();
