/**
 * Check and drop any stale unique index on email field
 * Run: node check-email-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();

  console.log('Current indexes on users collection:');
  indexes.forEach((idx, i) => {
    console.log(`  [${i}] name: "${idx.name}" | key: ${JSON.stringify(idx.key)} | unique: ${idx.unique || false}`);
  });

  const emailIndex = indexes.find(
    (idx) => idx.key && idx.key.email !== undefined
  );

  if (emailIndex) {
    if (emailIndex.unique) {
      console.log(`\n⚠️  Found UNIQUE index on email: "${emailIndex.name}" — dropping it...`);
      await collection.dropIndex(emailIndex.name);
      console.log('✅ Unique email index DROPPED');
    } else {
      console.log(`\n✅ Email index exists but is NOT unique — no action needed`);
    }
  } else {
    console.log('\n✅ No email index found — multiple collectors can share email freely');
  }

  // Verify duplicate emails work
  const emailGroups = await collection.aggregate([
    { $group: { _id: '$email', count: { $sum: 1 }, users: { $push: '$userId' } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  if (emailGroups.length > 0) {
    console.log('\nExisting duplicate emails (allowed):');
    emailGroups.forEach((g) =>
      console.log(`  email: ${g._id} | users: [${g.users.join(', ')}]`)
    );
  } else {
    console.log('\nNo duplicate emails currently exist');
  }

  await mongoose.disconnect();
})();
