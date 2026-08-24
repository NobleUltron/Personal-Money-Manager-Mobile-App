import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/transfer.dto';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async transfer(userId: bigint, dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.account.findUnique({ where: { id: dto.fromAccountId } }),
      this.prisma.account.findUnique({ where: { id: dto.toAccountId } }),
    ]);

    if (!fromAccount || !toAccount) {
      throw new NotFoundException('One or both accounts were not found');
    }

    if (fromAccount.user_id !== userId || toAccount.user_id !== userId) {
      throw new ForbiddenException('You do not own both accounts involved in this transfer');
    }

    const date = new Date(dto.date);
    const reasonPrefix = dto.reason ? `${dto.reason} - ` : '';

    return this.prisma.$transaction(async (tx) => {
      // 1. Debit from source account
      const withdrawal = await tx.transaction.create({
        data: {
          accountId: fromAccount.id,
          type: 'withdrawal',
          amount: dto.amount,
          date,
          category: 'Transfer',
          reason: `${reasonPrefix}Transfer to ${toAccount.name}`,
        },
      });

      // 2. Credit to destination account
      const deposit = await tx.transaction.create({
        data: {
          accountId: toAccount.id,
          type: 'deposit',
          amount: dto.amount,
          date,
          category: 'Transfer',
          reason: `${reasonPrefix}Transfer from ${fromAccount.name}`,
        },
      });

      return {
        message: `Successfully transferred ${dto.amount} from ${fromAccount.name} to ${toAccount.name}`,
        sourceTransaction: { ...withdrawal, amount: Number(withdrawal.amount) },
        destinationTransaction: { ...deposit, amount: Number(deposit.amount) },
      };
    });
  }
}
