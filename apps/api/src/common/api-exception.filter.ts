import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@frameforge/db';

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  501: 'PROVIDER_NOT_CONFIGURED',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = request.id;

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      code = STATUS_CODES[status] ?? 'HTTP_ERROR';
      if (typeof response === 'string') {
        message = response;
      } else if (response && typeof response === 'object') {
        const body = response as Record<string, unknown>;
        if (typeof body.code === 'string') code = body.code;
        if (typeof body.message === 'string') message = body.message;
        else if (Array.isArray(body.message)) message = body.message.join(', ');
        details = body.details ?? body.issues;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.CONFLICT;
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Resource not found';
      } else if (exception.code === 'P2002') {
        code = 'CONFLICT';
        message = 'A resource with those values already exists';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        code = 'VALIDATION_ERROR';
        message = 'Related resource constraint failed';
      } else {
        code = 'DATABASE_ERROR';
        message = 'The database rejected the request';
      }
      this.logger.warn(`Prisma ${exception.code} on ${request.method} ${request.url}`);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Invalid database query';
      this.logger.warn(`Prisma validation error on ${request.method} ${request.url}`);
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    if (status >= 500 && status !== HttpStatus.NOT_IMPLEMENTED) {
      this.logger.error(
        `Request ${requestId} failed with ${status} ${code}: ${message}`,
      );
    }

    if (!reply.sent) {
      reply.status(status).send({
        error: {
          code,
          message,
          ...(details ? { details } : {}),
          requestId,
        },
      });
    }
  }
}
