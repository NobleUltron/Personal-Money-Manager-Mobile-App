import { useQuery } from '@tanstack/react-query';
import { budgetsApi, subscriptionsApi } from '../services/api';
import { useNotifications } from '../context/NotificationsContext';
import { useAuth } from '../context/AuthContext';
import { Budget, Subscription } from '../types';

export function useTabBadges() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: budgetsApi.getAll,
    enabled: !!user,
  });

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.getAll,
    enabled: !!user,
  });

  // Budget alert: true if any budget is over or >= 90% spent
  const hasBudgetAlert = budgets?.some((b) => {
    if (b.isOver) return true;
    if (b.percentage !== undefined && b.percentage >= 90) return true;
    const spent = Number(b.spent) || 0;
    const amount = Number(b.amount) || 0;
    return amount > 0 && (spent / amount) >= 0.9;
  }) || false;

  // Bills alert: true if any bill is due within 3 days or overdue (up to 30 days)
  const hasBillAlert = subscriptions?.some((s) => {
    if (!s.next_due_date) return false;
    const due = new Date(s.next_due_date).getTime();
    const now = Date.now();
    const daysUntil = (due - now) / (1000 * 60 * 60 * 24);
    return daysUntil <= 3 && daysUntil >= -30;
  }) || false;

  return {
    index: unreadCount > 0 || hasBillAlert, // Dashboard catches global unread and upcoming bills
    accounts: false, // Extendable for low balance or disconnected banks later
    budgets: hasBudgetAlert, // Lights up if budgets are near/over limits
    settings: unreadCount > 0, // More tab catches global unread notifs
  };
}