import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { type ApiResponseData, isApiResponsePayload } from './response-payload';
import { ApiResponse } from './response.interface';

@Injectable()
export class ResponseInterceptor<TData> implements NestInterceptor<
  TData,
  ApiResponse<ApiResponseData<TData>>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<TData>,
  ): Observable<ApiResponse<ApiResponseData<TData>>> {
    return next.handle().pipe(
      map((data) => {
        if (isHealthRequest(_context)) {
          return data as ApiResponse<ApiResponseData<TData>>;
        }

        if (isApiResponsePayload(data)) {
          return {
            success: true,
            data: data.data as ApiResponseData<TData>,
            message: data.message,
            timestamp: new Date().toISOString(),
            ...(data.total !== undefined ? { total: data.total } : {}),
            ...(data.page !== undefined ? { page: data.page } : {}),
            ...(data.pageSize !== undefined ? { pageSize: data.pageSize } : {}),
            ...(data.maxResults !== undefined ? { maxResults: data.maxResults } : {}),
            ...(data.exhausted !== undefined ? { exhausted: data.exhausted } : {}),
            ...(data.truncated !== undefined ? { truncated: data.truncated } : {}),
            ...(data.sourceCounts !== undefined ? { sourceCounts: data.sourceCounts } : {}),
            ...(data.cacheHit !== undefined ? { cacheHit: data.cacheHit } : {}),
            ...(data.cacheStatus !== undefined ? { cacheStatus: data.cacheStatus } : {}),
            ...(data.staleFallback !== undefined ? { staleFallback: data.staleFallback } : {}),
            ...(data.searchNotice !== undefined ? { searchNotice: data.searchNotice } : {}),
            ...(data.timing !== undefined ? { timing: data.timing } : {}),
          };
        }

        return {
          success: true,
          data: data as ApiResponseData<TData>,
          message: '',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

function isHealthRequest(context: ExecutionContext): boolean {
  let request: { path?: string; url?: string } | undefined;

  try {
    request = context.switchToHttp().getRequest<{
      path?: string;
      url?: string;
    }>();
  } catch {
    return false;
  }

  const path = request?.path ?? request?.url;

  return path === '/health';
}
