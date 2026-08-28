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

    // Get all accessible accounts (personal + shared)
    const accessibleAccounts = await this.prisma.account.findMany({
      where: {
        OR: [
          { user_id: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    const userAccountIds = accessibleAccounts.map((a) => a.id);

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
              user_id: true,
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              profile_picture: true,
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
      creator: t.creator
        ? {
            id: t.creator.id.toString(),
            username: t.creator.username,
            profile_picture: t.creator.profile_picture,
          }
        : null,
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
        account: {
          include: {
            members: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            profile_picture: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const isOwner = transaction.account.user_id === userId;
    const isMember = transaction.account.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this transaction');
    }

    return {
      ...transaction,
      amount: Number(transaction.amount),
      creator: transaction.creator
        ? {
            id: transaction.creator.id.toString(),
            username: transaction.creator.username,
            profile_picture: transaction.creator.profile_picture,
          }
        : null,
    };
  }

  async create(userId: bigint, dto: CreateTransactionDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
      include: { members: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const isOwner = account.user_id === userId;
    const membership = account.members.find((m) => m.userId === userId);

    if (!isOwner && (!membership || membership.role === 'VIEWER')) {
      throw new ForbiddenException('You do not have permission to add transactions to this account');
    }

    const normalizedType =
      dto.type === 'income' ? 'deposit' : dto.type === 'expense' ? 'withdrawal' : dto.type;

    const transaction = await this.prisma.transaction.create({
      data: {
        accountId: account.id,
        created_by_user_id: userId,
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
        creator: {
          select: {
            id: true,
            username: true,
            profile_picture: true,
          },
        },
      },
    });

    return {
      ...transaction,
      amount: Number(transaction.amount),
      creator: transaction.creator
        ? {
            id: transaction.creator.id.toString(),
            username: transaction.creator.username,
            profile_picture: transaction.creator.profile_picture,
          }
        : null,
    };
  }

  async update(userId: bigint, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        account: {
          include: { members: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    const isOwner = existing.account.user_id === userId;
    const membership = existing.account.members.find((m) => m.userId === userId);
    const isCreator = existing.created_by_user_id === userId;

    if (!isOwner && (!membership || membership.role === 'VIEWER') && !isCreator) {
      throw new ForbiddenException('You do not have permission to edit this transaction');
    }

    const targetAccount = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
      include: { members: true },
    });

    if (!targetAccount) {
      throw new NotFoundException('Target account not found');
    }

    const isTargetOwner = targetAccount.user_id === userId;
    const targetMembership = targetAccount.members.find((m) => m.userId === userId);

    if (!isTargetOwner && (!targetMembership || targetMembership.role === 'VIEWER')) {
      throw new ForbiddenException('Invalid target account or missing permission');
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
        creator: {
          select: {
            id: true,
            username: true,
            profile_picture: true,
          },
        },
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
      creator: updated.creator
        ? {
            id: updated.creator.id.toString(),
            username: updated.creator.username,
            profile_picture: updated.creator.profile_picture,
          }
        : null,
    };
  }

  async remove(userId: bigint, id: string) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        account: {
          include: { members: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    const isOwner = existing.account.user_id === userId;
    const membership = existing.account.members.find((m) => m.userId === userId);
    const isCreator = existing.created_by_user_id === userId;

    if (!isOwner && (!membership || membership.role === 'VIEWER') && !isCreator) {
      throw new ForbiddenException('You do not have permission to delete this transaction');
    }

    await this.prisma.transaction.delete({
      where: { id },
    });

    return { message: 'Transaction deleted successfully' };
  }
}