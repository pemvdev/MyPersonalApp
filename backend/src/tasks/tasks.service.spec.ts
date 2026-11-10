import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

describe('Task ownership and persistence', () => {
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const deleteMany = jest.fn();
  const upsert = jest.fn();
  let service: TasksService;
  beforeEach(async () => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      id: 'my-workspace',
      name: 'Personal workspace',
      financialProfile: { id: 'my-finance' },
    });
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        WorkspaceAccessService,
        {
          provide: PrismaService,
          useValue: {
            workspace: { findUnique },
            task: { updateMany, deleteMany, upsert },
          },
        },
      ],
    }).compile();
    service = module.get(TasksService);
  });
  it('scopes completion to the verified owner and refuses another workspace’s task', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update('my-user', 'other-task', { isComplete: true }),
    ).rejects.toThrow(NotFoundException);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'my-user' } }),
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'other-task', workspaceId: 'my-workspace' },
      data: { isComplete: true },
    });
  });
  it('scopes deletion to the same workspace', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('my-user', 'other-task')).rejects.toThrow(
      NotFoundException,
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'other-task', workspaceId: 'my-workspace' },
    });
  });
  it('derives ownership on creation and deduplicates retries', async () => {
    await service.create('my-user', {
      clientId: 'request-id',
      title: 'Task',
      date: '2026-11-07',
      time: '09:00',
      category: 'Work',
      durationMinutes: 30,
    });
    expect(upsert.mock.calls[0]).toMatchObject([
      {
        where: {
          workspaceId_clientId: {
            workspaceId: 'my-workspace',
            clientId: 'request-id',
          },
        },
        create: {
          workspaceId: 'my-workspace',
          title: 'Task',
          dueDate: new Date('2026-11-07'),
        },
      },
    ]);
  });
  it('refuses operations when the caller has no workspace', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.update('unknown-user', 'task', { isComplete: true }),
    ).rejects.toThrow(NotFoundException);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
