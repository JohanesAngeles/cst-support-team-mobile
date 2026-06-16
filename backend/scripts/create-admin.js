/**
 * create-admin.js
 * Creates (or resets) the centralized CST admin account.
 * Run: node scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://johanesangeles06_db_user:MAtsNfjKMR4wGqwl@cst-support-team-databa.4wxbjsp.mongodb.net/cst_db?retryWrites=true&w=majority&appName=cst-support-team-database';

const ADMIN = {
  name:     'CST Admin',
  email:    'admin@roadreadynetwork.com',
  password: 'RoadReady@2026!',
  role:     'admin',
};

async function run() {
  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  const col  = conn.db.collection('users');

  const hash    = await bcrypt.hash(ADMIN.password, 12);
  const existing = await col.findOne({ email: ADMIN.email });

  if (existing) {
    await col.updateOne({ email: ADMIN.email }, {
      $set: { password: hash, role: 'admin', name: ADMIN.name, isVerified: true },
    });
    console.log('✅  Admin account updated.');
  } else {
    await col.insertOne({
      name:       ADMIN.name,
      email:      ADMIN.email,
      password:   hash,
      role:       'admin',
      isVerified: true,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    });
    console.log('✅  Admin account created.');
  }

  console.log(`\n  Email   : ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}\n`);
  await conn.close();
}

run().catch(err => { console.error(err); process.exit(1); });
