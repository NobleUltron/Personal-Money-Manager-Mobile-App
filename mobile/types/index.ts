export interface User {
  id: string;
  username: string;
  email?: string | null;
  currency: string;
  currency_symbol: string;
  two_factor_enabled: boolean;
  profile_picture?: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  bank_name?: string | null;
  account_number?: string | null;
  type: string;
  initial_balance: number;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'income' | 'expense';
  amount: number;
  date: string;
  reason?: string;
  category: string;
  created_at: string;
  account?: {
    id: string;
    name: string;
    bank_name?: string | null;
    type: string;
  };
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOver: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly';
  next_due_date: string;
  category: string;
  created_at: string;
  account?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface Loan {
  id: string;
  accountId?: string | null;
  type: 'borrowed' | 'lent';
  name: string;
  amount: number;
  amount_paid: number;
  remaining: number;
  due_date?: string | null;
  isPaidOff: boolean;
  created_at: string;
  account?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  category: string;
  color: string;
  notes?: string | null;
  percentage: number;
  isCompleted: boolean;
  created_at: string;
}

export interface DashboardSummary {
  accounts: Account[];
  recentTransactions: Transaction[];
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netSavings: number;
  budgets: Budget[];
  subscriptions: Subscription[];
  loans: Loan[];
  goals: Goal[];
}

export interface AnalyticsOverview {
  overview: {
    totalSpending: number;
    totalIncome?: number;
    netSavings?: number;
    prevTotalSpending: number;
    spendingChangePct: number;
    dailyAvg: number;
    peakAmount: number;
    peakDate: string;
    weekendSpent?: number;
    weekdaySpent?: number;
  };
  dailyTrend: {
    date: string;
    label: string;
    amount: number;
    income?: number;
  }[];
  monthlyCashflowTrend?: {
    month: string;
    year: number;
    income: number;
    expense: number;
    net: number;
  }[];
  categoryBreakdown: {
    category: string;
    amount: number;
    count?: number;
    color?: string;
    percentage: number;
  }[];
  topMerchants?: {
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  accountsComparison: {
    id: string;
    name: string;
    bank_name?: string | null;
    type: string;
    spent: number;
    percentage: number;
  }[];
  budgets: {
    id: string;
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
    isOver: boolean;
  }[];
}

