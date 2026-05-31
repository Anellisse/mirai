import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  passwordHash: '',
  name: 'Test',
  role: 'CLINICO' as const,
  organizationId: 'org-1',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  title: null,
  registrationNumber: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 12);

    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns user without hash on valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, failedLoginAttempts: 0 });

      const result = await authService.validateUser('test@test.com', 'password123');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@test.com');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, failedLoginAttempts: 1 });

      await expect(
        authService.validateUser('test@test.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.validateUser('noone@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is locked', async () => {
      const lockedUser = { ...mockUser, lockedUntil: new Date(Date.now() + 60000) };
      prismaService.user.findUnique.mockResolvedValue(lockedUser);

      await expect(
        authService.validateUser('test@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('returns access token for user without 2FA', async () => {
      const result = await authService.login(mockUser as any);

      expect(result).toHaveProperty('accessToken');
      expect(result.requiresTwoFactor).toBe(false);
    });

    it('returns requiresTwoFactor=true for 2FA-enabled user', async () => {
      const user2FA = { ...mockUser, twoFactorEnabled: true, twoFactorSecret: 'secret' };
      const result = await authService.login(user2FA as any);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.accessToken).toBeUndefined();
    });
  });
});
