import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, P2PTransferDto } from './dto/transfer.dto';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  // 1. Search / Lookup User by Username or Email
  async lookupUser(query: string, currentUserId: bigint) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const cleanQuery = query.trim().replace(/^@/, '');

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: cleanQuery, mode: 'insensitive' } },
              { email: { contains: cleanQuery, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        profile_picture: true,
        currency: true,
        currency_symbol: true,
      },
      take: 6,
    });

    return users.map((u) => ({
      id: u.id.toString(),
      username: u.username,
      email: u.email,
      profile_picture: u.profile_picture,
      currency: u.currency,
      currency_symbol: u.currency_symbol,
    }));
  }

  // 2. Internal Transfer (Between Own Accounts)
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
      // Debit from source account
      const withdrawal = await tx.transaction.create({
        data: {
          accountId: fromAccount.id,
          type: 'withdrawal',
          amount: dto.amount,
          date,
          category: 'Transfer',
          reason: `${reasonPrefix}Transfer to ${toAccount.name}`,
          created_by_user_id: userId,
        },
      });

      // Credit to destination account
      const deposit = await tx.transaction.create({
        data: {
          accountId: toAccount.id,
          type: 'deposit',
          amount: dto.amount,
          date,
          category: 'Transfer',
          reason: `${reasonPrefix}Transfer from ${fromAccount.name}`,
          created_by_user_id: userId,
        },
      });

      return {
        message: `Successfully transferred ${dto.amount} from ${fromAccount.name} to ${toAccount.name}`,
        sourceTransaction: { ...withdrawal, amount: Number(withdrawal.amount) },
        destinationTransaction: { ...deposit, amount: Number(deposit.amount) },
      };
    });
  }

  // 3. P2P Transfer (Transfer to Another Registered User)
  async transferToUser(senderUserId: bigint, dto: P2PTransferDto) {
    const cleanUsername = dto.recipientUsername.trim().replace(/^@/, '');

    // A. Validate sender and source account
    const [sender, fromAccount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderUserId } }),
      this.prisma.account.findUnique({
        where: { id: dto.fromAccountId },
        include: { transactions: true },
      }),
    ]);

    if (!sender) {
      throw new NotFoundException('Sender user account not found');
    }

    if (!fromAccount || fromAccount.user_id !== senderUserId) {
      throw new ForbiddenException('You do not own the selected source account');
    }

    // B. Calculate current balance of source account
    let currentBalance = Number(fromAccount.initial_balance);
    for (const tx of fromAccount.transactions) {
      const amt = Number(tx.amount);
      if (tx.type === 'deposit' || tx.type === 'income') {
        currentBalance += amt;
      } else if (tx.type === 'withdrawal' || tx.type === 'expense') {
        currentBalance -= amt;
      }
    }

    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient funds in ${fromAccount.name}. Available balance: ${currentBalance.toLocaleString()} ${sender.currency_symbol || 'UGX'}`,
      );
    }

    // C. Validate recipient user
    const recipient = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { email: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
      include: { accounts: true },
    });

    if (!recipient) {
      throw new NotFoundException(`User "@${cleanUsername}" was not found`);
    }

    if (recipient.id === senderUserId) {
      throw new BadRequestException('Cannot transfer money to yourself');
    }

    // D. Find or create recipient destination account
    let recipientAccount = recipient.accounts[0];
    if (!recipientAccount) {
      recipientAccount = await this.prisma.account.create({
        data: {
          user_id: recipient.id,
          name: 'Main Wallet',
          type: 'Cash',
          initial_balance: 0,
        },
      });
    }

    const transferDate = dto.date ? new Date(dto.date) : new Date();
    const customReason = dto.reason ? ` - ${dto.reason}` : '';

    // E. Execute Atomic ACID Transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Debit sender's account (Expense / Withdrawal)
      const senderTx = await tx.transaction.create({
        data: {
          accountId: fromAccount.id,
          type: 'withdrawal',
          amount: dto.amount,
          date: transferDate,
          category: 'Transfer',
          reason: `P2P Transfer to @${recipient.username}${customReason}`,
          created_by_user_id: senderUserId,
        },
      });

      // 2. Credit recipient's account (Income / Deposit)
      const recipientTx = await tx.transaction.create({
        data: {
          accountId: recipientAccount.id,
          type: 'deposit',
          amount: dto.amount,
          date: transferDate,
          category: 'Transfer',
          reason: `P2P Transfer from @${sender.username}${customReason}`,
          created_by_user_id: senderUserId,
        },
      });

      return {
        success: true,
        message: `Successfully sent ${dto.amount.toLocaleString()} ${sender.currency_symbol || 'UGX'} to @${recipient.username}`,
        amount: dto.amount,
        sender: {
          username: sender.username,
          account: fromAccount.name,
          transactionId: senderTx.id,
        },
        recipient: {
          username: recipient.username,
          profilePicture: recipient.profile_picture,
          account: recipientAccount.name,
          transactionId: recipientTx.id,
        },
        date: transferDate.toISOString(),
      };
    });
  }
}
