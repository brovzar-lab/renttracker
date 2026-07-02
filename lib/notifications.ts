import { doc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { db } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerPushToken(uid: string): Promise<void> {
  if (!db) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await updateDoc(doc(db, 'users', uid), { pushToken: token.data });
}

export async function scheduleRentReminder(
  rentDueDay: number,
  reminderDaysBefore: number,
  monthlyRent: number
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const triggerDay = Math.max(1, rentDueDay - reminderDaysBefore);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rent Due Soon',
      body: `Your rent of $${monthlyRent.toLocaleString()} is due in ${reminderDaysBefore} days.`,
    },
    trigger: {
      day: triggerDay,
      hour: 9,
      minute: 0,
      repeats: true,
    } as Notifications.CalendarTriggerInput,
  });
}

export async function cancelRentReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
