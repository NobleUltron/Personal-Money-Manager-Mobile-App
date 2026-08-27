import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationService, NotificationPayload } from '../services/notifications/notifications.service';
import { triggerHaptic } from '../utils/haptics';

export interface InAppAlert {
  id: string;
  type: 'bill_due' | 'budget_warning' | 'daily_digest' | 'general' | 'test';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionTitle?: string;
  metadata?: any;
}

interface NotificationsContextType {
  hasPermission: boolean;
  billRemindersEnabled: boolean;
  budgetAlertsEnabled: boolean;
  dailyDigestEnabled: boolean;
  reminderDaysBefore: number;
  inAppAlerts: InAppAlert[];
  unreadCount: number;
  requestPermissions: () => Promise<boolean>;
  toggleBillReminders: (enabled: boolean) => Promise<void>;
  toggleBudgetAlerts: (enabled: boolean) => Promise<void>;
  toggleDailyDigest: (enabled: boolean) => Promise<void>;
  setReminderDaysBefore: (days: number) => Promise<void>;
  syncAllBillReminders: (subscriptions: any[], currencySymbol: string) => Promise<void>;
  checkAndNotifyBudgetLimits: (budgets: any[], currencySymbol: string) => Promise<void>;
  sendTestNotification: () => Promise<boolean>;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  hasPermission: false,
  billRemindersEnabled: true,
  budgetAlertsEnabled: true,
  dailyDigestEnabled: false,
  reminderDaysBefore: 1,
  inAppAlerts: [],
  unreadCount: 0,
  requestPermissions: async () => false,
  toggleBillReminders: async () => {},
  toggleBudgetAlerts: async () => {},
  toggleDailyDigest: async () => {},
  setReminderDaysBefore: async () => {},
  syncAllBillReminders: async () => {},
  checkAndNotifyBudgetLimits: async () => {},
  sendTestNotification: async () => false,
  markAlertAsRead: () => {},
  markAllAlertsAsRead: () => {},
  dismissAlert: () => {},
  clearAllAlerts: () => {},
});

