import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AuthGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return this.auth.syncUserProfile(request.user);
  }
}
