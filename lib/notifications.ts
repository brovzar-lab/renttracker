import * as Notifications from 'expo-notifications';

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
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: triggerDay,
      hour: 9,
      minute: 0,
    },
  });
}

export async function cancelRentReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
