import User from '../models/User';

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
  return base.length >= 3 ? base : `driver${base}`;
}

// Generates a unique @username from a display name (e.g. "Big Rig Bobby" -> "bigrigbobby",
// falling back to "bigrigbobby2" etc. on collision). Used both at registration and as a
// lazy backfill for accounts created before usernames existed.
export async function generateUsername(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base}${suffix}`.slice(0, 24);
  }
  return candidate;
}
