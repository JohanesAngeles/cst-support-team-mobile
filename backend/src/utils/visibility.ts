import Block from '../models/Block';

// Authors whose content should be hidden from this user's feed: anyone they've blocked or
// muted, plus anyone who has blocked them (mutual invisibility for blocks).
export async function hiddenAuthorIds(userId: string): Promise<string[]> {
  const relations = await Block.find({
    $or: [{ actorId: userId }, { targetId: userId, type: 'block' }],
  });
  const ids = relations.map(r => (r.actorId.toString() === userId ? r.targetId : r.actorId).toString());
  return [...new Set(ids)];
}
