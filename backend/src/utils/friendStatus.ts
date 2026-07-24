import FriendRequest from '../models/FriendRequest';

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export async function getFriendStatus(meId: string, otherId: string): Promise<FriendStatus> {
  if (meId === otherId) return 'none';
  const existing = await FriendRequest.findOne({
    $or: [{ senderId: meId, recipientId: otherId }, { senderId: otherId, recipientId: meId }],
  });
  if (!existing) return 'none';
  if (existing.status === 'accepted') return 'friends';
  return existing.senderId.toString() === meId ? 'pending_sent' : 'pending_received';
}

export async function countFriends(userId: string): Promise<number> {
  return FriendRequest.countDocuments({
    status: 'accepted',
    $or: [{ senderId: userId }, { recipientId: userId }],
  });
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const records = await FriendRequest.find({
    status: 'accepted',
    $or: [{ senderId: userId }, { recipientId: userId }],
  });
  return records.map(r => (r.senderId.toString() === userId ? r.recipientId.toString() : r.senderId.toString()));
}

// Batch version of getFriendStatus for list views (search results, active-now) so they
// don't fire one FriendRequest query per row.
export async function getFriendStatusMap(meId: string, otherIds: string[]): Promise<Map<string, FriendStatus>> {
  const map = new Map<string, FriendStatus>();
  if (otherIds.length === 0) return map;

  const records = await FriendRequest.find({
    $or: [
      { senderId: meId, recipientId: { $in: otherIds } },
      { senderId: { $in: otherIds }, recipientId: meId },
    ],
  });

  for (const r of records) {
    const senderId = r.senderId.toString();
    const otherId = senderId === meId ? r.recipientId.toString() : senderId;
    if (r.status === 'accepted') map.set(otherId, 'friends');
    else map.set(otherId, senderId === meId ? 'pending_sent' : 'pending_received');
  }

  return map;
}
