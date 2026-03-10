import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.logger.log(
          `← ${method} ${url} ${response.statusCode} [${Date.now() - now}ms]`,
        );
      }),
      catchError((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`← ${method} ${url} [${Date.now() - now}ms] ${message}`);
        return throwError(() => err);
      }),
    );
  }
}