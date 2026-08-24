import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Verify2faDto, Resend2faDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth-actions.dto';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    if (process.env.MAIL_HOST && process.env.MAIL_USERNAME) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT) || 587,
        secure: process.env.MAIL_ENCRYPTION === 'ssl',
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      });
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter || !to) return;
    try {
      await this.transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'Personal Money Manager'}" <${process.env.MAIL_FROM_ADDRESS || 'noreply@personal-money-manager.com'}>`,
        to,
        subject,
        html,
      });
    } catch (e) {
      console.warn('Mail send failed (non-blocking):', e.message);
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new BadRequestException('Username is already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email || null,
        password: hashedPassword,
        currency: dto.currency || 'UGX',
        currency_symbol: dto.currency_symbol || 'UGX',
        two_factor_enabled: false,
      },
    });

    // Create a default Checking Cash Account
    await this.prisma.account.create({
      data: {
        user_id: user.id,
        name: 'Main Cash Wallet',
        type: 'Cash',
        initial_balance: 0.0,
      },
    });

    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If 2FA is enabled, generate 6-digit OTP and send email
    if (user.two_factor_enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          two_factor_code: otp,
          two_factor_expires_at: expiresAt,
        },
      });

      if (user.email) {
        await this.sendEmail(
          user.email,
          'Your 2FA Security Code - Personal Money Manager',
          `<h2>Security Verification</h2><p>Your 6-digit verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
        );
      }

      const tempToken = this.jwtService.sign(
        { sub: user.id.toString(), username: user.username, is2faTemp: true },
        { expiresIn: '15m' },
      );

      return {
        requires2FA: true,
        tempToken,
        message: 'Two-Factor Authentication code sent to your registered email.',
      };
    }

    return this.generateAuthResponse(user);
  }

  async verify2FA(dto: Verify2faDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });

    if (!user || !user.two_factor_code || user.two_factor_code !== dto.code) {
      throw new BadRequestException('Invalid security code');
    }

    if (user.two_factor_expires_at && new Date() > user.two_factor_expires_at) {
      throw new BadRequestException('Security code has expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        two_factor_code: null,
        two_factor_expires_at: null,
      },
    });

    return this.generateAuthResponse(user);
  }

  async resend2FA(dto: Resend2faDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        two_factor_code: otp,
        two_factor_expires_at: expiresAt,
      },
    });

    if (user.email) {
      await this.sendEmail(
        user.email,
        'Your 2FA Security Code - Personal Money Manager',
        `<h2>Security Verification</h2><p>Your new 6-digit verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      );
    }

    return { message: 'A new security code has been sent.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      // Don't leak username existence
      return { message: 'If the account exists, a reset link/code has been generated.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.upsert({
      where: { username: user.username },
      create: { username: user.username, token },
      update: { token, created_at: new Date() },
    });

    if (user.email) {
      await this.sendEmail(
        user.email,
        'Reset Your Password - Personal Money Manager',
        `<h2>Password Reset Request</h2><p>Use the following token or link to reset your password:</p><p><strong>${token}</strong></p>`,
      );
    }

    return {
      message: 'If the account exists, a reset link/code has been generated.',
      resetToken: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: { token: dto.token },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { username: resetRecord.username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordResetToken.delete({
      where: { username: resetRecord.username },
    });

    return { message: 'Password reset successfully. You may now login.' };
  }

  async getMe(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, two_factor_code, ...result } = user;
    return result;
  }

  private generateAuthResponse(user: any) {
    const payload = { sub: user.id.toString(), username: user.username };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    const { password, two_factor_code, ...safeUser } = user;

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }
}
