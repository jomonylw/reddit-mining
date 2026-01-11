/**
 * 行业分类 API
 * GET /api/industries - 获取所有行业分类
 */

import { db } from '@/lib/db/client';
import { industries } from '@/lib/db/schema';
import { successResponse, ApiErrors } from '@/lib/api/response';

/**
 * GET /api/industries
 * 获取所有行业分类（中文）
 */
export async function GET() {
  try {
    const result = await db
      .select()
      .from(industries)
      .orderBy(industries.sortOrder);

    const data = result.map(ind => ({
      code: ind.code,
      name: ind.name,
      description: ind.description,
    }));

    return successResponse(data);
  } catch (error) {
    console.error('获取行业列表失败:', error);
    return ApiErrors.databaseError('获取行业列表失败');
  }
}