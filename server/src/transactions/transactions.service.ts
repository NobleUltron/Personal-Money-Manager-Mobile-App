import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionDto,
  QueryTransactionDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint, query: QueryTransactionDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // Get all user accounts
    const userAccounts = await this.prisma.account.findMany({
      where: { user_id: userId },
      select: { id: true },
    });
    const userAccountIds = userAccounts.map((a) => a.id);

    const where: any = {
      accountId: { in: userAccountIds },
    };

    if (query.accountId && userAccountIds.includes(query.accountId)) {
      where.accountId = query.accountId;
    }

    if (query.type) {
      if (query.type === 'deposit' || query.type === 'income') {
        where.type = { in: ['deposit', 'income'] };
      } else if (query.type === 'withdrawal' || query.type === 'expense') {
        where.type = { in: ['withdrawal', 'expense'] };
      }
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { reason: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              bank_name: true,
              type: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));

    return {
      data: formattedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: bigint, id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.account.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this transaction');
    }

    return {
      ...transaction,
      amount: Number(transaction.amount),
    };
  }

  async create(userId: bigint, dto: CreateTransactionDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.user_id !== userId) {
      throw new ForbiddenException('You do not own this account');
    }

    const normalizedType =
      dto.type === 'income' ? 'deposit' : dto.type === 'expense' ? 'withdrawal' : dto.type;

    const transaction = await this.prisma.transaction.create({
      data: {
        accountId: account.id,
        type: normalizedType,
        amount: dto.amount,
        date: new Date(dto.date),
        reason: dto.reason || '',
        category: dto.category || 'Other',
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return {
      ...transaction,
      amount: Number(transaction.amount),
    };
  }

  async update(userId: bigint, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    if (existing.account.user_id !== userId) {
      throw new ForbiddenException('You do not own this transaction');
    }

    const targetAccount = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!targetAccount || targetAccount.user_id !== userId) {
      throw new ForbiddenException('Invalid target account');
    }

    const normalizedType =
      dto.type === 'income' ? 'deposit' : dto.type === 'expense' ? 'withdrawal' : dto.type;

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        accountId: targetAccount.id,
        type: normalizedType,
        amount: dto.amount,
        date: new Date(dto.date),
        reason: dto.reason || '',
        category: dto.category,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async remove(userId: bigint, id: string) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    if (existing.account.user_id !== userId) {
      throw new ForbiddenException('You do not own this transaction');
    }

    await this.prisma.transaction.delete({
      where: { id },
    });

    return { message: 'Transaction deleted successfully' };
  }
}
