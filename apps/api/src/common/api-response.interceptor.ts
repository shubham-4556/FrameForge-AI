import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (
          value &&
          typeof value === 'object' &&
          'items' in value &&
          'meta' in value &&
          Array.isArray((value as { items: unknown }).items)
        ) {
          const paginated = value as { items: unknown; meta: unknown };
          return { data: paginated.items, meta: paginated.meta };
        }
        return { data: value ?? null };
      }),
    );
  }
}
