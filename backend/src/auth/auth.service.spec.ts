import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const getUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser } }),
}));

describe('AuthService', () => {
  let service: AuthService;
  const upsert = jest.fn();
  const workspaceUpsert = jest.fn();
  const transaction = jest.fn();

  beforeEach(async () => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      (
        callback: (database: {
          user: { upsert: typeof upsert };
          workspace: { upsert: typeof workspaceUpsert };
        }) => Promise<unknown>,
      ) =>
        callback({ user: { upsert }, workspace: { upsert: workspaceUpsert } }),
    );
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: { getOrThrow: () => 'test' } },
        { provide: PrismaService, useValue: { $transaction: transaction } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects invalid or expired tokens', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    await expect(service.authenticate('expired')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('reports authentication outages as service errors', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
    await expect(service.authenticate('token')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('persists only the verified identity and public profile fields', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'verified-id',
          email: 'user@example.com',
          user_metadata: { full_name: 'Alex', role: 'ADMIN' },
        },
      },
      error: null,
    });
    const user = await service.authenticate('valid-token');
    await service.syncUserProfile(user);
    expect(getUser).toHaveBeenCalledWith('valid-token');
    expect(workspaceUpsert).toHaveBeenCalledWith({
      where: { ownerId: 'verified-id' },
      create: {
        ownerId: 'verified-id',
        type: 'FINANCIAL',
        financialProfile: { create: {} },
      },
      update: {},
      select: { id: true },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'verified-id' },
      create: { id: 'verified-id', email: 'user@example.com', name: 'Alex' },
      update: { email: 'user@example.com', name: 'Alex' },
      select: { id: true, email: true, name: true },
    });
  });

  it('does not expose database error details', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'verified-id', user_metadata: { full_name: 42 } } },
      error: null,
    });
    upsert.mockRejectedValue(new Error('database password: secret'));
    const user = await service.authenticate('valid-token');
    await expect(service.syncUserProfile(user)).rejects.toThrow(
      'Unable to load your account. Try again.',
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { id: 'verified-id', email: null, name: null },
      }),
    );
  });
  it('returns the existing account on repeat login and initializes one workspace by owner', async () => {
    const identity = { id: 'verified-id', user_metadata: {} };
    getUser.mockResolvedValue({ data: { user: identity }, error: null });
    upsert.mockResolvedValue({ id: 'verified-id', email: null, name: null });
    const user = await service.authenticate('valid');
    await expect(service.syncUserProfile(user)).resolves.toEqual({
      id: 'verified-id',
      email: null,
      name: null,
    });
    await service.syncUserProfile(user);
    expect(workspaceUpsert).toHaveBeenCalledTimes(2);
    expect(workspaceUpsert.mock.calls).toMatchObject([
      [{ where: { ownerId: 'verified-id' } }],
      [{ where: { ownerId: 'verified-id' } }],
    ]);
  });

  it('does not report account creation success when workspace provisioning fails', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'verified-id', user_metadata: {} } },
      error: null,
    });
    workspaceUpsert.mockRejectedValue(new Error('Workspace creation failed'));
    const user = await service.authenticate('valid');
    await expect(service.syncUserProfile(user)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
