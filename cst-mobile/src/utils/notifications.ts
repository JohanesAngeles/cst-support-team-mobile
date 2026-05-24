import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
