/**
 * 单个 Subreddit 管理 API
 * GET /api/subreddits/[id] - 获取详情
 * PATCH /api/subreddits/[id] - 更新配置
 * DELETE /api/subreddits/[id] - 删除配置（级联删除相关数据）
 */

import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subreddits, posts, painPoints, painPointTags } from "@/lib/db/schema";
import { successResponse, ApiErrors } from "@/lib/api/response";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/subreddits/[id]
 * 获取单个 Subreddit 详情
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const result = await db.select().from(subreddits).where(eq(subreddits.id, id)).limit(1);

    if (result.length === 0) {
      return ApiErrors.notFound("Subreddit");
    }

    const sub = result[0];

    return successResponse({
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
    });
  } catch (error) {
    console.error("获取 Subreddit 详情失败:", error);
    return ApiErrors.databaseError("获取 Subreddit 详情失败");
  }
}

/**
 * PATCH /api/subreddits/[id]
 * 更新 Subreddit 配置
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 检查是否存在
    const existing = await db.select().from(subreddits).where(eq(subreddits.id, id)).limit(1);

    if (existing.length === 0) {
      return ApiErrors.notFound("Subreddit");
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.display_name !== undefined) {
      updateData.displayName = body.display_name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.is_active !== undefined) {
      updateData.isActive = body.is_active;
    }
    if (body.fetch_frequency !== undefined) {
      // 验证频率值
      const validFrequencies = ["hourly", "daily", "weekly"];
      if (!validFrequencies.includes(body.fetch_frequency)) {
        return ApiErrors.validationError("无效的抓取频率", [
          { field: "fetch_frequency", message: "必须是 hourly, daily 或 weekly" },
        ]);
      }
      updateData.fetchFrequency = body.fetch_frequency;
    }
    if (body.posts_limit !== undefined) {
      const limit = parseInt(body.posts_limit, 10);
      if (isNaN(limit) || limit < 1 || limit > 500) {
        return ApiErrors.validationError("无效的帖子数量限制", [
          { field: "posts_limit", message: "必须是 1-500 之间的数字" },
        ]);
      }
      updateData.postsLimit = limit;
    }

    // 执行更新
    await db.update(subreddits).set(updateData).where(eq(subreddits.id, id));

    // 获取更新后的数据
    const updated = await db.select().from(subreddits).where(eq(subreddits.id, id)).limit(1);

    const sub = updated[0];

    return successResponse({
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
    });
  } catch (error) {
    console.error("更新 Subreddit 失败:", error);
    return ApiErrors.databaseError("更新 Subreddit 失败");
  }
}

/**
 * DELETE /api/subreddits/[id]
 * 删除 Subreddit 配置（级联删除相关数据）
 * 删除顺序：painPointTags -> painPoints -> posts -> subreddit
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 检查是否存在
    const existing = await db.select().from(subreddits).where(eq(subreddits.id, id)).limit(1);

    if (existing.length === 0) {
      return ApiErrors.notFound("Subreddit");
    }

    // 获取该 subreddit 下的所有 posts
    const relatedPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.subredditId, id));

    if (relatedPosts.length > 0) {
      const postIds = relatedPosts.map((p) => p.id);

      // 获取这些 posts 关联的所有 painPoints
      const relatedPainPoints = await db
        .select({ id: painPoints.id })
        .from(painPoints)
        .where(inArray(painPoints.postId, postIds));

      if (relatedPainPoints.length > 0) {
        const painPointIds = relatedPainPoints.map((pp) => pp.id);

        // 1. 删除 painPointTags（痛点标签关联）
        await db.delete(painPointTags).where(inArray(painPointTags.painPointId, painPointIds));

        // 2. 删除 painPoints（痛点）
        await db.delete(painPoints).where(inArray(painPoints.id, painPointIds));
      }

      // 3. 删除 posts（帖子）
      await db.delete(posts).where(inArray(posts.id, postIds));
    }

    // 4. 删除 subreddit
    await db.delete(subreddits).where(eq(subreddits.id, id));

    // 返回 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("删除 Subreddit 失败:", error);
    return ApiErrors.databaseError("删除 Subreddit 失败");
  }
}
