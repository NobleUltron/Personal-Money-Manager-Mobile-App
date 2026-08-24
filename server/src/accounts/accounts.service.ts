import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint) {
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

    return accounts.map((acc) => {
      let deposits = 0;
      let withdrawals = 0;

      for (const t of acc.transactions) {
        const amt = parseFloat(t.amount?.toString() || '0');
        if (t.type === 'deposit' || t.type === 'income') {
          deposits += amt;
        } else if (t.type === 'withdrawal' || t.type === 'expense') {
          withdrawals += amt;
        }
      }

      const initial = parseFloat(acc.initial_balance?.toString() || '0');
      const balance = initial + deposits - withdrawals;

      const { transactions, ...accountData } = acc;
      return {
        ...accountData,
        initial_balance: initial,
        balance,
      };
    });
  }

  async findOne(userId: bigint, id: string) {
    const acc = await this.prisma.account.findUnique({
      where: { id },
      include: {
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
          },
        },
      },
    });

    if (!acc) {
      throw new NotFoundException('Account not found');
    }

    if (acc.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    let deposits = 0;
    let withdrawals = 0;

    for (const t of acc.transactions) {
      const amt = parseFloat(t.amount?.toString() || '0');
      if (t.type === 'deposit' || t.type === 'income') {
        deposits += amt;
      } else if (t.type === 'withdrawal' || t.type === 'expense') {
        withdrawals += amt;
      }
    }

    const initial = parseFloat(acc.initial_balance?.toString() || '0');
    const balance = initial + deposits - withdrawals;

    const { transactions, ...accountData } = acc;
    return {
      ...accountData,
      initial_balance: initial,
      balance,
    };
  }

  async create(userId: bigint, dto: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data: {
        user_id: userId,
        name: dto.name,
        bank_name: dto.bank_name || null,
        account_number: dto.account_number || null,
        type: dto.type,
        initial_balance: dto.initial_balance || 0,
      },
    });

    return {
      ...account,
      initial_balance: Number(account.initial_balance),
      balance: Number(account.initial_balance),
    };
  }

  async update(userId: bigint, id: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        bank_name: dto.bank_name !== undefined ? dto.bank_name : existing.bank_name,
        account_number: dto.account_number !== undefined ? dto.account_number : existing.account_number,
        type: dto.type,
        initial_balance: dto.initial_balance !== undefined ? dto.initial_balance : existing.initial_balance,
      },
    });

    return this.findOne(userId, updated.id);
  }

  async remove(userId: bigint, id: string) {
    const existing = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    await this.prisma.account.delete({
      where: { id },
    });

    return { message: 'Account deleted successfully' };
  }
}
