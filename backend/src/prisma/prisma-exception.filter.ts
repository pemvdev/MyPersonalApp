import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost) {
    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2034'].includes(exception.code)
    ) {
      new BaseExceptionFilter(this.adapterHost.httpAdapter).catch(
        new ConflictException(
          'This record already exists or changed. Refresh and try again.',
        ),
        host,
      );
      return;
    }
    new BaseExceptionFilter(this.adapterHost.httpAdapter).catch(
      new ServiceUnavailableException(
        'Unable to save or load your workspace. Please try again.',
      ),
      host,
    );
  }
}