const BILL_REMINDERS_KEY = 'pmm_notif_bill_reminders';
const BUDGET_ALERTS_KEY = 'pmm_notif_budget_alerts';
const DAILY_DIGEST_KEY = 'pmm_notif_daily_digest';
const DAYS_BEFORE_KEY = 'pmm_notif_days_before';
const IN_APP_ALERTS_KEY = 'pmm_in_app_alerts_v1';
const DEDUP_TRACKER_KEY = 'pmm_notif_dedup_tracker_v1';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [billRemindersEnabled, setBillRemindersEnabled] = useState<boolean>(true);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState<boolean>(true);
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState<boolean>(false);
  const [reminderDaysBefore, setReminderDaysBeforeState] = useState<number>(1);
  const [inAppAlerts, setInAppAlerts] = useState<InAppAlert[]>([]);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    loadSettings();
    setupListeners();

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  const loadSettings = async () => {
    if (Platform.OS === 'web') return;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');

      const storedBills = await SecureStore.getItemAsync(BILL_REMINDERS_KEY);
      if (storedBills !== null) setBillRemindersEnabled(storedBills === 'true');

      const storedBudgets = await SecureStore.getItemAsync(BUDGET_ALERTS_KEY);
      if (storedBudgets !== null) setBudgetAlertsEnabled(storedBudgets === 'true');

      const storedDigest = await SecureStore.getItemAsync(DAILY_DIGEST_KEY);
      if (storedDigest !== null) setDailyDigestEnabled(storedDigest === 'true');

      const storedDays = await SecureStore.getItemAsync(DAYS_BEFORE_KEY);
      if (storedDays !== null) setReminderDaysBeforeState(parseInt(storedDays, 10) || 1);

      const storedAlerts = await SecureStore.getItemAsync(IN_APP_ALERTS_KEY);
      if (storedAlerts) {
        try {
          setInAppAlerts(JSON.parse(storedAlerts));
        } catch {}
      }
    } catch (e) {
      console.warn('Error loading notification settings:', e);
    }
  };

  const setupListeners = () => {
    if (Platform.OS === 'web') return;

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      const notifData = data as Partial<NotificationPayload> | undefined;

      const newAlert: InAppAlert = {
        id: notification.request.identifier || Date.now().toString(),
        type: (notifData?.type as any) || 'general',
        title: title || 'Alert',
        message: body || '',
        timestamp: Date.now(),
        read: false,
        actionUrl: typeof notifData?.url === 'string' ? notifData.url : undefined,
        actionTitle:
          notifData?.type === 'bill_due'
            ? 'Pay Bill'
            : notifData?.type === 'budget_warning'
            ? 'View Budget'
            : undefined,
        metadata: notifData?.metadata,
      };

      setInAppAlerts((prev) => {
        const updated = [newAlert, ...prev.slice(0, 29)]; // keep latest 30
        saveInAppAlerts(updated);
        return updated;
      });
    });
  };

  const saveInAppAlerts = async (alerts: InAppAlert[]) => {
    if (Platform.OS === 'web') return;
    try {
      await SecureStore.setItemAsync(IN_APP_ALERTS_KEY, JSON.stringify(alerts));
    } catch {}
  };

  const requestPermissions = async (): Promise<boolean> => {
    const granted = await NotificationService.requestPermissions();
    setHasPermission(granted);
    return granted;
  };

  const toggleBillReminders = async (enabled: boolean) => {
    setBillRemindersEnabled(enabled);
    try {
      await SecureStore.setItemAsync(BILL_REMINDERS_KEY, enabled ? 'true' : 'false');
      if (enabled && !hasPermission) {
        await requestPermissions();
      }
    } catch {}
  };

  const toggleBudgetAlerts = async (enabled: boolean) => {
    setBudgetAlertsEnabled(enabled);
    try {
      await SecureStore.setItemAsync(BUDGET_ALERTS_KEY, enabled ? 'true' : 'false');
      if (enabled && !hasPermission) {
        await requestPermissions();
      }
    } catch {}
  };

  const toggleDailyDigest = async (enabled: boolean) => {
    setDailyDigestEnabled(enabled);
    try {
      await SecureStore.setItemAsync(DAILY_DIGEST_KEY, enabled ? 'true' : 'false');
      if (enabled) {
        if (!hasPermission) await requestPermissions();
        await NotificationService.scheduleDailySpendingDigest(20, 0);
      } else {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content.data?.type === 'daily_digest') {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }
    } catch {}
  };

  const setReminderDaysBefore = async (days: number) => {
    setReminderDaysBeforeState(days);
    try {
      await SecureStore.setItemAsync(DAYS_BEFORE_KEY, days.toString());
    } catch {}
  };

  /**
   * Sync all recurring bills & subscriptions with deduplication
   */
  const syncAllBillReminders = useCallback(
    async (subscriptions: any[], currencySymbol: string) => {
      if (!billRemindersEnabled || !subscriptions || subscriptions.length === 0) return;

      try {
        for (const sub of subscriptions) {
          if (sub.next_due_date) {
            await NotificationService.scheduleBillReminder({
              billId: sub.id ? sub.id.toString() : sub.name,
              billName: sub.name,
              amount: Number(sub.amount),
              currencySymbol,
              dueDate: sub.next_due_date,
              daysBefore: reminderDaysBefore,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to sync bill reminders:', err);
      }
    },
    [billRemindersEnabled, reminderDaysBefore]
  );

  /**
   * Check budget limits and trigger warnings (with 24h anti-spam deduping)
   */
  const checkAndNotifyBudgetLimits = useCallback(
    async (budgets: any[], currencySymbol: string) => {
      if (!budgetAlertsEnabled || !budgets || budgets.length === 0) return;

      try {
        let dedupMap: Record<string, number> = {};
        const stored = await SecureStore.getItemAsync(DEDUP_TRACKER_KEY);
        if (stored) {
          try {
            dedupMap = JSON.parse(stored);
          } catch {}
        }

        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        for (const b of budgets) {
          const limit = Number(b.amount || 0);
          const spent = Number(b.spent || 0);
          if (limit > 0) {
            const percentage = (spent / limit) * 100;
            if (percentage >= 80) {
              const dedupKey = `budget_${b.category}_${percentage >= 100 ? '100' : '80'}`;
              const lastSent = dedupMap[dedupKey] || 0;

              if (now - lastSent > TWENTY_FOUR_HOURS) {
                await NotificationService.sendBudgetAlert({
                  categoryName: b.category,
                  spent,
                  limit,
                  currencySymbol,
                  percentage,
                });
                dedupMap[dedupKey] = now;
              }
            }
          }
        }

        await SecureStore.setItemAsync(DEDUP_TRACKER_KEY, JSON.stringify(dedupMap));
      } catch (err) {
        console.warn('Failed to check budget limits:', err);
      }
    },
    [budgetAlertsEnabled]
  );

  const sendTestNotification = async (): Promise<boolean> => {
    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    const id = await NotificationService.sendInstantNotification({
      title: '🔔 Personal Money Manager',
      body: 'Smart Notifications & Bill Reminders are actively protecting your financial health!',
      data: { type: 'test', url: '/(app)/settings' },
    });

    return !!id;
  };

  const markAlertAsRead = (id: string) => {
    setInAppAlerts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, read: true } : a));
      saveInAppAlerts(updated);
      return updated;
    });
  };

  const markAllAlertsAsRead = () => {
    triggerHaptic.selection();
    setInAppAlerts((prev) => {
      const updated = prev.map((a) => ({ ...a, read: true }));
      saveInAppAlerts(updated);
      return updated;
    });
  };

  const dismissAlert = (id: string) => {
    triggerHaptic.selection();
    setInAppAlerts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveInAppAlerts(updated);
      return updated;
    });
  };

  const clearAllAlerts = () => {
    triggerHaptic.warning();
    setInAppAlerts([]);
    saveInAppAlerts([]);
  };

  const unreadCount = inAppAlerts.filter((a) => !a.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        hasPermission,
        billRemindersEnabled,
        budgetAlertsEnabled,
        dailyDigestEnabled,
        reminderDaysBefore,
        inAppAlerts,
        unreadCount,
        requestPermissions,
        toggleBillReminders,
        toggleBudgetAlerts,
        toggleDailyDigest,
        setReminderDaysBefore,
        syncAllBillReminders,
        checkAndNotifyBudgetLimits,
        sendTestNotification,
        markAlertAsRead,
        markAllAlertsAsRead,
        dismissAlert,
        clearAllAlerts,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);