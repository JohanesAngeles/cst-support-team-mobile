// Temporary script — adds [MOCK] posts to one account so the drivers_socmed
// profile/feed UI can be previewed. Delete with scripts/remove-mock-posts.js
// before deploying.
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL = process.argv[2];

if (!MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }
if (!EMAIL) { console.error('Usage: node seed-mock-posts.js <email>'); process.exit(1); }

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

const NetworkPostSchema = new mongoose.Schema({}, { strict: false });
const NetworkPost = mongoose.model('NetworkPost', NetworkPostSchema, 'networkposts');

async function main() {
  await mongoose.connect(MONGODB_URI);

  const user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) { console.error(`No user found with email ${EMAIL}`); process.exit(1); }

  const mockPosts = [
    {
      authorId: user._id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl ?? undefined,
      category: 'general',
      title: '[MOCK] Sunrise on I-40',
      body: '[MOCK] Caught this sunrise pulling out of the truck stop this morning. Hard to beat this view.',
      imageUrl: 'https://picsum.photos/seed/drivers-socmed-1/800/800',
      upvotes: [],
      replies: [],
    },
    {
      authorId: user._id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl ?? undefined,
      category: 'general',
      title: '[MOCK] New rig, finally',
      body: '[MOCK] Picked up the new truck today. Loving the extra cab space for long hauls.',
      imageUrl: 'https://picsum.photos/seed/drivers-socmed-2/800/800',
      upvotes: [],
      replies: [],
    },
    {
      authorId: user._id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl ?? undefined,
      category: 'general',
      title: '[MOCK] PSA for fellow drivers',
      body: "[MOCK] Heads up — construction on the I-80 westbound is backing up traffic for miles. Plan an extra 45 min if you're heading that way today.",
      upvotes: [],
      replies: [],
    },
  ];

  const created = await NetworkPost.insertMany(mockPosts);
  console.log(`Inserted ${created.length} mock posts for ${EMAIL} (user ${user._id})`);
  created.forEach(p => console.log(' -', p._id.toString(), '-', p.title));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
