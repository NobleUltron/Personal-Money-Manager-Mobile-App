import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-money-manager-jwt-key-2026',
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    const { password, two_factor_code, ...result } = user;
    return result;
  }
}
