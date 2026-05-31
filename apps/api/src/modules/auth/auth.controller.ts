import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role, UserPayload } from '@mirai/shared-types';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Request() req: { user: any }) {
    return this.authService.login(req.user);
  }

  @Post('2fa/verify')
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verifyTwoFactor(dto.tempToken, dto.token);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2fa(@CurrentUser() user: UserPayload) {
    return this.authService.setup2fa(user.sub);
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  confirm2fa(@CurrentUser() user: UserPayload, @Body() dto: { token: string }) {
    return this.authService.confirm2fa(user.sub, dto.token);
  }
}
