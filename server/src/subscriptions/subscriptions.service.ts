import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { user_id: userId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { next_due_date: 'asc' },
    });

    return subscriptions.map((s) => ({
      ...s,
      amount: Number(s.amount),
    }));
  }

  async create(userId: bigint, dto: CreateSubscriptionDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account || account.user_id !== userId) {
      throw new ForbiddenException('Invalid account specified');
    }

    const sub = await this.prisma.subscription.create({
      data: {
        user_id: userId,
        accountId: account.id,
        name: dto.name,
        amount: dto.amount,
        frequency: dto.frequency,
        next_due_date: new Date(dto.next_due_date),
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
      ...sub,
      amount: Number(sub.amount),
    };
  }

  async update(userId: bigint, id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not own this subscription');
    }

    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account || account.user_id !== userId) {
      throw new ForbiddenException('Invalid account specified');
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        accountId: account.id,
        name: dto.name,
        amount: dto.amount,
        frequency: dto.frequency,
        next_due_date: new Date(dto.next_due_date),
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
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You do not own this subscription');
    }

    await this.prisma.subscription.delete({
      where: { id },
    });

    return { message: 'Subscription cancelled successfully' };
  }
}
