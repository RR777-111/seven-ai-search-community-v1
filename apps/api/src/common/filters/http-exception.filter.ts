import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  code?: string;
  error: string;
  message: string | string[];
  timestamp: string;
  retryAfterSeconds?: number;
}

interface HttpExceptionWithHeaders extends HttpException {
  getResponseHeaders(): Record<string, string>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly nodeEnv = 'development') {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status = getHttpStatus(exception);
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = this.getMessage(status, exception, exceptionResponse);
    const error = this.getError(status, exceptionResponse);
    const code = this.getCode(exceptionResponse);
    const retryAfterSeconds = this.getRetryAfterSeconds(exceptionResponse);
    response.locals.errorMessage = message;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ method: request.method, url: request.path, status }, 'request failed');
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode: status,
      ...(code ? { code } : {}),
      error,
      message,
      timestamp: new Date().toISOString(),
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    };

    if (isHttpExceptionWithHeaders(exception)) {
      for (const [name, value] of Object.entries(exception.getResponseHeaders())) {
        response.setHeader(name, value);
      }
    }

    response.status(status).json(body);
  }

  private getMessage(
    status: number,
    exception: unknown,
    exceptionResponse: unknown,
  ): string | string[] {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR && this.nodeEnv === 'production') {
      const isSafeGatewayException =
        exception instanceof HttpException &&
        [
          HttpStatus.BAD_GATEWAY,
          HttpStatus.SERVICE_UNAVAILABLE,
          HttpStatus.GATEWAY_TIMEOUT,
        ].includes(status);
      if (!isSafeGatewayException) {
        return 'Internal server error';
      }
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: unknown }).message;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message as string | string[];
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private getError(status: number, exceptionResponse: unknown): string {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'error' in exceptionResponse
    ) {
      const error = (exceptionResponse as { error: unknown }).error;
      if (typeof error === 'string') {
        return error;
      }
    }

    return HttpStatus[status] ?? 'Error';
  }

  private getRetryAfterSeconds(exceptionResponse: unknown): number | undefined {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'retryAfterSeconds' in exceptionResponse
    ) {
      const retryAfterSeconds = (exceptionResponse as { retryAfterSeconds: unknown })
        .retryAfterSeconds;
      if (Number.isInteger(retryAfterSeconds) && Number(retryAfterSeconds) > 0) {
        return Number(retryAfterSeconds);
      }
    }

    return undefined;
  }

  private getCode(exceptionResponse: unknown): string | undefined {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse
    ) {
      const code = (exceptionResponse as { code: unknown }).code;
      return typeof code === 'string' && code.trim().length > 0 ? code : undefined;
    }

    return undefined;
  }
}

function getHttpStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  if (typeof exception !== 'object' || exception === null) {
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  for (const key of ['status', 'statusCode'] as const) {
    const status = (exception as Record<string, unknown>)[key];
    if (Number.isInteger(status) && Number(status) >= 400 && Number(status) < 500) {
      return Number(status);
    }
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function isHttpExceptionWithHeaders(exception: unknown): exception is HttpExceptionWithHeaders {
  return (
    exception instanceof HttpException &&
    typeof (exception as { getResponseHeaders?: unknown }).getResponseHeaders === 'function'
  );
}
