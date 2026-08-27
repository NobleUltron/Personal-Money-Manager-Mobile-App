import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { budgetsApi, subscriptionsApi } from '../services/api';
import { useNotifications } from '../context/NotificationsContext';
import { useAuth } from '../context/AuthContext';
import { Budget, Subscription } from '../types';

export function useSmartNotificationSync() {
  const { user } = useAuth();
  const {
    billRemindersEnabled,
    budgetAlertsEnabled,
    reminderDaysBefore,
    syncAllBillReminders,
    checkAndNotifyBudgetLimits,
  } = useNotifications();

  const currencySymbol = user?.currency_symbol || 'UGX';

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.getAll,
    enabled: !!user && billRemindersEnabled,
  });

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: budgetsApi.getAll,
    enabled: !!user && budgetAlertsEnabled,
  });

  // 1. Sync upcoming bill alarms whenever subscriptions or reminder window changes
  useEffect(() => {
    if (subscriptions && subscriptions.length > 0 && billRemindersEnabled) {
      syncAllBillReminders(subscriptions, currencySymbol);
    }
  }, [subscriptions, billRemindersEnabled, reminderDaysBefore, currencySymbol, syncAllBillReminders]);

  // 2. Check budget limit thresholds whenever budgets update
  useEffect(() => {
    if (budgets && budgets.length > 0 && budgetAlertsEnabled) {
      checkAndNotifyBudgetLimits(budgets, currencySymbol);
    }
  }, [budgets, budgetAlertsEnabled, currencySymbol, checkAndNotifyBudgetLimits]);
}