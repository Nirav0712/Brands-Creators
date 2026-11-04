import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@brands-creators/types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already an enveloped response with meta/data
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            message: data.message || 'Operation successful',
            ...(data.status !== undefined ? { status: data.status } : {}),
            data: data.data,
            meta: data.meta,
          };
        }
        return {
          success: true,
          message: data?.message || 'Operation successful',
          ...(data && typeof data === 'object' && data.status !== undefined ? { status: data.status } : {}),
          data: data?.data !== undefined ? data.data : data,
        };
      }),
    );
  }
}
