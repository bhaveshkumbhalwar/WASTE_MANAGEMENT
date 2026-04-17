// Data audit script — check block fields in all collectors and complaints
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Complaint = require('./models/Complaint');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  console.log('════ COLLECTORS ════');
  const cols = await User.find({ role: 'collector' });
  cols.forEach((c) =>
    console.log(`  ${c.userId} | block: ${JSON.stringify(c.block)} (type: ${typeof c.block})`)
  );
  console.log(`  Total: ${cols.length}\n`);

  console.log('════ COMPLAINTS ════');
  const comps = await Complaint.find({});
  comps.forEach((c) =>
    console.log(`  ${c.complaintId} | block: ${JSON.stringify(c.block)} (type: ${typeof c.block}) | assignedTo: ${c.assignedTo || 'NONE'}`)
  );
  console.log(`  Total: ${comps.length}\n`);

  // Check for null/missing blocks
  const nullBlockComps = comps.filter((c) => !c.block);
  const nullBlockCols = cols.filter((c) => !c.block);
  console.log('════ ISSUES ════');
  console.log(`  Complaints with null/missing block: ${nullBlockComps.length}`);
  console.log(`  Collectors with null/missing block: ${nullBlockCols.length}`);

  // Check for case mismatches
  const badCaseComps = comps.filter((c) => c.block && c.block !== c.block.toUpperCase());
  const badCaseCols = cols.filter((c) => c.block && c.block !== c.block.toUpperCase());
  console.log(`  Complaints with lowercase block: ${badCaseComps.length}`);
  console.log(`  Collectors with lowercase block: ${badCaseCols.length}`);

  await mongoose.disconnect();
})();
