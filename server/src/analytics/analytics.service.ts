import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: bigint) {
    // 1. Get Accounts
    const accounts = await this.prisma.account.findMany({
      where: { user_id: userId },
      include: {
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const userAccountIds = accounts.map((a) => a.id);

    let totalBalance = 0;
    const formattedAccounts = accounts.map((acc) => {
      let deposits = 0;
      let withdrawals = 0;
      for (const t of acc.transactions) {
        const amt = parseFloat(t.amount?.toString() || '0');
        if (t.type === 'deposit' || t.type === 'income') deposits += amt;
        else if (t.type === 'withdrawal' || t.type === 'expense') withdrawals += amt;
      }
      const initial = parseFloat(acc.initial_balance?.toString() || '0');
      const balance = initial + deposits - withdrawals;
      totalBalance += balance;

      const { transactions, ...data } = acc;
      return {
        ...data,
        initial_balance: initial,
        balance,
      };
    });

    // 2. Transactions & Other Entities
    const [allTransactions, recentTransactions, budgets, subscriptions, loans, goals] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: { accountId: { in: userAccountIds } },
          select: { type: true, amount: true },
        }),
        this.prisma.transaction.findMany({
          where: { accountId: { in: userAccountIds } },
          include: {
            account: {
              select: { id: true, name: true, type: true },
            },
          },
          orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
          take: 6,
        }),
        this.prisma.budget.findMany({ where: { user_id: userId } }),
        this.prisma.subscription.findMany({
          where: { user_id: userId },
          orderBy: { next_due_date: 'asc' },
        }),
        this.prisma.loan.findMany({ where: { user_id: userId } }),
        this.prisma.goal.findMany({ where: { user_id: userId } }),
      ]);

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    for (const t of allTransactions) {
      const amt = parseFloat(t.amount?.toString() || '0');
      if (t.type === 'deposit' || t.type === 'income') totalDeposits += amt;
      else if (t.type === 'withdrawal' || t.type === 'expense') totalWithdrawals += amt;
    }

    const netSavings = totalDeposits - totalWithdrawals;

    return {
      accounts: formattedAccounts,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
      totalBalance,
      totalDeposits,
      totalWithdrawals,
      netSavings,
      budgets: budgets.map((b) => ({ ...b, amount: Number(b.amount) })),
      subscriptions: subscriptions.map((s) => ({ ...s, amount: Number(s.amount) })),
      loans: loans.map((l) => ({
        ...l,
        amount: Number(l.amount),
        amount_paid: Number(l.amount_paid),
        remaining: Math.max(0, Number(l.amount) - Number(l.amount_paid)),
      })),
      goals: goals.map((g) => {
        const target = Number(g.target_amount);
        const current = Number(g.current_amount);
        return {
          ...g,
          id: g.id.toString(),
          target_amount: target,
          current_amount: current,
          percentage: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
          isCompleted: current >= target,
        };
      }),
    };
  }

  async getAnalytics(userId: bigint, days = 30) {
    const accounts = await this.prisma.account.findMany({
      where: { user_id: userId },
    });
    const userAccountIds = accounts.map((a) => a.id);

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const previousStartDate = new Date();
    previousStartDate.setDate(now.getDate() - (days * 2 - 1));
    previousStartDate.setHours(0, 0, 0, 0);

    const previousEndDate = new Date();
    previousEndDate.setDate(now.getDate() - days);
    previousEndDate.setHours(23, 59, 59, 999);

    // 6-month window for monthly cash flow trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [transactions, budgets, longTermTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          accountId: { in: userAccountIds },
          date: { gte: previousStartDate },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.budget.findMany({ where: { user_id: userId } }),
      this.prisma.transaction.findMany({
        where: {
          accountId: { in: userAccountIds },
          date: { gte: sixMonthsAgo },
        },
        select: {
          type: true,
          amount: true,
          date: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    let totalSpending = 0;
    let totalIncome = 0;
    let prevTotalSpending = 0;

    const dailyMap: { [dateStr: string]: { date: string; label: string; amount: number; income: number } } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      dailyMap[dateStr] = { date: dateStr, label, amount: 0, income: 0 };
    }

    const categoryMap: { [cat: string]: { amount: number; count: number } } = {};
    const accountSpentMap: { [accId: string]: number } = {};
    const merchantMap: { [name: string]: { amount: number; count: number } } = {};

    let weekendSpent = 0;
    let weekendDays = 0;
    let weekdaySpent = 0;
    let weekdayDays = 0;

    let peakAmount = 0;
    let peakDate = 'N/A';

    for (const t of transactions) {
      const tDate = new Date(t.date);
      const isExpense = t.type === 'withdrawal' || t.type === 'expense';
      const isIncome = t.type === 'deposit' || t.type === 'income';
      const amt = parseFloat(t.amount?.toString() || '0');

      if (tDate >= startDate) {
        const dateStr = tDate.toISOString().split('T')[0];

        if (isExpense) {
          totalSpending += amt;
          if (dailyMap[dateStr]) {
            dailyMap[dateStr].amount += amt;
          }

          const cat = t.category || 'Other';
          if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
          categoryMap[cat].amount += amt;
          categoryMap[cat].count += 1;

          accountSpentMap[t.accountId] = (accountSpentMap[t.accountId] || 0) + amt;

          const merchantName = (t.reason || t.category || 'Other').trim();
          if (!merchantMap[merchantName]) merchantMap[merchantName] = { amount: 0, count: 0 };
          merchantMap[merchantName].amount += amt;
          merchantMap[merchantName].count += 1;

          const dayOfWeek = tDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendSpent += amt;
          } else {
            weekdaySpent += amt;
          }
        } else if (isIncome) {
          totalIncome += amt;
          if (dailyMap[dateStr]) {
            dailyMap[dateStr].income += amt;
          }
        }
      } else if (tDate >= previousStartDate && tDate <= previousEndDate) {
        if (isExpense) {
          prevTotalSpending += amt;
        }
      }
    }

    const dailyTrend = Object.values(dailyMap);
    for (const item of dailyTrend) {
      if (item.amount > peakAmount) {
        peakAmount = item.amount;
        peakDate = item.label;
      }
    }

    const spendingChangePct =
      prevTotalSpending > 0
        ? Math.round(((totalSpending - prevTotalSpending) / prevTotalSpending) * 1000) / 10
        : 0;

    const dailyAvg = days > 0 ? Math.round((totalSpending / days) * 100) / 100 : 0;

    // Palette for categories
    const categoryColors = [
      '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6',
      '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4', '#64748B'
    ];

    const categoryBreakdown = Object.keys(categoryMap)
      .map((cat, idx) => ({
        category: cat,
        amount: categoryMap[cat].amount,
        count: categoryMap[cat].count,
        color: categoryColors[idx % categoryColors.length],
        percentage:
          totalSpending > 0
            ? Math.round((categoryMap[cat].amount / totalSpending) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topMerchants = Object.keys(merchantMap)
      .map((name) => ({
        name,
        amount: merchantMap[name].amount,
        count: merchantMap[name].count,
        percentage:
          totalSpending > 0
            ? Math.round((merchantMap[name].amount / totalSpending) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Monthly 6-Month Cash Flow Trend
    const monthlyMap: { [key: string]: { month: string; year: number; income: number; expense: number; net: number } } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthLabel = monthNames[d.getMonth()];
      monthlyMap[key] = {
        month: monthLabel,
        year: d.getFullYear(),
        income: 0,
        expense: 0,
        net: 0,
      };
    }

    for (const t of longTermTransactions) {
      const tDate = new Date(t.date);
      const key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
      if (monthlyMap[key]) {
        const amt = parseFloat(t.amount?.toString() || '0');
        if (t.type === 'deposit' || t.type === 'income') {
          monthlyMap[key].income += amt;
        } else if (t.type === 'withdrawal' || t.type === 'expense') {
          monthlyMap[key].expense += amt;
        }
        monthlyMap[key].net = monthlyMap[key].income - monthlyMap[key].expense;
      }
    }

    const monthlyCashflowTrend = Object.values(monthlyMap);

    const accountsComparison = accounts
      .map((acc) => {
        const spent = accountSpentMap[acc.id] || 0;
        return {
          id: acc.id,
          name: acc.name,
          bank_name: acc.bank_name,
          type: acc.type,
          spent,
          percentage: totalSpending > 0 ? Math.round((spent / totalSpending) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.spent - a.spent);

    const budgetsOverview = budgets.map((b) => {
      const limit = Number(b.amount);
      const spent = categoryMap[b.category]?.amount || 0;
      const remaining = Math.max(0, limit - spent);
      const pct = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
      return {
        id: b.id,
        category: b.category,
        limit,
        spent,
        remaining,
        percentage: pct,
        isOver: spent > limit,
      };
    });

    return {
      overview: {
        totalSpending,
        totalIncome,
        netSavings: totalIncome - totalSpending,
        prevTotalSpending,
        spendingChangePct,
        dailyAvg,
        peakAmount,
        peakDate,
        weekendSpent,
        weekdaySpent,
      },
      dailyTrend,
      monthlyCashflowTrend,
      categoryBreakdown,
      topMerchants,
      accountsComparison,
      budgets: budgetsOverview,
    };
  }
}
