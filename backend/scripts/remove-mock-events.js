// Removes all events created by seed-mock-events.js (titles starting with "[MOCK]").
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }

const EventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', EventSchema, 'events');

async function main() {
  await mongoose.connect(MONGODB_URI);
  const result = await Event.deleteMany({ title: { $regex: '^\\[MOCK\\]' } });
  console.log(`Removed ${result.deletedCount} mock events`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
