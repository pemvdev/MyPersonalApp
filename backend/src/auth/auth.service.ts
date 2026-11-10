import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
}

@Injectable()
export class AuthService {
  private readonly auth: SupabaseClient['auth'];

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.auth = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    ).auth;
  }

  async authenticate(accessToken: string): Promise<User> {
    const { data, error } = await this.auth.getUser(accessToken);
    if (error) {
      if (!error.status || error.status >= 500) {
        throw new ServiceUnavailableException(
          'Sign-in is temporarily unavailable',
        );
      }
      throw new UnauthorizedException(
        'Your session has expired. Sign in again.',
      );
    }
    if (!data.user) {
      throw new UnauthorizedException(
        'Your session has expired. Sign in again.',
      );
    }
    return data.user;
  }

  async syncUserProfile(user: User): Promise<CurrentUser> {
    const fullName: unknown = user.user_metadata.full_name;
    const profile = {
      email: user.email ?? null,
      name: typeof fullName === 'string' ? fullName.slice(0, 200) : null,
    };

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const account = await transaction.user.upsert({
          where: { id: user.id },
          create: { id: user.id, ...profile },
          update: profile,
          select: { id: true, email: true, name: true },
        });
        await transaction.workspace.upsert({
          where: { ownerId: user.id },
          create: {
            ownerId: user.id,
            type: 'FINANCIAL',
            financialProfile: { create: {} },
          },
          update: {},
          select: { id: true },
        });
        return account;
      });
    } catch {
      throw new ServiceUnavailableException(
        'Unable to load your account. Try again.',
      );
    }
  }
}
