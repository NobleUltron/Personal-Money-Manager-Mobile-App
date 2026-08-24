import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async exportData(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const [accounts, budgets, subscriptions, loans, goals] = await Promise.all([
      this.prisma.account.findMany({
        where: { user_id: userId },
        include: { transactions: true },
      }),
      this.prisma.budget.findMany({ where: { user_id: userId } }),
      this.prisma.subscription.findMany({ where: { user_id: userId } }),
      this.prisma.loan.findMany({ where: { user_id: userId } }),
      this.prisma.goal.findMany({ where: { user_id: userId } }),
    ]);

    const allTransactions: any[] = [];
    const sanitizedAccounts = accounts.map((acc) => {
      const { transactions, ...accountData } = acc;
      transactions.forEach((t) => {
        allTransactions.push({
          ...t,
          amount: Number(t.amount),
        });
      });
      return {
        ...accountData,
        initial_balance: Number(accountData.initial_balance),
      };
    });

    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user: {
        username: user?.username,
        email: user?.email,
        currency: user?.currency,
        currency_symbol: user?.currency_symbol,
      },
      accounts: sanitizedAccounts,
      transactions: allTransactions,
      budgets: budgets.map((b) => ({ ...b, amount: Number(b.amount) })),
      subscriptions: subscriptions.map((s) => ({ ...s, amount: Number(s.amount) })),
      loans: loans.map((l) => ({
        ...l,
        amount: Number(l.amount),
        amount_paid: Number(l.amount_paid),
      })),
      goals: goals.map((g) => ({
        ...g,
        id: g.id.toString(),
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
      })),
    };
  }

  async importData(userId: bigint, backupData: any) {
    if (!backupData || typeof backupData !== 'object' || !backupData.version) {
      throw new BadRequestException('Invalid backup file format');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore User currency preferences
      if (backupData.user?.currency) {
        await tx.user.update({
          where: { id: userId },
          data: {
            currency: backupData.user.currency,
            currency_symbol: backupData.user.currency_symbol || backupData.user.currency,
          },
        });
      }

      // 2. Restore Accounts
      const accountMap: { [oldId: string]: string } = {};
      if (Array.isArray(backupData.accounts)) {
        for (const acc of backupData.accounts) {
          const created = await tx.account.upsert({
            where: { id: acc.id },
            create: {
              id: acc.id,
              user_id: userId,
              name: acc.name,
              bank_name: acc.bank_name || null,
              account_number: acc.account_number || null,
              type: acc.type || 'Checking',
              initial_balance: acc.initial_balance || 0,
            },
            update: {
              name: acc.name,
              bank_name: acc.bank_name || null,
              account_number: acc.account_number || null,
              type: acc.type || 'Checking',
              initial_balance: acc.initial_balance || 0,
            },
          });
          accountMap[acc.id] = created.id;
        }
      }

      // 3. Restore Transactions
      let txCount = 0;
      if (Array.isArray(backupData.transactions)) {
        for (const t of backupData.transactions) {
          const targetAccountId = accountMap[t.accountId] || t.accountId;
          if (targetAccountId) {
            await tx.transaction.upsert({
              where: { id: t.id },
              create: {
                id: t.id,
                accountId: targetAccountId,
                type: t.type,
                amount: t.amount,
                date: new Date(t.date),
                reason: t.reason || '',
                category: t.category || 'Other',
              },
              update: {
                accountId: targetAccountId,
                type: t.type,
                amount: t.amount,
                date: new Date(t.date),
                reason: t.reason || '',
                category: t.category || 'Other',
              },
            });
            txCount++;
          }
        }
      }

      // 4. Restore Budgets
      if (Array.isArray(backupData.budgets)) {
        for (const b of backupData.budgets) {
          await tx.budget.upsert({
            where: {
              user_id_category: {
                user_id: userId,
                category: b.category,
              },
            },
            create: {
              id: b.id,
              user_id: userId,
              category: b.category,
              amount: b.amount,
            },
            update: {
              amount: b.amount,
            },
          });
        }
      }

      // 5. Restore Subscriptions
      if (Array.isArray(backupData.subscriptions)) {
        for (const s of backupData.subscriptions) {
          const accId = accountMap[s.accountId] || s.accountId;
          if (accId) {
            await tx.subscription.upsert({
              where: { id: s.id },
              create: {
                id: s.id,
                user_id: userId,
                accountId: accId,
                name: s.name,
                amount: s.amount,
                frequency: s.frequency || 'monthly',
                next_due_date: new Date(s.next_due_date),
                category: s.category || 'Other',
              },
              update: {
                accountId: accId,
                name: s.name,
                amount: s.amount,
                frequency: s.frequency || 'monthly',
                next_due_date: new Date(s.next_due_date),
                category: s.category || 'Other',
              },
            });
          }
        }
      }

      // 6. Restore Loans
      if (Array.isArray(backupData.loans)) {
        for (const l of backupData.loans) {
          await tx.loan.upsert({
            where: { id: l.id },
            create: {
              id: l.id,
              user_id: userId,
              type: l.type || 'borrowed',
              name: l.name,
              amount: l.amount,
              amount_paid: l.amount_paid || 0,
              due_date: l.due_date ? new Date(l.due_date) : null,
              
            },
            update: {
              type: l.type || 'borrowed',
              name: l.name,
              amount: l.amount,
              amount_paid: l.amount_paid || 0,
              due_date: l.due_date ? new Date(l.due_date) : null,
            },
          });
        }
      }

      // 7. Restore Goals
      let goalCount = 0;
      if (Array.isArray(backupData.goals)) {
        for (const g of backupData.goals) {
          await tx.goal.create({
            data: {
              user_id: userId,
              name: g.name,
              target_amount: g.target_amount,
              current_amount: g.current_amount || 0,
              target_date: g.target_date ? new Date(g.target_date) : null,
              category: g.category || 'General',
              color: g.color || '#6366f1',
              notes: g.notes || null,
            },
          });
          goalCount++;
        }
      }

      return {
        message: `Backup data successfully restored: ${Object.keys(accountMap).length} accounts, ${txCount} transactions, and ${goalCount} goals.`,
      };
    });
  }
}
