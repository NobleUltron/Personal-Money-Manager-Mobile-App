import { useQuery } from '@tanstack/react-query';
import { budgetsApi, accountsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Budget, Account } from '../types';

export function useTabBadges() {
  const { user } = useAuth();

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: budgetsApi.getAll,
    enabled: !!user,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
    enabled: !!user,
  });

  // Budget alert: true ONLY if any active budget is near/over limit (>= 90%)
  const hasBudgetAlert = budgets?.some((b) => {
    if (b.isOver) return true;
    if (b.percentage !== undefined && b.percentage >= 90) return true;
    const spent = Number(b.spent) || 0;
    const amount = Number(b.amount) || 0;
    return amount > 0 && (spent / amount) >= 0.9;
  }) || false;

  // Account alert: true only if any account is overdrawn / negative balance
  const hasAccountAlert = accounts?.some((a) => {
    const balance = Number(a.balance) || 0;
    return balance < 0;
  }) || false;

  return {
    index: false,              // Clean: Notifications belong on the top header bell
    accounts: hasAccountAlert, // Contextual: Warns if an account is overdrawn
    budgets: hasBudgetAlert,   // Contextual: Warns if a budget is critically high
    settings: false,           // Clean: No redundant global badges
  };
}