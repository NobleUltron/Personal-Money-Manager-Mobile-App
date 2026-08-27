import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import {
  Toggle2faDto,
  Enable2faDto,
  Disable2faDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  ConvertCurrencyDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, two_factor_code, two_factor_secret, two_factor_backup_codes, ...result } = user;
    return {
      ...result,
      has_2fa_secret: !!two_factor_secret,
    };
  }

  async updateProfile(userId: bigint, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        username: dto.username,
        NOT: { id: userId },
      },
    });

    if (existing) {
      throw new BadRequestException('Username is already taken');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: dto.username,
        email: dto.email || null,
        currency: dto.currency || 'UGX',
        currency_symbol: dto.currency_symbol || 'UGX',
        profile_picture: dto.profile_picture !== undefined ? dto.profile_picture : undefined,
      },
    });

    const { password, two_factor_code, two_factor_secret, two_factor_backup_codes, ...result } = updated;
    return result;
  }

  async updatePassword(userId: bigint, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  // --- 2FA Management (TOTP & Backup Codes) ---

  async generate2FASetup(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Personal Money Manager',
      label: user.username,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 260,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Generate 8 random one-time backup recovery codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      backupCodes.push(`${part1}-${part2}`);
    }

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  async enable2FA(userId: bigint, dto: Enable2faDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const cleanCode = dto.code.replace(/\s+/g, '');
    const verification = verifySync({ token: cleanCode, secret: dto.secret });
    const isValid = !!verification?.valid;

    if (!isValid) {
      throw new BadRequestException(
        'Invalid 6-digit code. Please ensure the code in your Authenticator App is current and your device clock is accurate.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: true,
        two_factor_secret: dto.secret,
        two_factor_backup_codes: JSON.stringify(dto.backupCodes),
        two_factor_code: null,
        two_factor_expires_at: null,
      },
    });

    return {
      two_factor_enabled: true,
      message: 'Two-Factor Authentication is successfully activated!',
    };
  }

  async disable2FA(userId: bigint, dto: Disable2faDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password. Please verify your password to disable 2FA.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        two_factor_code: null,
        two_factor_expires_at: null,
      },
    });

    return {
      two_factor_enabled: false,
      message: 'Two-Factor Authentication has been disabled.',
    };
  }

  async toggle2FA(userId: bigint, dto: Toggle2faDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: dto.enable,
        two_factor_code: null,
        two_factor_expires_at: null,
      },
    });

    return {
      two_factor_enabled: updated.two_factor_enabled,
      message: dto.enable ? 'Two-Factor Authentication enabled' : 'Two-Factor Authentication disabled',
    };
  }

  async convertCurrency(userId: bigint, dto: ConvertCurrencyDto) {
    if (dto.convert_balances && dto.rate && dto.rate > 0) {
      await this.prisma.$transaction(async (tx) => {
        const accounts = await tx.account.findMany({ where: { user_id: userId } });
        for (const acc of accounts) {
          const newInitial = Number(acc.initial_balance) * dto.rate;
          await tx.account.update({
            where: { id: acc.id },
            data: { initial_balance: Math.round(newInitial * 100) / 100 },
          });

          const transactions = await tx.transaction.findMany({ where: { accountId: acc.id } });
          for (const t of transactions) {
            const newAmount = Number(t.amount) * dto.rate;
            await tx.transaction.update({
              where: { id: t.id },
              data: { amount: Math.round(newAmount * 100) / 100 },
            });
          }
        }

        const budgets = await tx.budget.findMany({ where: { user_id: userId } });
        for (const b of budgets) {
          const newAmount = Number(b.amount) * dto.rate;
          await tx.budget.update({
            where: { id: b.id },
            data: { amount: Math.round(newAmount * 100) / 100 },
          });
        }

        const subscriptions = await tx.subscription.findMany({ where: { user_id: userId } });
        for (const s of subscriptions) {
          const newAmount = Number(s.amount) * dto.rate;
          await tx.subscription.update({
            where: { id: s.id },
            data: { amount: Math.round(newAmount * 100) / 100 },
          });
        }

        const loans = await tx.loan.findMany({ where: { user_id: userId } });
        for (const l of loans) {
          const newAmount = Number(l.amount) * dto.rate;
          const newPaid = Number(l.amount_paid) * dto.rate;
          await tx.loan.update({
            where: { id: l.id },
            data: {
              amount: Math.round(newAmount * 100) / 100,
              amount_paid: Math.round(newPaid * 100) / 100,
            },
          });
        }

        const goals = await tx.goal.findMany({ where: { user_id: userId } });
        for (const g of goals) {
          const newTarget = Number(g.target_amount) * dto.rate;
          const newCurrent = Number(g.current_amount) * dto.rate;
          await tx.goal.update({
            where: { id: g.id },
            data: {
              target_amount: Math.round(newTarget * 100) / 100,
              current_amount: Math.round(newCurrent * 100) / 100,
            },
          });
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            currency: dto.to_currency,
            currency_symbol: dto.to_symbol,
          },
        });
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          currency: dto.to_currency,
          currency_symbol: dto.to_symbol,
        },
      });
    }

    return this.getProfile(userId);
  }
}