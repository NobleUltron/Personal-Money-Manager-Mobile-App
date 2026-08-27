import { apiClient } from './client';
import {
  Account,
  AnalyticsOverview,
  Budget,
  DashboardSummary,
  Goal,
  Loan,
  Subscription,
  Transaction,
  User,
} from '../../types';

export const authApi = {
  async register(data: { username: string; email?: string; password: string; currency?: string; currency_symbol?: string }) {
    const res = await apiClient.post('/api/auth/register', data);
    return res.data;
  },

  async login(data: { username: string; password: string }) {
    const res = await apiClient.post('/api/auth/login', data);
    return res.data;
  },

  async verify2FA(data: { code: string; tempToken: string }) {
    const res = await apiClient.post('/api/auth/two-factor/verify', data);
    return res.data;
  },

  async resend2FA(data: { tempToken: string }) {
    const res = await apiClient.post('/api/auth/two-factor/resend', data);
    return res.data;
  },

  async forgotPassword(data: { username: string }) {
    const res = await apiClient.post('/api/auth/forgot-password', data);
    return res.data;
  },

  async resetPassword(data: { token: string; password: string }) {
    const res = await apiClient.post('/api/auth/reset-password', data);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },
};

export const accountsApi = {
  async getAll(): Promise<Account[]> {
    const res = await apiClient.get('/api/accounts');
    return res.data;
  },

  async getOne(id: string): Promise<Account> {
    const res = await apiClient.get(`/api/accounts/${id}`);
    return res.data;
  },

  async create(data: { name: string; bank_name?: string; account_number?: string; type: string; initial_balance?: number }): Promise<Account> {
    const res = await apiClient.post('/api/accounts', data);
    return res.data;
  },

  async update(id: string, data: { name: string; bank_name?: string; account_number?: string; type: string; initial_balance?: number }): Promise<Account> {
    const res = await apiClient.patch(`/api/accounts/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/accounts/${id}`);
    return res.data;
  },
};

export const transactionsApi = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    type?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Transaction[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const res = await apiClient.get('/api/transactions', { params });
    return res.data;
  },

  async create(data: {
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'income' | 'expense';
    amount: number;
    date: string;
    reason?: string;
    category?: string;
  }): Promise<Transaction> {
    const res = await apiClient.post('/api/transactions', data);
    return res.data;
  },

  async update(id: string, data: {
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'income' | 'expense';
    amount: number;
    date: string;
    reason?: string;
    category: string;
  }): Promise<Transaction> {
    const res = await apiClient.patch(`/api/transactions/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/transactions/${id}`);
    return res.data;
  },
};

export const transfersApi = {
  async transfer(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    reason?: string;
  }) {
    const res = await apiClient.post('/api/transfers', data);
    return res.data;
  },
};

