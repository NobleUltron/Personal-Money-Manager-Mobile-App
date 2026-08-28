import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateInvitationDto,
  UpdateMemberRoleDto,
  JoinAccountDto,
} from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: bigint) {
    const accounts = await this.prisma.account.findMany({
      where: {
        OR: [
          { user_id: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_picture: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile_picture: true,
              },
            },
          },
        },
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

      const isOwner = acc.user_id === userId;
      const membership = acc.members.find((m) => m.userId === userId);
      const userRole = isOwner ? 'OWNER' : membership?.role || 'VIEWER';
      const isShared = acc.members.length > 0;

      const { transactions, ...accountData } = acc;
      return {
        ...accountData,
        initial_balance: initial,
        balance,
        is_owner: isOwner,
        user_role: userRole,
        is_shared: isShared,
        members_count: acc.members.length + 1, // members + owner
      };
    });
  }

  async findOne(userId: bigint, id: string) {
    const acc = await this.prisma.account.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile_picture: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile_picture: true,
              },
            },
          },
        },
        transactions: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                profile_picture: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });

    if (!acc) {
      throw new NotFoundException('Account not found');
    }

    const isOwner = acc.user_id === userId;
    const membership = acc.members.find((m) => m.userId === userId);

    if (!isOwner && !membership) {
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
    const userRole = isOwner ? 'OWNER' : membership?.role || 'VIEWER';
    const isShared = acc.members.length > 0;

    const { transactions, ...accountData } = acc;
    return {
      ...accountData,
      initial_balance: initial,
      balance,
      is_owner: isOwner,
      user_role: userRole,
      is_shared: isShared,
      members_count: acc.members.length + 1,
      transactions: transactions.map((t) => ({
        ...t,
        amount: parseFloat(t.amount.toString()),
      })),
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
      is_owner: true,
      user_role: 'OWNER',
      is_shared: false,
      members_count: 1,
    };
  }

  async update(userId: bigint, id: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.account.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    const isOwner = existing.user_id === userId;
    const membership = existing.members.find((m) => m.userId === userId);

    if (!isOwner && membership?.role !== 'EDITOR') {
      throw new ForbiddenException('You do not have permission to edit this account');
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
      throw new ForbiddenException('Only the owner can delete this account');
    }

    await this.prisma.account.delete({
      where: { id },
    });

    return { message: 'Account deleted successfully' };
  }

  // --- SHARING & INVITATIONS ---

  async createInvitation(userId: bigint, accountId: string, dto: CreateInvitationDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.user_id !== userId) {
      throw new ForbiddenException('Only the account owner can invite members');
    }

    // Generate clean 8-character invite code (e.g. FAM-8492)
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
    const prefix = account.type === 'Cash' ? 'CSH' : account.type === 'Bank' ? 'BNK' : 'WAL';
    const inviteCode = `${prefix}-${randomHex}`;

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.accountInvitation.create({
      data: {
        accountId,
        invitedByUserId: userId,
        inviteCode,
        inviteeEmail: dto.invitee_email || null,
        role: dto.role || 'EDITOR',
        expires_at: expiresAt,
      },
    });

    return invitation;
  }

  async getMembers(userId: bigint, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile_picture: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile_picture: true,
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
        invitations: {
          where: {
            status: 'PENDING',
            expires_at: { gt: new Date() },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const isOwner = account.user_id === userId;
    const isMember = account.members.some((m) => m.userId === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this account');
    }

    return {
      owner: {
        id: account.user.id.toString(),
        username: account.user.username,
        email: account.user.email,
        profile_picture: account.user.profile_picture,
        role: 'OWNER',
      },
      members: account.members.map((m) => ({
        id: m.user.id.toString(),
        username: m.user.username,
        email: m.user.email,
        profile_picture: m.user.profile_picture,
        role: m.role,
        joined_at: m.joined_at,
      })),
      active_invitations: isOwner ? account.invitations : [],
    };
  }

  async updateMemberRole(
    userId: bigint,
    accountId: string,
    targetUserId: bigint,
    dto: UpdateMemberRoleDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.user_id !== userId) {
      throw new ForbiddenException('Only the account owner can modify member roles');
    }

    if (account.user_id === targetUserId) {
      throw new BadRequestException('Cannot change the owner role');
    }

    const membership = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this account');
    }

    const updated = await this.prisma.accountMember.update({
      where: {
        accountId_userId: {
          accountId,
          userId: targetUserId,
        },
      },
      data: {
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile_picture: true,
          },
        },
      },
    });

    return {
      id: updated.user.id.toString(),
      username: updated.user.username,
      email: updated.user.email,
      role: updated.role,
    };
  }

  async removeMember(userId: bigint, accountId: string, targetUserId: bigint) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const isOwner = account.user_id === userId;
    const isSelf = userId === targetUserId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException('You do not have permission to remove this member');
    }

    if (account.user_id === targetUserId) {
      throw new BadRequestException('Cannot remove the account owner');
    }

    await this.prisma.accountMember.deleteMany({
      where: {
        accountId,
        userId: targetUserId,
      },
    });

    return { message: 'Member removed successfully' };
  }

  async joinAccountByCode(userId: bigint, dto: JoinAccountDto) {
    const cleanedCode = dto.invite_code.trim().toUpperCase();

    const invitation = await this.prisma.accountInvitation.findUnique({
      where: { inviteCode: cleanedCode },
      include: { account: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation code');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('This invitation code is no longer active');
    }

    if (new Date() > invitation.expires_at) {
      await this.prisma.accountInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This invitation code has expired');
    }

    // Check if user is already owner
    if (invitation.account.user_id === userId) {
      throw new BadRequestException('You are already the owner of this account');
    }

    // Check if already a member
    const existingMember = await this.prisma.accountMember.findUnique({
      where: {
        accountId_userId: {
          accountId: invitation.accountId,
          userId,
        },
      },
    });

    if (existingMember) {
      return this.findOne(userId, invitation.accountId);
    }

    // Add as member
    await this.prisma.accountMember.create({
      data: {
        accountId: invitation.accountId,
        userId,
        role: invitation.role,
      },
    });

    return this.findOne(userId, invitation.accountId);
  }
}