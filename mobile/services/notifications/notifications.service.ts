import { LogBox, Platform } from 'react-native';
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import * as Notifications from 'expo-notifications';


// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPayload extends Record<string, unknown> {
  type: 'bill_due' | 'budget_warning' | 'daily_digest' | 'loan_due' | 'test';
  id?: string;
  url?: string;
  metadata?: any;
}

export class NotificationService {
  /**
   * Request notification permissions and create Android notification channels
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('money-manager-alerts', {
          name: 'Personal Money Manager Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
          sound: 'default',
        });
      }

      return true;
    } catch (err) {
      console.warn('Error requesting notification permissions:', err);
      return false;
    }
  }

  /**
   * Schedule a reminder for an upcoming recurring bill / subscription
   */
  static async scheduleBillReminder(params: {
    billId: string;
    billName: string;
    amount: number;
    currencySymbol: string;
    dueDate: Date | string;
    daysBefore?: number;
  }): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const due = typeof params.dueDate === 'string' ? new Date(params.dueDate) : params.dueDate;
      const daysBefore = params.daysBefore ?? 1;

      // Trigger date at 9:00 AM on (due - daysBefore)
      const triggerDate = new Date(due);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      triggerDate.setHours(9, 0, 0, 0);

      // If trigger date has already passed, schedule for today 9am or immediately
      const now = new Date();
      if (triggerDate.getTime() <= now.getTime()) {
        // If due date is today, alert today
        if (due.toDateString() === now.toDateString()) {
          triggerDate.setTime(now.getTime() + 5000); // 5 seconds from now
        } else {
          return null; // past event
        }
      }

      const formattedAmount = `${params.currencySymbol} ${params.amount.toLocaleString()}`;
      const title = daysBefore === 0
        ? `🔔 Bill Due Today: ${params.billName}`
        : `⚠️ Bill Due Soon: ${params.billName}`;
      const body = daysBefore === 0
        ? `Your recurring payment for ${params.billName} (${formattedAmount}) is due today.`
        : `${params.billName} (${formattedAmount}) is due in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}.`;

      const dataPayload: NotificationPayload = {
        type: 'bill_due',
        id: params.billId,
        url: '/(app)/subscriptions',
      };

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: dataPayload,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'money-manager-alerts',
        },
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to schedule bill reminder:', err);
      return null;
    }
  }

  /**
   * Schedule or trigger a budget limit alert
   */
  static async sendBudgetAlert(params: {
    categoryName: string;
    spent: number;
    limit: number;
    currencySymbol: string;
    percentage: number;
  }): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const isExceeded = params.percentage >= 100;
      const title = isExceeded
        ? `🚨 Budget Exceeded: ${params.categoryName}`
        : `⚠️ Budget Warning: ${params.categoryName} (${Math.round(params.percentage)}%)`;
      const body = isExceeded
        ? `You've reached 100% of your ${params.categoryName} budget (${params.currencySymbol} ${params.spent.toLocaleString()} / ${params.limit.toLocaleString()}).`
        : `You've used ${Math.round(params.percentage)}% of your monthly ${params.categoryName} budget.`;

      const dataPayload: NotificationPayload = {
        type: 'budget_warning',
        url: '/(app)/budgets',
      };

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: dataPayload,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to send budget alert:', err);
      return null;
    }
  }

  /**
   * Schedule Daily Spending Digest (e.g., 8:00 PM daily)
   */
  static async scheduleDailySpendingDigest(hour = 20, minute = 0): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      // Cancel previous daily digest notifications first
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.content.data?.type === 'daily_digest') {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      const dataPayload: NotificationPayload = {
        type: 'daily_digest',
        url: '/(app)/',
      };

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Daily Spending Summary',
          body: 'Take 30 seconds to log today’s expenses and keep your financial health on track.',
          data: dataPayload,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'money-manager-alerts',
        },
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to schedule daily digest:', err);
      return null;
    }
  }

  /**
   * Send an instant test notification
   */
  static async sendTestNotification(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const dataPayload: NotificationPayload = {
        type: 'test',
      };

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Personal Money Manager Alerts Active',
          body: 'You will receive timely reminders for upcoming bills and budget spending warnings!',
          data: dataPayload,
          sound: 'default',
        },
        trigger: null, // instant
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to send test notification:', err);
      return null;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAll(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  }
}

