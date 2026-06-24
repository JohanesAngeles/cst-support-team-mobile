// Temporary script — adds [MOCK] events to one account so the drivers_socmed
// Upcoming Events widget can be previewed before real events exist.
// Delete with scripts/remove-mock-events.js before deploying.
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL = process.argv[2];

if (!MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }
if (!EMAIL) { console.error('Usage: node seed-mock-events.js <email>'); process.exit(1); }

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

const EventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', EventSchema, 'events');

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) { console.error(`No user found with email ${EMAIL}`); process.exit(1); }

  const mockEvents = [
    {
      authorId: user._id,
      authorName: user.name,
      title: '[MOCK] Mid-America Trucking Show',
      description: '[MOCK] Annual trucking industry trade show.',
      date: daysFromNow(14),
      location: 'Louisville, KY',
    },
    {
      authorId: user._id,
      authorName: user.name,
      title: '[MOCK] Great American Trucking Show',
      description: '[MOCK] One of the largest trucking trade shows in the country.',
      date: daysFromNow(60),
      location: 'Dallas, TX',
    },
    {
      authorId: user._id,
      authorName: user.name,
      title: '[MOCK] Road Ready Driver Meetup',
      description: "[MOCK] Casual driver meetup at Love's.",
      date: daysFromNow(5),
      location: "Love's - Walton, KY",
    },
  ];

  const created = await Event.insertMany(mockEvents);
  console.log(`Inserted ${created.length} mock events for ${EMAIL} (user ${user._id})`);
  created.forEach(e => console.log(' -', e._id.toString(), '-', e.title));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
