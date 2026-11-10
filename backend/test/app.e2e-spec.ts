import { Test } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { TasksService } from '../src/tasks/tasks.service';
import { FinanceService } from '../src/finance/finance.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  const authenticate = jest.fn();
  const getCurrent = jest.fn();
  const createTask = jest.fn();
  const createTransaction = jest.fn();
  const syncUserProfile = jest.fn();
  const profile = {
    id: 'verified-user',
    email: 'user@example.com',
    name: 'Alex',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AuthService)
      .useValue({ authenticate, syncUserProfile })
      .overrideProvider(WorkspacesService)
      .useValue({ getCurrent })
      .overrideProvider(TasksService)
      .useValue({ create: createTask })
      .overrideProvider(FinanceService)
      .useValue({ create: createTransaction })
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('keeps the root endpoint available', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it.each([undefined, 'Basic abc', 'Bearer', 'Bearer abc extra'])(
    'rejects missing or malformed authorization: %s',
    async (header) => {
      const call = request(app.getHttpServer()).get('/auth/me');
      if (header) call.set('Authorization', header);
      await call.expect(401);
      expect(authenticate).not.toHaveBeenCalled();
      expect(syncUserProfile).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid token before accessing account data', async () => {
    authenticate.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    expect(syncUserProfile).not.toHaveBeenCalled();
  });

  it('uses the validated identity and ignores a caller-supplied user ID', async () => {
    const identity = { id: 'verified-user' };
    authenticate.mockResolvedValue(identity);
    syncUserProfile.mockResolvedValue(profile);
    const response = await request(app.getHttpServer())
      .get('/auth/me?userId=another-user')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(authenticate).toHaveBeenCalledWith('valid-token');
    expect(syncUserProfile).toHaveBeenCalledWith(identity);
    expect(response.body).toEqual(profile);
  });
  it.each([
    '/workspaces/current?date=2026-11-07',
    '/workspaces/current/tasks',
    '/workspaces/current/transactions',
  ])('requires authentication for workspace routes: %s', async (path) => {
    const server = request(app.getHttpServer());
    const call = path.includes('?') ? server.get(path) : server.post(path);
    await call.expect(401);
    expect(getCurrent).not.toHaveBeenCalled();
  });

  it('rejects invalid calendar dates before loading workspace data', async () => {
    authenticate.mockResolvedValue({ id: 'verified-user' });
    await request(app.getHttpServer())
      .get('/workspaces/current?date=2026-02-30')
      .set('Authorization', 'Bearer valid')
      .expect(400);
    expect(getCurrent).not.toHaveBeenCalled();
  });

  it('takes the workspace owner from the token, validates pagination, and blocks query ownership overrides', async () => {
    authenticate.mockResolvedValue({ id: 'verified-user' });
    getCurrent.mockResolvedValue({ id: 'my-workspace' });
    await request(app.getHttpServer())
      .get('/workspaces/current?date=2026-11-07&taskPage=2')
      .set('Authorization', 'Bearer valid')
      .expect(200);
    expect(getCurrent).toHaveBeenCalledWith(
      'verified-user',
      expect.objectContaining({
        date: '2026-11-07',
        taskPage: 2,
        transactionPage: 1,
      }),
    );
    await request(app.getHttpServer())
      .get('/workspaces/current?date=2026-11-07&ownerId=another-user')
      .set('Authorization', 'Bearer valid')
      .expect(400);
  });

  it('validates task input and rejects caller-supplied ownership', async () => {
    authenticate.mockResolvedValue({ id: 'verified-user' });
    const task = {
      clientId: 'd4e783a7-3443-4bda-9136-b814cb257cc1',
      title: 'My task',
      date: '2026-11-07',
      time: '09:00',
      durationMinutes: 30,
      category: 'Work',
    };
    await request(app.getHttpServer())
      .post('/workspaces/current/tasks')
      .set('Authorization', 'Bearer valid')
      .send({ ...task, ownerId: 'another-user' })
      .expect(400);
    expect(createTask).not.toHaveBeenCalled();
    createTask.mockResolvedValue({ id: 'saved-task' });
    await request(app.getHttpServer())
      .post('/workspaces/current/tasks')
      .set('Authorization', 'Bearer valid')
      .send(task)
      .expect(201);
    expect(createTask).toHaveBeenCalledWith(
      'verified-user',
      expect.objectContaining(task),
    );
  });

  it('rejects fractional cents and zero transactions at the HTTP boundary', async () => {
    authenticate.mockResolvedValue({ id: 'verified-user' });
    for (const amountInCents of [0, 0.1])
      await request(app.getHttpServer())
        .post('/workspaces/current/transactions')
        .set('Authorization', 'Bearer valid')
        .send({
          clientId: 'd4e783a7-3443-4bda-9136-b814cb257cc1',
          title: 'Invalid',
          date: '2026-11-07',
          kind: 'food',
          amountInCents,
        })
        .expect(400);
    expect(createTransaction).not.toHaveBeenCalled();
  });
});
