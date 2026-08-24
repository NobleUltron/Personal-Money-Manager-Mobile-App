import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const userAccounts = await this.prisma.account.findMany({
      where: { user_id: userId },
      select: { id: true },
    });
    const userAccountIds = userAccounts.map((a) => a.id);

    const [budgets, monthlyExpenses] = await Promise.all([
      this.prisma.budget.findMany({
        where: { user_id: userId },
        orderBy: { category: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          accountId: { in: userAccountIds },
          type: { in: ['withdrawal', 'expense'] },
          date: { gte: startOfMonth },
        },
        select: {
          category: true,
          amount: true,
        },
      }),
    ]);

    const spentMap: { [cat: string]: number } = {};
    for (const exp of monthlyExpenses) {
      spentMap[exp.category] = (spentMap[exp.category] || 0) + Number(exp.amount);
    }

    return budgets.map((b) => {
      const limit = Number(b.amount);
      const spent = spentMap[b.category] || 0;
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 1000) / 10) : 0;
      const isOver = spent > limit;

      return {
        id: b.id,
        category: b.category,
        amount: limit,
        spent,
        remaining,
        percentage,
        isOver,
        created_at: b.created_at,
        updated_at: b.updated_at,
      };
    });
  }

  async createOrUpdate(userId: bigint, dto: CreateBudgetDto) {
    const budget = await this.prisma.budget.upsert({
      where: {
        user_id_category: {
          user_id: userId,
          category: dto.category,
        },
      },
      create: {
        user_id: userId,
        category: dto.category,
        amount: dto.amount,
      },
      update: {
        amount: dto.amount,
      },
    });

    return {
      ...budget,
      amount: Number(budget.amount),
    };
  }

  async remove(userId: bigint, id: string) {
    const existing = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Budget not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not own this budget');
    }

    await this.prisma.budget.delete({
      where: { id },
    });

    return { message: 'Budget deleted successfully' };
  }
}
