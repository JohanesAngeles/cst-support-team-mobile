/**
 * make-admin.js
 * Promotes a user to admin role by email.
 * Usage: node scripts/make-admin.js your@email.com
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://johanesangeles06_db_user:MAtsNfjKMR4wGqwl@cst-support-team-databa.4wxbjsp.mongodb.net/cst_db?retryWrites=true&w=majority&appName=cst-support-team-database';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.js your@email.com');
  process.exit(1);
}

async function run() {
  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  const col  = conn.db.collection('users');

  const user = await col.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`❌  No user found with email: ${email}`);
    process.exit(1);
  }

  await col.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
  console.log(`✅  ${user.name ?? user.email} is now an admin.`);
  await conn.close();
}

run().catch(err => { console.error(err); process.exit(1); });
