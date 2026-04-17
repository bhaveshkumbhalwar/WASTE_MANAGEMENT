/**
 * Test: Same email for multiple collectors
 * Run: node test-shared-email.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else           { console.log(`  ❌ FAIL: ${label}`); failed++; }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const SHARED_EMAIL = 'shared@campus.edu';
  const PASS = 'test123';

  // Cleanup from previous test run
  await User.deleteMany({ userId: { $in: ['SHARED_COL_A', 'SHARED_COL_B', 'SHARED_COL_C'] } });

  // ── TEST 1: Create 3 collectors with the SAME email, different blocks ──
  console.log('════ TEST 1: Create collectors with same email ════');
  try {
    const colA = await User.create({
      userId: 'SHARED_COL_A', password: PASS, role: 'collector',
      name: 'Ravi (Block A)', email: SHARED_EMAIL, block: 'A',
    });
    assert(`Created SHARED_COL_A | email: ${colA.email} | block: ${colA.block}`, !!colA);

    const colB = await User.create({
      userId: 'SHARED_COL_B', password: PASS, role: 'collector',
      name: 'Priya (Block B)', email: SHARED_EMAIL, block: 'B',
    });
    assert(`Created SHARED_COL_B | email: ${colB.email} | block: ${colB.block}`, !!colB);

    const colC = await User.create({
      userId: 'SHARED_COL_C', password: PASS, role: 'collector',
      name: 'Arjun (Block C)', email: SHARED_EMAIL, block: 'C',
    });
    assert(`Created SHARED_COL_C | email: ${colC.email} | block: ${colC.block}`, !!colC);
  } catch (err) {
    console.log(`  ❌ CREATE FAILED: ${err.message}`);
    failed += 3;
  }

  console.log();

  // ── TEST 2: All 3 have the same email ──
  console.log('════ TEST 2: Verify same email in DB ════');
  const withSharedEmail = await User.find({ email: SHARED_EMAIL, role: 'collector' });
  assert(`3 collectors share email "${SHARED_EMAIL}": found ${withSharedEmail.length}`, withSharedEmail.length === 3);
  const blocks = withSharedEmail.map(c => c.block).sort();
  assert(`They are in different blocks: [${blocks.join(', ')}]`, JSON.stringify(blocks) === JSON.stringify(['A','B','C']));

  console.log();

  // ── TEST 3: Login works for EACH using their unique userId ──
  console.log('════ TEST 3: Login by userId (not email) ════');

  for (const uid of ['SHARED_COL_A', 'SHARED_COL_B', 'SHARED_COL_C']) {
    const user = await User.findOne({ userId: uid });
    if (!user) { console.log(`  ❌ ${uid} not found`); failed++; continue; }
    const isMatch = await user.matchPassword(PASS);
    assert(`Login ${uid} (block: ${user.block}) → password matches`, isMatch);

    // Simulate JWT generation
    const token = jwt.sign({ id: user._id, role: user.role, block: user.block }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert(`JWT for ${uid} contains block: "${decoded.block}"`, decoded.block === user.block);
  }

  console.log();

  // ── TEST 4: No unique constraint collision ──
  console.log('════ TEST 4: Same email cannot cause DB error ════');
  let noError = true;
  try {
    // This should NOT throw a duplicate key error
    await User.create({
      userId: 'SHARED_COL_D', password: PASS, role: 'collector',
      name: 'Test D', email: SHARED_EMAIL, block: 'D',
    });
    await User.deleteOne({ userId: 'SHARED_COL_D' });
  } catch (err) {
    noError = false;
    console.log(`  ❌ Got unexpected error: ${err.message}`);
  }
  assert(`4th collector with same email created without E11000 error`, noError);

  console.log();

  // ── TEST 5: Email uniqueness check REMOVED from indexes ──
  console.log('════ TEST 5: Email index verification ════');
  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();
  const emailIdx = indexes.find(i => i.key && i.key.email !== undefined);
  assert(`No index on email field (${emailIdx ? `found: ${emailIdx.name}` : 'none'})`, !emailIdx);
  const userIdIdx = indexes.find(i => i.key && i.key.userId !== undefined);
  assert(`userId index exists and is unique`, userIdIdx && userIdIdx.unique === true);

  console.log();

  // ── Cleanup ──
  await User.deleteMany({ userId: { $in: ['SHARED_COL_A', 'SHARED_COL_B', 'SHARED_COL_C'] } });
  console.log('🧹 Test data cleaned up');

  console.log('\n═══════════════════════════════════');
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log(`  ${failed === 0 ? '✅ ALL TESTS PASSED — Shared email works!' : '⚠️ ISSUES FOUND'}`);
  console.log('═══════════════════════════════════');

  await mongoose.disconnect();
})();
