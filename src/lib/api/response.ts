/**
 * API 响应工具函数
 * 提供统一的响应格式
 */

import { NextResponse } from 'next/server';

/**
 * 成功响应
 */
export function successResponse<T>(
  data: T,
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  }
) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

/**
 * 错误响应
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Array<{ field: string; message: string }>
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * 常见错误响应
 */
export const ApiErrors = {
  notFound: (resource: string) =>
    errorResponse('NOT_FOUND', `${resource} 不存在`, 404),

  validationError: (message: string, details?: Array<{ field: string; message: string }>) =>
    errorResponse('VALIDATION_ERROR', message, 400, details),

  internalError: (message: string = '服务器内部错误') =>
    errorResponse('INTERNAL_ERROR', message, 500),

  databaseError: (message: string = '数据库操作失败') =>
    errorResponse('DATABASE_ERROR', message, 500),

  subredditExists: () =>
    errorResponse('SUBREDDIT_EXISTS', 'Subreddit 已存在', 400),

  invalidSubredditName: () =>
    errorResponse('INVALID_SUBREDDIT_NAME', 'Subreddit 名称格式无效', 400),
};