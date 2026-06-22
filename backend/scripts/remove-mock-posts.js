// Removes all posts created by seed-mock-posts.js (titles starting with "[MOCK]").
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }

const NetworkPostSchema = new mongoose.Schema({}, { strict: false });
const NetworkPost = mongoose.model('NetworkPost', NetworkPostSchema, 'networkposts');

async function main() {
  await mongoose.connect(MONGODB_URI);
  const result = await NetworkPost.deleteMany({ title: { $regex: '^\\[MOCK\\]' } });
  console.log(`Removed ${result.deletedCount} mock posts`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
