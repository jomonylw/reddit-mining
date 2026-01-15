/**
 * 统计数据 API
 * GET /api/stats - 获取系统统计信息
 */

import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { painPoints, posts, subreddits } from "@/lib/db/schema";
import { successResponse, ApiErrors } from "@/lib/api/response";

/**
 * GET /api/stats
 * 获取系统统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取时区偏移量（分钟），默认使用 UTC+8（-480 分钟）
    const timezoneOffset = parseInt(request.headers.get("x-timezone-offset") || "-480", 10);

    // 计算用户本地时间的今天起始时间（UTC 表示）
    // timezoneOffset 是浏览器返回的值，例如 UTC+8 返回 -480
    const now = new Date();
    const localMidnight = new Date(now);
    // 先设置为 UTC 今天 00:00:00
    localMidnight.setUTCHours(0, 0, 0, 0);
    // 然后加上时区偏移量（转换为毫秒）来得到本地午夜的 UTC 时间
    localMidnight.setTime(localMidnight.getTime() + timezoneOffset * 60 * 1000);

    // 如果计算出的本地午夜还在未来，说明需要回退一天
    if (localMidnight > now) {
      localMidnight.setTime(localMidnight.getTime() - 24 * 60 * 60 * 1000);
    }

    // 格式化为 SQLite 兼容格式：YYYY-MM-DD HH:MM:SS
    const todayStr = localMidnight
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");

    // 查询今日新增痛点数（基于用户本地时区的今天）
    const newTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(painPoints)
      .where(sql`${painPoints.createdAt} >= ${todayStr}`);

    const newToday = newTodayResult[0]?.count ?? 0;

    // 查询痛点总数
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(painPoints);

    const totalPainPoints = totalResult[0]?.count ?? 0;

    // 查询活跃 Subreddit 数量
    const activeSubredditsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subreddits)
      .where(sql`${subreddits.isActive} = 1`);

    const activeSubreddits = activeSubredditsResult[0]?.count ?? 0;

    // 查询待处理帖子数
    const pendingPostsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(sql`${posts.processStatus} = 'pending'`);

    const pendingPosts = pendingPostsResult[0]?.count ?? 0;

    // 查询平均评分
    const avgScoreResult = await db
      .select({ avg: sql<number>`avg(${painPoints.totalScore})` })
      .from(painPoints);

    const avgScore = avgScoreResult[0]?.avg ?? 0;

    return successResponse({
      new_today: newToday,
      total_pain_points: totalPainPoints,
      active_subreddits: activeSubreddits,
      pending_posts: pendingPosts,
      avg_score: Math.round(avgScore * 100) / 100,
    });
  } catch (error) {
    console.error("获取统计信息失败:", error);
    return ApiErrors.databaseError("获取统计信息失败");
  }
}
