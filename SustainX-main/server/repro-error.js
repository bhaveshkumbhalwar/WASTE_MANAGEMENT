require('dotenv').config();
const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');

async function testReject() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  const complaint = await Complaint.findOne({ complaintId: 'WMS-0006' });
  if (!complaint) {
    console.log('Complaint WMS-0006 not found. Trying WMS-0002...');
    const alt = await Complaint.findOne({ complaintId: 'WMS-0002' });
    if (!alt) {
      console.log('No complaints found to test.');
      process.exit(1);
    }
  }
  
  const target = complaint || alt;
  console.log(`Testing rejection on ${target.complaintId}...`);
  
  target.status = 'rejected';
  target.rejectionReason = 'Test Rejection';
  target.statusHistory.push({
    status: 'rejected',
    note: 'Rejected: Test Rejection',
    updatedBy: 'SYSTEM_TEST',
    timestamp: new Date()
  });
  
  try {
    await target.save();
    console.log('✅ Success! Rejection saved.');
  } catch (err) {
    console.log('❌ Failed to save rejection:');
    console.log(JSON.stringify(err, null, 2));
  }
  
  process.exit(0);
}

testReject();
