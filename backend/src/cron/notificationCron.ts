import cron from 'node-cron';
import PushToken from '../models/PushToken';
import Deadline from '../models/Deadline';
import MaintenanceRecord from '../models/MaintenanceRecord';
import HOSEntry from '../models/HOSEntry';
import { sendPushToUser } from '../routes/notifications';
import { syncApprovedPartners } from './partnerSyncCron';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY);
}

async function checkDeadlines(userIds: string[]) {
  const today = new Date().toISOString().split('T')[0];
  const threeDaysOut = new Date(Date.now() + 3 * MS_PER_DAY).toISOString().split('T')[0];

  for (const userId of userIds) {
    const upcoming = await Deadline.find({
      userId,
      date: { $gte: today, $lte: threeDaysOut },
    });

    for (const d of upcoming) {
      const days = daysUntil(d.date);
      const when = days <= 0 ? 'TODAY' : days === 1 ? 'tomorrow' : `in ${days} days`;
      await sendPushToUser(userId, `⚠️ Deadline ${when}`, `${d.title} is due ${when}`, 'dailyAlerts');
    }
  }
}

async function checkMaintenance(userIds: string[]) {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysOut = new Date(Date.now() + 7 * MS_PER_DAY).toISOString().split('T')[0];

  for (const userId of userIds) {
    const due = await MaintenanceRecord.find({
      userId,
      nextDate: { $gte: today, $lte: sevenDaysOut },
    });

    for (const m of due) {
      const days = daysUntil(m.nextDate);
      const when = days <= 0 ? 'OVERDUE' : days === 1 ? 'tomorrow' : `in ${days} days`;
      await sendPushToUser(userId, `🔧 Maintenance Due`, `${m.name} is due ${when}`, 'dailyAlerts');
    }
  }
}

async function checkHOS(userIds: string[]) {
  // Sum on-duty hours for the last 8 days; warn at 60+ hrs (approaching 70-hr limit)
  const eightDaysAgo = new Date(Date.now() - 8 * MS_PER_DAY).toISOString().split('T')[0];

  for (const userId of userIds) {
    const entries = await HOSEntry.find({ userId, date: { $gte: eightDaysAgo } });
    const total = entries.reduce((sum, e) => sum + e.onDutyHours, 0);

    if (total >= 60 && total < 70) {
      await sendPushToUser(
        userId,
        '⏱ HOS Warning',
        `You have ${total.toFixed(1)} on-duty hours this week. Limit is 70 hrs.`,
        'hosReminders'
      );
    } else if (total >= 70) {
      await sendPushToUser(
        userId,
        '🚨 HOS Limit Reached',
        `You have ${total.toFixed(1)} on-duty hours. You must take a 34-hr restart.`,
        'hosReminders'
      );
    }
  }
}

async function runNotifications() {
  try {
    const tokens = await PushToken.find().distinct('userId');
    const userIds = tokens.map((id: any) => id.toString());
    if (!userIds.length) return;

    await Promise.all([
      checkDeadlines(userIds),
      checkMaintenance(userIds),
      checkHOS(userIds),
    ]);

    console.log(`[cron] Notifications sent to ${userIds.length} users`);
  } catch (err: any) {
    console.error('[cron] Error:', err.message);
  }
}

export function initCronJobs(): void {
  // Daily at 8:00 AM UTC
  cron.schedule('0 8 * * *', runNotifications);
  console.log('[cron] Notification jobs scheduled (daily @ 08:00 UTC)');

  // Every hour — sync approved founding partners from website DB
  cron.schedule('0 * * * *', syncApprovedPartners);
  // Run once immediately on startup so listings are available right away
  syncApprovedPartners();
  console.log('[cron] Partner sync scheduled (every hour + immediate run on startup)');
}
