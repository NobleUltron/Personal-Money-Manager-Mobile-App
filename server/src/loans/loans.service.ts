import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanDto, RepayLoanDto, UpdateLoanDto } from './dto/loan.dto';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint) {
    const loans = await this.prisma.loan.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const formattedLoans = loans.map((l) => {
      const amount = parseFloat(l.amount?.toString() || '0');
      const amountPaid = parseFloat(l.amount_paid?.toString() || '0');
      const remaining = Math.max(0, amount - amountPaid);
      return {
        ...l,
        amount,
        amount_paid: amountPaid,
        remaining,
        isPaidOff: remaining === 0,
      };
    });

    const summary = {
      totalBorrowed: 0,
      borrowedPaid: 0,
      borrowedRemaining: 0,
      totalLent: 0,
      lentPaid: 0,
      lentRemaining: 0,
    };

    for (const l of formattedLoans) {
      if (l.type === 'borrowed') {
        summary.totalBorrowed += l.amount;
        summary.borrowedPaid += l.amount_paid;
        summary.borrowedRemaining += l.remaining;
      } else {
        summary.totalLent += l.amount;
        summary.lentPaid += l.amount_paid;
        summary.lentRemaining += l.remaining;
      }
    }

    return { loans: formattedLoans, summary };
  }

  async repay(userId: bigint, id: string, dto: RepayLoanDto) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this loan');
    }

    const currentAmount = parseFloat(loan.amount?.toString() || '0');
    const currentPaid = parseFloat(loan.amount_paid?.toString() || '0');
    const remaining = currentAmount - currentPaid;

    if (dto.repayment_amount > remaining) {
      throw new BadRequestException('Repayment amount exceeds remaining debt (' + remaining + ')');
    }

    const newAmountPaid = currentPaid + dto.repayment_amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id },
        data: {
          amount_paid: newAmountPaid,
        },
      });

      if (dto.sync_account && dto.accountId) {
        const account = await tx.account.findUnique({
          where: { id: dto.accountId },
        });

        if (account && account.user_id === userId) {
          const isBorrowed = loan.type === 'borrowed';
          await tx.transaction.create({
            data: {
              accountId: dto.accountId,
              type: isBorrowed ? 'withdrawal' : 'deposit',
              amount: dto.repayment_amount,
              date: new Date(),
              reason: isBorrowed ? 'Repayment for loan: ' + loan.name : 'Loan repayment received from: ' + loan.name,
              category: 'Loan Repayment',
            },
          });
        }
      }
    });

    return {
      message: 'Repayment of ' + dto.repayment_amount + ' recorded successfully',
      remaining: Math.max(0, remaining - dto.repayment_amount),
    };
  }

  async create(userId: bigint, dto: CreateLoanDto) {
    return this.prisma.$transaction(async (tx) => {
      let account: any = null;
      if (dto.accountId) {
        account = await tx.account.findUnique({
          where: { id: dto.accountId },
        });
      }

      const loan = await tx.loan.create({
        data: {
          user_id: userId,
          type: dto.type,
          name: dto.name,
          amount: dto.amount,
          amount_paid: dto.amount_paid || 0,
          due_date: dto.due_date ? new Date(dto.due_date) : null,
        },
      });

      if (dto.sync_account && dto.accountId && account && account.user_id === userId) {
        const isBorrowed = dto.type === 'borrowed';
        await tx.transaction.create({
          data: {
            accountId: dto.accountId,
            type: isBorrowed ? 'deposit' : 'withdrawal',
            amount: dto.amount,
            date: new Date(),
            reason: isBorrowed ? 'Borrowed loan from: ' + dto.name : 'Lent money to: ' + dto.name,
            category: isBorrowed ? 'Loan / Borrowed' : 'Loan / Lent',
          },
        });
      }

      const amount = parseFloat(loan.amount?.toString() || '0');
      const amountPaid = parseFloat(loan.amount_paid?.toString() || '0');
      return {
        ...loan,
        amount,
        amount_paid: amountPaid,
        remaining: Math.max(0, amount - amountPaid),
      };
    });
  }

  async update(userId: bigint, id: string, dto: UpdateLoanDto) {
    const existing = await this.prisma.loan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Loan not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this loan');
    }

    const updated = await this.prisma.loan.update({
      where: { id },
      data: {
        type: dto.type,
        name: dto.name,
        amount: dto.amount,
        amount_paid: dto.amount_paid,
        due_date: dto.due_date !== undefined ? (dto.due_date ? new Date(dto.due_date) : null) : existing.due_date,
      },
    });

    const amount = parseFloat(updated.amount?.toString() || '0');
    const amountPaid = parseFloat(updated.amount_paid?.toString() || '0');
    return {
      ...updated,
      amount,
      amount_paid: amountPaid,
      remaining: Math.max(0, amount - amountPaid),
    };
  }

  async remove(userId: bigint, id: string) {
    const existing = await this.prisma.loan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Loan not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this loan');
    }

    await this.prisma.loan.delete({
      where: { id },
    });

    return { message: 'Loan deleted successfully' };
  }
}
