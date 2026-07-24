/**
 * create-demo-partner.js
 * Creates (or resets) a demo partner account for presentation purposes.
 * Mirrors what backend/src/routes/admin.ts does on partner-application approval:
 * creates a 'partner' User + an active BusinessListing.
 * Run: node scripts/create-demo-partner.js
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const dns      = require('dns');

// Local resolver in this environment doesn't support SRV lookups; use Google's.
dns.setServers(['8.8.8.8']);

const MONGO_URI = 'mongodb+srv://johanesangeles06_db_user:MAtsNfjKMR4wGqwl@cst-support-team-databa.4wxbjsp.mongodb.net/cst_db?retryWrites=true&w=majority&appName=cst-support-team-database';

const PARTNER = {
  name:     'Demo Partner',
  email:    'demo.partner@roadreadynetwork.com',
  password: 'RoadDemo@2026!',
  phone:    '555-010-0100',
};

const LISTING = {
  businessName: "Demo Truck Stop & Repair",
  category:     'Truck Repair',
  phone:        PARTNER.phone,
  city:         'Dallas',
  state:        'TX',
  description:  'Demo business listing for presentation purposes.',
  isActive:     true,
};

async function run() {
  const conn  = await mongoose.createConnection(MONGO_URI).asPromise();
  const users    = conn.db.collection('users');
  const listings = conn.db.collection('businesslistings');

  const hash    = await bcrypt.hash(PARTNER.password, 12);
  const existing = await users.findOne({ email: PARTNER.email });

  let userId;
  if (existing) {
    await users.updateOne({ email: PARTNER.email }, {
      $set: {
        password: hash,
        role: 'partner',
        name: PARTNER.name,
        phone: PARTNER.phone,
        isVerified: true,
        subscriptionStatus: 'free',
      },
    });
    userId = existing._id;
    console.log('✅  Partner account updated.');
  } else {
    const result = await users.insertOne({
      name:               PARTNER.name,
      email:              PARTNER.email,
      password:           hash,
      phone:              PARTNER.phone,
      role:               'partner',
      isVerified:         true,
      subscriptionStatus: 'free',
      createdAt:          new Date(),
      updatedAt:          new Date(),
    });
    userId = result.insertedId;
    console.log('✅  Partner account created.');
  }

  const existingListing = await listings.findOne({ ownerId: userId });
  if (existingListing) {
    await listings.updateOne({ ownerId: userId }, { $set: { ...LISTING, updatedAt: new Date() } });
    console.log('✅  Business listing updated.');
  } else {
    await listings.insertOne({
      ownerId: userId,
      ...LISTING,
      viewCount: 0,
      clickCount: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅  Business listing created.');
  }

  console.log(`\n  Email   : ${PARTNER.email}`);
  console.log(`  Password: ${PARTNER.password}\n`);
  await conn.close();
}

run().catch(err => { console.error(err); process.exit(1); });
