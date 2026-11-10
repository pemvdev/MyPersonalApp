import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest extends Request {
  user: User;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(
      request.headers.authorization ?? '',
    );
    if (!match) {
      throw new UnauthorizedException('Sign in to continue');
    }
    request.user = await this.auth.authenticate(match[1]);
    return true;
  }
}
