import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import client from '../api/client';

export interface UpcomingAlert {
  type: 'deadline' | 'maintenance';
  title: string;
  date: string;
  daysAway: number;
}

export async function registerPushToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await client.post('/notifications/token', { token: tokenData.data, platform });
  } catch {
    // Silent — push token registration is best-effort
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await client.delete('/notifications/token', { data: { token: tokenData.data } });
  } catch {
    // Silent
  }
}

export async function getUpcomingAlerts(): Promise<UpcomingAlert[]> {
  try {
    const res = await client.get('/notifications/alerts');
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const setupNotifications = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deadlines', {
      name: 'Deadline Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return true;
};

interface DeadlineItem {
  _id: string;
  title: string;
  type: string;
  date: string;
}

export const scheduleDeadlineNotifications = async (deadlines: DeadlineItem[]) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();

  for (const dl of deadlines) {
    const deadlineMs = new Date(dl.date + 'T09:00:00').getTime();
    const threeDayMs = deadlineMs - 3 * 24 * 60 * 60 * 1000;
    const oneDayMs  = deadlineMs - 1 * 24 * 60 * 60 * 1000;

    const fmtDate = new Date(dl.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const schedule = async (id: string, title: string, body: string, atMs: number) => {
      const seconds = Math.floor((atMs - now) / 1000);
      if (seconds < 60) return;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body, sound: true, data: { deadlineId: dl._id } },
        trigger: { seconds, channelId: 'deadlines' } as any,
      });
    };

    await schedule(
      `dl-3d-${dl._id}`,
      '⏰ Deadline in 3 Days',
      `${dl.title} (${dl.type}) is due ${fmtDate}`,
      threeDayMs,
    );

    await schedule(
      `dl-1d-${dl._id}`,
      '⚠️ Deadline Tomorrow',
      `${dl.title} (${dl.type}) is due tomorrow — ${fmtDate}`,
      oneDayMs,
    );

    await schedule(
      `dl-0d-${dl._id}`,
      '🚨 Deadline Today!',
      `${dl.title} (${dl.type}) is due today`,
      deadlineMs,
    );
  }
};
