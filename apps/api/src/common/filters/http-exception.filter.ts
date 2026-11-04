import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An unexpected error occurred. Please try again later.';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || res;
        errorName = (res as any).error || exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      // Clean MongoDB duplicate key error friendly message
      if ((exception as any).code === 11000) {
        status = HttpStatus.CONFLICT;
        const key = Object.keys((exception as any).keyPattern || {})[0] || 'Field';
        message = `An account or record with this ${key} already exists.`;
        errorName = 'DuplicateKeyConflict';
      } else if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
        errorName = 'ValidationError';
      }
    }

    // Always normalize messages if it's an array from class-validator
    const formattedMessage = Array.isArray(message) ? message.join(', ') : message;

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorName,
      message: formattedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
