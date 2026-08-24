import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, DepositGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint) {
    const goals = await this.prisma.goal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    let totalTarget = 0;
    let totalCurrent = 0;
    let completedCount = 0;

    const formattedGoals = goals.map((g) => {
      const target = Number(g.target_amount);
      const current = Number(g.current_amount);
      const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0;
      const isCompleted = current >= target;

      totalTarget += target;
      totalCurrent += current;
      if (isCompleted) completedCount++;

      return {
        ...g,
        id: g.id.toString(),
        target_amount: target,
        current_amount: current,
        percentage,
        isCompleted,
      };
    });

    const overallPercentage =
      totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 1000) / 10) : 0;

    return {
      goals: formattedGoals,
      summary: {
        totalTarget,
        totalCurrent,
        completedCount,
        overallPercentage,
      },
    };
  }

  async create(userId: bigint, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        user_id: userId,
        name: dto.name,
        target_amount: dto.target_amount,
        current_amount: dto.current_amount || 0,
        target_date: dto.target_date ? new Date(dto.target_date) : null,
        category: dto.category || 'General',
        color: dto.color || '#6366f1',
        notes: dto.notes || null,
      },
    });

    const target = Number(goal.target_amount);
    const current = Number(goal.current_amount);

    return {
      ...goal,
      id: goal.id.toString(),
      target_amount: target,
      current_amount: current,
      percentage: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
      isCompleted: current >= target,
    };
  }

  async deposit(userId: bigint, id: string, dto: DepositGoalDto) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: BigInt(id) },
    });

    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }

    if (goal.user_id !== userId) {
      throw new ForbiddenException('You do not own this savings goal');
    }

    const newCurrent = Number(goal.current_amount) + dto.amount;

    const updated = await this.prisma.goal.update({
      where: { id: BigInt(id) },
      data: {
        current_amount: newCurrent,
      },
    });

    const target = Number(updated.target_amount);
    const current = Number(updated.current_amount);

    return {
      ...updated,
      id: updated.id.toString(),
      target_amount: target,
      current_amount: current,
      percentage: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
      isCompleted: current >= target,
      message: `Deposited ${dto.amount} to ${updated.name}`,
    };
  }

  async update(userId: bigint, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: BigInt(id) },
    });

    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }

    if (goal.user_id !== userId) {
      throw new ForbiddenException('You do not own this savings goal');
    }

    const updated = await this.prisma.goal.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        target_amount: dto.target_amount,
        current_amount: dto.current_amount,
        target_date: dto.target_date ? new Date(dto.target_date) : null,
        category: dto.category,
        color: dto.color,
        notes: dto.notes,
      },
    });

    const target = Number(updated.target_amount);
    const current = Number(updated.current_amount);

    return {
      ...updated,
      id: updated.id.toString(),
      target_amount: target,
      current_amount: current,
      percentage: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
      isCompleted: current >= target,
    };
  }

  async remove(userId: bigint, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: BigInt(id) },
    });

    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }

    if (goal.user_id !== userId) {
      throw new ForbiddenException('You do not own this savings goal');
    }

    await this.prisma.goal.delete({
      where: { id: BigInt(id) },
    });

    return { message: 'Savings goal deleted successfully' };
  }
}
