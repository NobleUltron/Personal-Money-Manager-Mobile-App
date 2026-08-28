import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure foreground notification presentation options
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
  type: 'bill_due' | 'loan_due' | 'budget_warning' | 'daily_digest' | 'weekly_digest' | 'test' | 'general';
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

      // Configure Android channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('money-manager-alerts', {
          name: 'Personal Money Manager Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('money-manager-digests', {
          name: 'Daily & Weekly Digests',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#10B981',
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

      const now = new Date();
      if (triggerDate.getTime() <= now.getTime()) {
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
   * Schedule a reminder for an upcoming Loan repayment deadline
   */
  static async scheduleLoanReminder(params: {
    loanId: string;
    counterparty: string;
    type: 'lent' | 'borrowed';
    amount: number;
    currencySymbol: string;
    dueDate: Date | string;
    daysBefore?: number;
  }): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const due = typeof params.dueDate === 'string' ? new Date(params.dueDate) : params.dueDate;
      const daysBefore = params.daysBefore ?? 1;

      const triggerDate = new Date(due);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      triggerDate.setHours(9, 30, 0, 0);

      const now = new Date();
      if (triggerDate.getTime() <= now.getTime()) {
        if (due.toDateString() === now.toDateString()) {
          triggerDate.setTime(now.getTime() + 6000);
        } else {
          return null;
        }
      }

      const formattedAmount = `${params.currencySymbol} ${params.amount.toLocaleString()}`;
      const isLent = params.type === 'lent';
      const title = isLent
        ? `💰 Collection Due: ${params.counterparty}`
        : `💳 Loan Repayment Due: ${params.counterparty}`;
      const body = isLent
        ? `${params.counterparty} is scheduled to repay ${formattedAmount} ${daysBefore === 0 ? 'today' : `in ${daysBefore} days`}.`
        : `Repayment of ${formattedAmount} to ${params.counterparty} is due ${daysBefore === 0 ? 'today' : `in ${daysBefore} days`}.`;

      const dataPayload: NotificationPayload = {
        type: 'loan_due',
        id: params.loanId,
        url: '/(app)/loans',
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
      console.warn('Failed to schedule loan reminder:', err);
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
          channelId: 'money-manager-digests',
        },
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to schedule daily digest:', err);
      return null;
    }
  }

  /**
   * Schedule Weekly Spending Digest (e.g. Sunday 6:00 PM)
   * weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday (or 1=Mon depending on platform, handled uniformly)
   */
  static async scheduleWeeklyDigest(weekday = 1, hour = 18, minute = 0): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      // Cancel existing weekly digests
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.content.data?.type === 'weekly_digest') {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      const dataPayload: NotificationPayload = {
        type: 'weekly_digest',
        url: '/(app)/analytics',
      };

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Your Weekly Financial Digest',
          body: 'Your weekly spending debrief & upcoming bills report is ready to review!',
          data: dataPayload,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: 'money-manager-digests',
        },
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to schedule weekly digest:', err);
      return null;
    }
  }

  /**
   * Send an instant custom alert
   */
  static async sendInstantNotification(params: {
    title: string;
    body: string;
    data?: any;
  }): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data || { type: 'general' },
          sound: 'default',
        },
        trigger: null,
      });

      return identifier;
    } catch (err) {
      console.warn('Failed to send instant notification:', err);
      return null;
    }
  }

  /**
   * Send test notification for a specific feature
   */
  static async sendTestNotification(type: 'general' | 'daily_digest' | 'weekly_digest' | 'bill_reminder' | 'budget_warning' = 'general'): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      let title = '🔔 Personal Money Manager';
      let body = 'Smart Notifications & Bill Reminders are actively protecting your financial health!';
      let url = '/(app)/settings';

      if (type === 'daily_digest') {
        title = '🌙 Daily Spending Summary';
        body = 'You spent UGX 45,000 across 3 transactions today. Top category: Food & Dining.';
        url = '/(app)/';
      } else if (type === 'weekly_digest') {
        title = '📊 Weekly Financial Debrief';
        body = 'Great job! You spent 14% less this week. 2 recurring bills are due in the next 7 days.';
        url = '/(app)/analytics';
      } else if (type === 'bill_reminder') {
        title = '🔔 Bill Due Tomorrow: Netflix Premium';
        body = 'Your subscription payment for Netflix Premium (UGX 38,000) is due tomorrow.';
        url = '/(app)/subscriptions';
      } else if (type === 'budget_warning') {
        title = '⚠️ Budget Warning: Shopping (85%)';
        body = 'You have used 85% of your monthly Shopping budget (UGX 425,000 / 500,000).';
        url = '/(app)/budgets';
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type, url },
          sound: 'default',
        },
        trigger: null,
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