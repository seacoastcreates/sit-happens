import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** 'HH:MM' in 24h time. */
export type ReminderTime = string;

export function parseTime(t: ReminderTime): { hour: number; minute: number } {
  const [hour, minute] = t.split(':').map(Number);
  return { hour, minute };
}

export function formatTime(t: ReminderTime): string {
  const { hour, minute } = parseTime(t);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

/** Replace any existing reminder with one daily reminder. Returns false if permission was denied. */
export async function scheduleDailyReminder(time: ReminderTime, dogName: string): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Training time with ${dogName}`,
      body: "Today's session is ready. A few minutes is all it takes.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
