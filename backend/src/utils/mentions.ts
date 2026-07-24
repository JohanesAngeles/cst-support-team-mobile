import User, { IUser } from '../models/User';

const MENTION_RE = /@([a-z0-9_]{3,24})\b/gi;

export function extractMentionedUsernames(text: string): string[] {
  const matches = text.match(MENTION_RE) ?? [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

// Resolves @username tokens in text to the users they refer to, excluding the author
// (so self-mentions never notify) and dedupes.
export async function resolveMentions(text: string, excludeUserId: string): Promise<IUser[]> {
  const usernames = extractMentionedUsernames(text);
  if (usernames.length === 0) return [];
  const users = await User.find({ username: { $in: usernames } });
  return users.filter(u => u._id.toString() !== excludeUserId);
}
