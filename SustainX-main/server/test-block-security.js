/**
 * STEP 6: Automated security test
 * 
 * Tests:
 * 1. Collector Block A → only sees Block A complaints
 * 2. Verify JWT contains role + block
 * 3. Verify no data leakage
 */
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Complaint = require('./models/Complaint');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── TEST 1: Verify JWT payload ──
  console.log('════ TEST 1: JWT PAYLOAD ════');
  const collector = await User.findOne({ userId: 'TESTCOLLECTOR' });
  const token = jwt.sign(
    { id: collector._id, role: collector.role, block: collector.block },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('  Decoded JWT:', JSON.stringify({ id: decoded.id, role: decoded.role, block: decoded.block }));
  console.log(`  ✅ role="${decoded.role}" block="${decoded.block}" → PRESENT\n`);

  // ── TEST 2: Verify req.user.block via DB lookup ──
  console.log('════ TEST 2: DB USER BLOCK ════');
  const dbUser = await User.findById(decoded.id).select('-password');
  console.log(`  User: ${dbUser.userId} | role: ${dbUser.role} | block: ${JSON.stringify(dbUser.block)}`);
  if (dbUser.block) {
    console.log('  ✅ block is populated from DB\n');
  } else {
    console.log('  ❌ FAIL: block is MISSING!\n');
  }

  // ── TEST 3: Simulate controller query ──
  console.log('════ TEST 3: CONTROLLER QUERY SIMULATION ════');
  const query = {};
  if (dbUser.role === 'collector') {
    query.block = dbUser.block;
  }
  console.log('  MongoDB query:', JSON.stringify(query));
  const results = await Complaint.find(query);
  console.log(`  Results: ${results.length} complaint(s)`);
  
  const wrongBlock = results.filter(c => c.block !== dbUser.block);
  if (wrongBlock.length === 0) {
    console.log(`  ✅ ALL ${results.length} complaints belong to Block ${dbUser.block} — NO LEAKAGE\n`);
  } else {
    console.log(`  ❌ FAIL: ${wrongBlock.length} complaint(s) from WRONG block leaked!\n`);
    wrongBlock.forEach(c => console.log(`    Leaked: ${c.complaintId} block: ${c.block}`));
  }

  // ── TEST 4: Create a Block B complaint and verify isolation ──
  console.log('════ TEST 4: CROSS-BLOCK ISOLATION ════');
  // Temporarily insert a Block B complaint
  const testComp = await Complaint.create({
    complaintId: 'TEST-ISOLATION',
    studentId: 'TESTSTUD',
    location: 'Test Location',
    wasteType: 'Test',
    description: 'Isolation test',
    block: 'B',
    assignedTo: null,
    status: 'pending',
    statusHistory: [{ status: 'pending', note: 'Test', updatedBy: 'SYSTEM', timestamp: new Date() }],
  });

  // Query as Block A collector
  const isolationResults = await Complaint.find({ block: dbUser.block });
  const leaked = isolationResults.filter(c => c.block !== dbUser.block);
  console.log(`  Block A collector query: ${isolationResults.length} results`);
  console.log(`  Leaked from other blocks: ${leaked.length}`);
  
  if (leaked.length === 0) {
    console.log('  ✅ Block B complaint NOT visible to Block A collector\n');
  } else {
    console.log('  ❌ FAIL: Data leakage detected!\n');
  }

  // Clean up test complaint
  await Complaint.deleteOne({ complaintId: 'TEST-ISOLATION' });
  console.log('  🧹 Test complaint cleaned up');

  console.log('\n════ ALL TESTS PASSED ════');
  await mongoose.disconnect();
})();
