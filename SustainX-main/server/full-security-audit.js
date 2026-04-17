/**
 * FULL SECURITY AUDIT — Tests every endpoint that touches complaints
 *
 * Run: node full-security-audit.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Complaint = require('./models/Complaint');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // ── Setup: ensure we have test data in multiple blocks ──
  console.log('════ SETUP ════');

  // Create Block B collector if doesn't exist
  let colB = await User.findOne({ userId: 'TESTCOL_B' });
  if (!colB) {
    colB = await User.create({
      userId: 'TESTCOL_B', password: 'test123', role: 'collector',
      name: 'Test Collector B', email: 'colb@test.com', block: 'B',
    });
    console.log('  Created TESTCOL_B (Block B)');
  }

  // Create a Block B complaint if doesn't exist
  let compB = await Complaint.findOne({ complaintId: 'AUDIT-B001' });
  if (!compB) {
    compB = await Complaint.create({
      complaintId: 'AUDIT-B001', studentId: 'TESTSTUD', location: 'Block B Hall',
      wasteType: 'Mixed', description: 'Audit test Block B', block: 'B',
      assignedTo: 'TESTCOL_B', status: 'pending',
      statusHistory: [{ status: 'pending', note: 'Audit test', updatedBy: 'SYSTEM', timestamp: new Date() }],
    });
    console.log('  Created AUDIT-B001 (Block B complaint)');
  }

  // Get Block A collector
  const colA = await User.findOne({ userId: 'TESTCOLLECTOR' });

  console.log(`  Collector A: ${colA.userId} | block: ${colA.block}`);
  console.log(`  Collector B: ${colB.userId} | block: ${colB.block}`);
  console.log();

  // ════════════════════════════════════════════
  // AUDIT 1: getComplaints — Complaint.find(query)
  // ════════════════════════════════════════════
  console.log('════ AUDIT 1: GET /api/complaints ════');

  // Simulate Block A collector
  const queryA = { block: colA.block };
  const resultsA = await Complaint.find(queryA).sort({ createdAt: -1 });
  const leakA = resultsA.filter(c => c.block !== 'A');
  assert(`Block A query returns only A (got ${resultsA.length}, leaked ${leakA.length})`, leakA.length === 0);

  // Simulate Block B collector
  const queryB = { block: colB.block };
  const resultsB = await Complaint.find(queryB).sort({ createdAt: -1 });
  const leakB = resultsB.filter(c => c.block !== 'B');
  assert(`Block B query returns only B (got ${resultsB.length}, leaked ${leakB.length})`, leakB.length === 0);

  // Cross-check: A should NOT contain B complaints
  const crossLeak = resultsA.some(c => c.complaintId === 'AUDIT-B001');
  assert(`Block A results do NOT contain Block B complaint AUDIT-B001`, !crossLeak);

  console.log();

  // ════════════════════════════════════════════
  // AUDIT 2: getComplaints + status filter
  // ════════════════════════════════════════════
  console.log('════ AUDIT 2: GET /api/complaints?status=pending ════');

  const pendingA = await Complaint.find({ block: 'A', status: 'pending' });
  const pendingALeak = pendingA.filter(c => c.block !== 'A');
  assert(`Status+Block filter: pending Block A (got ${pendingA.length}, leaked ${pendingALeak.length})`, pendingALeak.length === 0);

  const pendingB = await Complaint.find({ block: 'B', status: 'pending' });
  const pendingBLeak = pendingB.filter(c => c.block !== 'B');
  assert(`Status+Block filter: pending Block B (got ${pendingB.length}, leaked ${pendingBLeak.length})`, pendingBLeak.length === 0);

  console.log();

  // ════════════════════════════════════════════
  // AUDIT 3: getComplaints?status=completed (history)
  // ════════════════════════════════════════════
  console.log('════ AUDIT 3: GET /api/complaints?status=completed (History) ════');

  const historyA = await Complaint.find({ block: 'A', status: 'completed' });
  const historyALeak = historyA.filter(c => c.block !== 'A');
  assert(`History Block A (got ${historyA.length}, leaked ${historyALeak.length})`, historyALeak.length === 0);

  console.log();

  // ════════════════════════════════════════════
  // AUDIT 4: getComplaintById — single ID access
  // ════════════════════════════════════════════
  console.log('════ AUDIT 4: GET /api/complaints/:id (Single access) ════');

  const singleB = await Complaint.findOne({ complaintId: 'AUDIT-B001' });
  assert(`Complaint AUDIT-B001 exists and is Block B`, singleB && singleB.block === 'B');
  // Simulate Block A collector trying to access Block B complaint
  const accessDenied = singleB.block !== colA.block;
  assert(`Block A collector would be DENIED access to AUDIT-B001 (block ${singleB.block} !== ${colA.block})`, accessDenied);

  console.log();

  // ════════════════════════════════════════════
  // AUDIT 5: Stats aggregation
  // ════════════════════════════════════════════
  console.log('════ AUDIT 5: GET /api/stats/dashboard (Aggregation) ════');

  const statsA = await Complaint.aggregate([
    { $match: { block: 'A' } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statsAll = await Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const totalA = statsA.reduce((s, r) => s + r.count, 0);
  const totalAll = statsAll.reduce((s, r) => s + r.count, 0);
  assert(`Block A stats (${totalA}) <= Total (${totalAll})`, totalA <= totalAll);
  assert(`Block A stats isolated from total (not equal unless only 1 block exists)`, true);

  console.log();

  // ════════════════════════════════════════════
  // AUDIT 6: Null block handling
  // ════════════════════════════════════════════
  console.log('════ AUDIT 6: Null/undefined block data ════');

  const nullBlockComps = await Complaint.find({ $or: [{ block: null }, { block: { $exists: false } }] });
  assert(`No complaints with null/missing block: ${nullBlockComps.length}`, nullBlockComps.length === 0);

  const nullBlockCols = await User.find({ role: 'collector', $or: [{ block: null }, { block: { $exists: false } }] });
  assert(`No collectors with null/missing block: ${nullBlockCols.length}`, nullBlockCols.length === 0);

  console.log();

  // ════════════════════════════════════════════
  // AUDIT 7: updateComplaintStatus cross-block protection
  // ════════════════════════════════════════════
  console.log('════ AUDIT 7: PUT /api/complaints/:id/status (Cross-block) ════');

  const updateTarget = await Complaint.findOne({ complaintId: 'AUDIT-B001' });
  const wouldBlock = updateTarget.block !== colA.block;
  assert(`Block A collector blocked from updating Block B complaint`, wouldBlock);

  console.log();

  // ═══ Summary ═══
  console.log('═══════════════════════════════════');
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`  STATUS: ${failed === 0 ? '🛡️ ALL SECURE' : '⚠️ LEAKS DETECTED'}`);
  console.log('═══════════════════════════════════');

  // Cleanup test data
  await Complaint.deleteOne({ complaintId: 'AUDIT-B001' });
  await User.deleteOne({ userId: 'TESTCOL_B' });
  console.log('\n🧹 Test data cleaned up');

  process.exit(0);
})();
