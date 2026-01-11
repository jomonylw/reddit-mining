/**
 * 痛点类型 API
 * GET /api/pain-point-types - 获取所有痛点类型
 */

import { db } from '@/lib/db/client';
import { painPointTypes } from '@/lib/db/schema';
import { successResponse, ApiErrors } from '@/lib/api/response';

/**
 * GET /api/pain-point-types
 * 获取所有痛点类型（中文）
 */
export async function GET() {
  try {
    const result = await db
      .select()
      .from(painPointTypes)
      .orderBy(painPointTypes.sortOrder);

    const data = result.map(type => ({
      code: type.code,
      name: type.name,
      description: type.description,
    }));

    return successResponse(data);
  } catch (error) {
    console.error('获取痛点类型列表失败:', error);
    return ApiErrors.databaseError('获取痛点类型列表失败');
  }
}