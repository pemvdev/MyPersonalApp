import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { occurrenceDates, recurrenceClientId } from './recurrence';
import {
  CreateFocusSessionDto,
  CreateTaskDto,
  UpdateTaskDto,
} from '../workspaces/dto/workspace.dto';

const taskSelection = {
  id: true,
  title: true,
  scheduledTime: true,
  durationMinutes: true,
  category: true,
  isComplete: true,
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async getDay(workspaceId: string, date: Date, page: number) {
    await this.materializeRecurring(workspaceId, date);
    const where = { workspaceId, dueDate: date };
    const [tasks, total, completed, focus] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select: taskSelection,
        orderBy: [{ scheduledTime: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.task.count({ where }),
      this.prisma.task.count({ where: { ...where, isComplete: true } }),
      this.prisma.focusSession.aggregate({
        where: { workspaceId, completedOn: date },
        _sum: { durationSeconds: true },
      }),
    ]);
    return {
      tasks: tasks.map(({ scheduledTime, durationMinutes, ...task }) => ({
        ...task,
        time: scheduledTime,
        duration: `${durationMinutes} min`,
      })),
      total,
      completed,
      focusSeconds: focus._sum.durationSeconds ?? 0,
      hasMore: page * 50 < total,
    };
  }

  async create(userId: string, dto: CreateTaskDto) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    return this.prisma.task.upsert({
      where: {
        workspaceId_clientId: {
          workspaceId: workspace.id,
          clientId: dto.clientId,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        clientId: dto.clientId,
        title: dto.title,
        dueDate: new Date(dto.date),
        scheduledTime: dto.time,
        durationMinutes: dto.durationMinutes,
        category: dto.category,
        isFrequent: Boolean(dto.repeatFrequency),
        repeatFrequency: dto.repeatFrequency,
        repeatInterval: dto.repeatFrequency ? (dto.repeatInterval ?? 1) : 1,
        repeatUntil: dto.repeatUntil ? new Date(dto.repeatUntil) : null,
      },
      select: { id: true },
    });
  }

  private async materializeRecurring(workspaceId: string, through: Date) {
    const rules = await this.prisma.task.findMany({
      where: {
        workspaceId,
        repeatFrequency: { not: null },
        dueDate: { lt: through },
      },
    });
    for (const rule of rules) {
      for (const dueDate of occurrenceDates(
        rule.dueDate,
        rule.repeatFrequency!,
        rule.repeatInterval,
        rule.repeatUntil,
        through,
      )) {
        await this.prisma.task.upsert({
          where: {
            recurrenceSourceId_recurrenceDate: {
              recurrenceSourceId: rule.id,
              recurrenceDate: dueDate,
            },
          },
          update: {},
          create: {
            workspaceId,
            clientId: recurrenceClientId(),
            title: rule.title,
            dueDate,
            scheduledTime: rule.scheduledTime,
            durationMinutes: rule.durationMinutes,
            category: rule.category,
            recurrenceSourceId: rule.id,
            recurrenceDate: dueDate,
          },
        });
      }
    }
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    const result = await this.prisma.task.updateMany({
      where: { id: taskId, workspaceId: workspace.id },
      data: { isComplete: dto.isComplete },
    });
    if (result.count === 0) throw new NotFoundException('Task not found');
    return { success: true };
  }

  async remove(userId: string, taskId: string) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    const result = await this.prisma.task.deleteMany({
      where: { id: taskId, workspaceId: workspace.id },
    });
    if (result.count === 0) throw new NotFoundException('Task not found');
    return { success: true };
  }

  async saveFocus(userId: string, dto: CreateFocusSessionDto) {
    const workspace = await this.access.getPersonalWorkspace(userId);
    return this.prisma.focusSession.upsert({
      where: {
        workspaceId_clientId: {
          workspaceId: workspace.id,
          clientId: dto.clientId,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        clientId: dto.clientId,
        completedOn: new Date(dto.date),
        durationSeconds: dto.durationSeconds,
      },
      select: { id: true },
    });
  }
}
