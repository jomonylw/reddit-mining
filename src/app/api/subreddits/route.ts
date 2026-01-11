/**
 * Subreddit 管理 API
 * GET /api/subreddits - 获取列表
 * POST /api/subreddits - 创建新配置
 */

import { NextRequest } from 'next/server';
import { eq, sql, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/client';
import { subreddits, posts, painPoints } from '@/lib/db/schema';
import { successResponse, ApiErrors } from '@/lib/api/response';

/**
 * GET /api/subreddits
 * 获取 Subreddit 列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActiveParam = searchParams.get('is_active');

    // 构建查询
    let query = db.select().from(subreddits);

    // 筛选活跃状态
    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      query = query.where(eq(subreddits.isActive, isActive)) as typeof query;
    }

    const result = await query.orderBy(subreddits.name);

    // 获取每个 Subreddit 的统计数据
    const dataWithStats = await Promise.all(
      result.map(async (sub) => {
        // 统计帖子数量
        const postsCount = await db
          .select({ count: count() })
          .from(posts)
          .where(eq(posts.subredditId, sub.id));

        // 统计痛点数量（通过关联帖子）
        const painPointsCount = await db
          .select({ count: count() })
          .from(painPoints)
          .innerJoin(posts, eq(painPoints.postId, posts.id))
          .where(eq(posts.subredditId, sub.id));

        return {
          id: sub.id,
          name: sub.name,
          display_name: sub.displayName,
          description: sub.description,
          is_active: sub.isActive,
          fetch_frequency: sub.fetchFrequency,
          posts_limit: sub.postsLimit,
          last_fetched_at: sub.lastFetchedAt,
          created_at: sub.createdAt,
          updated_at: sub.updatedAt,
          stats: {
            total_posts: postsCount[0]?.count ?? 0,
            total_pain_points: painPointsCount[0]?.count ?? 0,
          },
        };
      })
    );

    return successResponse(dataWithStats);
  } catch (error) {
    console.error('获取 Subreddit 列表失败:', error);
    return ApiErrors.databaseError('获取 Subreddit 列表失败');
  }
}

/**
 * POST /api/subreddits
 * 创建新的 Subreddit 配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.name) {
      return ApiErrors.validationError('缺少必填字段', [
        { field: 'name', message: 'Subreddit 名称是必填的' },
      ]);
    }

    // 验证名称格式（只允许字母、数字、下划线）
    const nameRegex = /^[a-zA-Z0-9_]+$/;
    if (!nameRegex.test(body.name)) {
      return ApiErrors.invalidSubredditName();
    }

    // 检查是否已存在
    const existing = await db
      .select()
      .from(subreddits)
      .where(eq(subreddits.name, body.name.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return ApiErrors.subredditExists();
    }

    // 创建新记录
    const now = new Date().toISOString();
    const newSubreddit = {
      id: uuidv4(),
      name: body.name.toLowerCase(),
      displayName: body.display_name || body.name,
      description: body.description || null,
      isActive: body.is_active !== false,
      fetchFrequency: body.fetch_frequency || 'daily',
      postsLimit: body.posts_limit || 100,
      lastFetchedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(subreddits).values(newSubreddit);

    return successResponse(
      {
        id: newSubreddit.id,
        name: newSubreddit.name,
        display_name: newSubreddit.displayName,
        description: newSubreddit.description,
        is_active: newSubreddit.isActive,
        fetch_frequency: newSubreddit.fetchFrequency,
        posts_limit: newSubreddit.postsLimit,
        last_fetched_at: newSubreddit.lastFetchedAt,
        created_at: newSubreddit.createdAt,
        updated_at: newSubreddit.updatedAt,
      },
      undefined
    );
  } catch (error) {
    console.error('创建 Subreddit 失败:', error);
    return ApiErrors.databaseError('创建 Subreddit 失败');
  }
}