export const budgetsApi = {
  async getAll(): Promise<Budget[]> {
    const res = await apiClient.get('/api/budgets');
    return res.data;
  },

  async createOrUpdate(data: { category: string; amount: number }): Promise<Budget> {
    const res = await apiClient.post('/api/budgets', data);
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/budgets/${id}`);
    return res.data;
  },
};

export const subscriptionsApi = {
  async getAll(): Promise<Subscription[]> {
    const res = await apiClient.get('/api/subscriptions');
    return res.data;
  },

  async create(data: {
    accountId: string;
    name: string;
    amount: number;
    frequency: 'monthly' | 'yearly' | 'weekly';
    next_due_date: string;
    category?: string;
  }): Promise<Subscription> {
    const res = await apiClient.post('/api/subscriptions', data);
    return res.data;
  },

  async update(id: string, data: {
    accountId: string;
    name: string;
    amount: number;
    frequency: 'monthly' | 'yearly' | 'weekly';
    next_due_date: string;
    category: string;
  }): Promise<Subscription> {
    const res = await apiClient.patch(`/api/subscriptions/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/subscriptions/${id}`);
    return res.data;
  },
};

export const loansApi = {
  async getAll(): Promise<{
    loans: Loan[];
    summary: {
      totalBorrowed: number;
      borrowedPaid: number;
      borrowedRemaining: number;
      totalLent: number;
      lentPaid: number;
      lentRemaining: number;
    };
  }> {
    const res = await apiClient.get('/api/loans');
    return res.data;
  },

  async create(data: {
    type: 'borrowed' | 'lent';
    name: string;
    amount: number;
    amount_paid?: number;
    due_date?: string;
    accountId?: string;
    sync_account?: boolean;
  }): Promise<Loan> {
    const res = await apiClient.post('/api/loans', data);
    return res.data;
  },

  async repay(id: string, data: {
    repayment_amount: number;
    accountId?: string;
    sync_account?: boolean;
  }) {
    const res = await apiClient.post(`/api/loans/${id}/repay`, data);
    return res.data;
  },

  async update(id: string, data: {
    type: 'borrowed' | 'lent';
    name: string;
    amount: number;
    amount_paid: number;
    due_date?: string;
    accountId?: string;
  }): Promise<Loan> {
    const res = await apiClient.patch(`/api/loans/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/loans/${id}`);
    return res.data;
  },
};

export const goalsApi = {
  async getAll(): Promise<{
    goals: Goal[];
    summary: {
      totalTarget: number;
      totalCurrent: number;
      completedCount: number;
      overallPercentage: number;
    };
  }> {
    const res = await apiClient.get('/api/goals');
    return res.data;
  },

  async create(data: {
    name: string;
    target_amount: number;
    current_amount?: number;
    target_date?: string;
    category?: string;
    color?: string;
    notes?: string;
  }): Promise<Goal> {
    const res = await apiClient.post('/api/goals', data);
    return res.data;
  },

  async deposit(id: string, amount: number): Promise<Goal> {
    const res = await apiClient.post(`/api/goals/${id}/deposit`, { amount });
    return res.data;
  },

  async update(id: string, data: {
    name: string;
    target_amount: number;
    current_amount: number;
    target_date?: string;
    category?: string;
    color?: string;
    notes?: string;
  }): Promise<Goal> {
    const res = await apiClient.patch(`/api/goals/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/goals/${id}`);
    return res.data;
  },
};

export const analyticsApi = {
  async getDashboard(): Promise<DashboardSummary> {
    const res = await apiClient.get('/api/analytics/dashboard');
    return res.data;
  },

  async getOverview(days = 30): Promise<AnalyticsOverview> {
    const res = await apiClient.get('/api/analytics/overview', { params: { days } });
    return res.data;
  },
};

export const settingsApi = {
  async getProfile(): Promise<User> {
    const res = await apiClient.get('/api/users/profile');
    return res.data;
  },

  async updateProfile(data: {
    username: string;
    email?: string;
    currency?: string;
    currency_symbol?: string;
    profile_picture?: string;
  }): Promise<User> {
    const res = await apiClient.patch('/api/users/profile', data);
    return res.data;
  },

  async convertCurrency(data: {
    to_currency: string;
    to_symbol: string;
    rate: number;
    convert_balances: boolean;
  }): Promise<User> {
    const res = await apiClient.post('/api/users/convert-currency', data);
    return res.data;
  },
  async updatePassword(data: { currentPassword: string; newPassword: string }) {
    const res = await apiClient.patch('/api/users/password', data);
    return res.data;
  },

  async setup2FA(): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  }> {
    const res = await apiClient.post('/api/users/two-factor/setup');
    return res.data;
  },

  async enable2FA(data: {
    code: string;
    secret: string;
    backupCodes: string[];
  }): Promise<{ two_factor_enabled: boolean; message: string }> {
    const res = await apiClient.post('/api/users/two-factor/enable', data);
    return res.data;
  },

  async disable2FA(data: {
    password: string;
  }): Promise<{ two_factor_enabled: boolean; message: string }> {
    const res = await apiClient.post('/api/users/two-factor/disable', data);
    return res.data;
  },

  async toggle2FA(enable: boolean) {
    const res = await apiClient.post('/api/users/two-factor/toggle', { enable });
    return res.data;
  },

  async exportData() {
    const res = await apiClient.get('/api/backup/export');
    return res.data;
  },

  async importData(backupData: any) {
    const res = await apiClient.post('/api/backup/import', backupData);
    return res.data;
  },
};


export const fxApi = {
  async getRates(forceRefresh = false): Promise<{
    base: string;
    rates: Record<string, number>;
    last_updated: string;
    source: string;
    total_currencies: number;
  }> {
    const res = await apiClient.get(`/fx/rates${forceRefresh ? '?refresh=true' : ''}`);
    return res.data;
  },

  async convert(amount: number, from: string, to: string) {
    const res = await apiClient.get(`/fx/convert`, {
      params: { amount, from, to },
    });
    return res.data;
  },

  async refreshRates() {
    const res = await apiClient.post('/fx/refresh');
    return res.data;
  },
};

