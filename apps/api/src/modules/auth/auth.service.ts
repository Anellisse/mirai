import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { Role, UserPayload } from '@mirai/shared-types';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { RegisterDto } from './dto/register.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Cuenta bloqueada temporalmente');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    void passwordHash;
    void twoFactorSecret;
    return safeUser;
  }

  async login(user: Record<string, unknown>) {
    if (user['twoFactorEnabled']) {
      const tempPayload = { sub: user['id'], twoFactorPending: true };
      return {
        requiresTwoFactor: true,
        tempToken: this.jwtService.sign(tempPayload, { expiresIn: '5m' }),
      };
    }

    return {
      requiresTwoFactor: false,
      accessToken: this.signAccessToken(user as any),
    };
  }

  async verifyTwoFactor(tempToken: string, totpToken: string) {
    let payload: { sub: string; twoFactorPending: boolean };
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Token temporal inválido');
    }

    if (!payload.twoFactorPending) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.twoFactorSecret) throw new UnauthorizedException();

    // @ts-ignore
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Código 2FA inválido');

    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    void passwordHash;
    void twoFactorSecret;
    return { accessToken: this.signAccessToken(safeUser) };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role as Role,
        organizationId: dto.organizationId,
      },
      select: { id: true, email: true, name: true, role: true, organizationId: true },
    });
    return user;
  }

  async setup2fa(userId: string) {
    // @ts-ignore
    const secret = speakeasy.generateSecret({ name: 'Mirai Neuropsia' });
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });
    return { otpauthUrl: secret.otpauth_url, secret: secret.base32 };
  }

  async confirm2fa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new UnauthorizedException();

    // @ts-ignore
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Código 2FA inválido');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    return { enabled: true };
  }

  private signAccessToken(user: { id: string; email: string; role: string; organizationId: string }): string {
    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
      organizationId: user.organizationId,
      twoFactorVerified: true,
    };
    return this.jwtService.sign(payload);
  }
}
