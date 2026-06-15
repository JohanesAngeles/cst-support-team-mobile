import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@rrn_notif_history';
const MAX_ITEMS = 100;

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  read: boolean;
  data?: Record<string, unknown>;
}

export async function addNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const existing = await getNotifications();
    const entry: StoredNotification = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title,
      body,
      receivedAt: Date.now(),
      read: false,
      data,
    };
    const updated = [entry, ...existing].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function getNotifications(): Promise<StoredNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markAllRead(): Promise<void> {
  try {
    const items = await getNotifications();
    const updated = items.map(n => ({ ...n, read: true }));
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function markRead(id: string): Promise<void> {
  try {
    const items = await getNotifications();
    const updated = items.map(n => n.id === id ? { ...n, read: true } : n);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

export async function getUnreadCount(): Promise<number> {
  const items = await getNotifications();
  return items.filter(n => !n.read).length;
}
