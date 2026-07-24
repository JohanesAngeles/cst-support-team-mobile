import Notification, { NotificationType } from '../models/Notification';
import { sendPushToUser } from '../routes/notifications';
import { io } from '../app';

export interface CreateNotificationParams {
  recipientId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  type: NotificationType;
  postId?: string;
  postTitle?: string;
  reactionType?: string;
  conversationId?: string;
}

const PUSH_COPY: Record<NotificationType, (actorName: string) => { title: string; body: string }> = {
  reaction: (name) => ({ title: 'New reaction', body: `${name} reacted to your post` }),
  reply: (name) => ({ title: 'New reply', body: `${name} replied to you` }),
  follow: (name) => ({ title: 'New follower', body: `${name} started following you` }),
  mention: (name) => ({ title: 'You were mentioned', body: `${name} mentioned you` }),
  share: (name) => ({ title: 'Post shared', body: `${name} shared your post` }),
  group_invite: (name) => ({ title: 'Added to a group', body: `${name} added you to a group chat` }),
  friend_request: (name) => ({ title: 'Friend request', body: `${name} wants to be friends` }),
  friend_accept: (name) => ({ title: 'Friend request accepted', body: `${name} accepted your friend request` }),
};

// Skips self-notifications, persists the notification, pushes it live over the recipient's
// user room, and sends a push notification (subject to their 'social' preference).
export async function createNotification(params: CreateNotificationParams) {
  if (params.recipientId === params.actorId) return;

  const doc = await Notification.create({
    recipientId: params.recipientId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorAvatarUrl: params.actorAvatarUrl,
    type: params.type,
    postId: params.postId,
    postTitle: params.postTitle,
    reactionType: params.reactionType,
    conversationId: params.conversationId,
  });

  io.to(`user:${params.recipientId}`).emit('notification:new', doc);

  const { title, body } = PUSH_COPY[params.type](params.actorName);
  sendPushToUser(params.recipientId, title, body, 'social', {
    type: params.type,
    postId: params.postId,
    conversationId: params.conversationId,
  }).catch(() => {});
}
