import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonalWorkspace(userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        financialProfile: { select: { id: true } },
      },
    });
    if (!workspace || !workspace.financialProfile)
      throw new NotFoundException(
        'Workspace not found. Sign in again to initialize your account.',
      );
    return {
      id: workspace.id,
      name: workspace.name,
      financialId: workspace.financialProfile.id,
    };
  }
}
