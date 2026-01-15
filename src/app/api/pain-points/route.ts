/**
 * 痛点数据 API
 * GET /api/pain-points - 分页获取痛点列表
 */

import { NextRequest } from "next/server";
import { eq, desc, asc, sql, like, and, gte, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  painPoints,
  posts,
  subreddits,
  industries,
  painPointTypes,
  tags,
  painPointTags,
} from "@/lib/db/schema";
import { successResponse, ApiErrors } from "@/lib/api/response";

/**
 * GET /api/pain-points
 * 分页获取痛点列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 解析分页参数（同时支持 limit 和 per_page 参数）
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limitParam = searchParams.get("limit") || searchParams.get("per_page") || "20";
    const perPage = Math.min(100, Math.max(1, parseInt(limitParam, 10)));
    const offset = (page - 1) * perPage;

    // 解析筛选参数
    const q = searchParams.get("search");
    const industryFilter = searchParams.get("industry");
    const typeFilter = searchParams.get("type");
    const subredditFilter = searchParams.get("subreddit");
    const scoreMin = searchParams.get("score_min");
    const scoreMax = searchParams.get("score_max");
    const sort = searchParams.get("sort") || "created_at_desc";

    // 构建筛选条件
    const conditions = [];

    if (q) {
      conditions.push(or(like(painPoints.title, `%${q}%`), like(painPoints.description, `%${q}%`)));
    }

    if (industryFilter) {
      const industryCodes = industryFilter.split(",");
      conditions.push(
        sql`${painPoints.industryCode} IN (${sql.join(
          industryCodes.map((c) => sql`${c}`),
          sql`, `
        )})`
      );
    }

    if (typeFilter) {
      const typeCodes = typeFilter.split(",");
      conditions.push(
        sql`${painPoints.typeCode} IN (${sql.join(
          typeCodes.map((c) => sql`${c}`),
          sql`, `
        )})`
      );
    }

    if (scoreMin) {
      conditions.push(gte(painPoints.totalScore, parseFloat(scoreMin)));
    }

    if (scoreMax) {
      conditions.push(lte(painPoints.totalScore, parseFloat(scoreMax)));
    }

    // 解析排序参数（支持新格式 sort + order 和旧格式 score_desc 等）
    const order = searchParams.get("order") || "desc";

    // 确定排序方式
    let orderBy;
    // 新格式：sort + order 分开传递
    if (sort === "total_score" || sort === "confidence" || sort === "created_at") {
      const isAsc = order === "asc";
      switch (sort) {
        case "total_score":
          orderBy = isAsc ? asc(painPoints.totalScore) : desc(painPoints.totalScore);
          break;
        case "confidence":
          orderBy = isAsc ? asc(painPoints.confidence) : desc(painPoints.confidence);
          break;
        case "created_at":
          orderBy = isAsc ? asc(painPoints.createdAt) : desc(painPoints.createdAt);
          break;
      }
    } else {
      // 兼容旧格式：score_desc 等组合格式
      switch (sort) {
        case "score_desc":
          orderBy = desc(painPoints.totalScore);
          break;
        case "score_asc":
          orderBy = asc(painPoints.totalScore);
          break;
        case "confidence_desc":
          orderBy = desc(painPoints.confidence);
          break;
        case "confidence_asc":
          orderBy = asc(painPoints.confidence);
          break;
        case "created_at_asc":
          orderBy = asc(painPoints.createdAt);
          break;
        case "reddit_score_desc":
          orderBy = desc(posts.score);
          break;
        case "comments_desc":
          orderBy = desc(posts.numComments);
          break;
        case "created_at_desc":
        default:
          orderBy = desc(painPoints.createdAt);
      }
    }

    // 构建基础查询
    const baseQuery = db
      .select({
        painPoint: painPoints,
        post: posts,
        subreddit: subreddits,
        industry: industries,
        painPointType: painPointTypes,
      })
      .from(painPoints)
      .leftJoin(posts, eq(painPoints.postId, posts.id))
      .leftJoin(subreddits, eq(posts.subredditId, subreddits.id))
      .leftJoin(industries, eq(painPoints.industryCode, industries.code))
      .leftJoin(painPointTypes, eq(painPoints.typeCode, painPointTypes.code));

    // 应用筛选条件
    let filteredQuery = baseQuery;
    if (conditions.length > 0) {
      filteredQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
    }

    // 应用 subreddit 筛选
    if (subredditFilter) {
      const subredditNames = subredditFilter.split(",");
      filteredQuery = filteredQuery.where(
        sql`${subreddits.name} IN (${sql.join(
          subredditNames.map((n) => sql`${n}`),
          sql`, `
        )})`
      ) as typeof baseQuery;
    }

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(painPoints)
      .leftJoin(posts, eq(painPoints.postId, posts.id))
      .leftJoin(subreddits, eq(posts.subredditId, subreddits.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / perPage);

    // 获取分页数据
    const results = await filteredQuery.orderBy(orderBy).limit(perPage).offset(offset);

    // 获取每个痛点的标签
    const painPointIds = results.map((r) => r.painPoint.id);
    const tagsMap: Record<string, string[]> = {};

    if (painPointIds.length > 0) {
      const tagsResult = await db
        .select({
          painPointId: painPointTags.painPointId,
          tagName: tags.name,
        })
        .from(painPointTags)
        .innerJoin(tags, eq(painPointTags.tagId, tags.id))
        .where(
          sql`${painPointTags.painPointId} IN (${sql.join(
            painPointIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );

      for (const row of tagsResult) {
        if (!tagsMap[row.painPointId]) {
          tagsMap[row.painPointId] = [];
        }
        tagsMap[row.painPointId].push(row.tagName);
      }
    }

    // 辅助函数：解析 JSON 字段
    const parseJsonField = (field: string | null): string[] | null => {
      if (!field) return null;
      try {
        return JSON.parse(field);
      } catch {
        return null;
      }
    };

    // 格式化响应数据
    const data = results.map(({ painPoint, post, subreddit, industry, painPointType }) => ({
      id: painPoint.id,
      title: painPoint.title,
      description: painPoint.description,
      user_need: painPoint.userNeed,
      current_solution: painPoint.currentSolution,
      ideal_solution: painPoint.idealSolution,
      mentioned_competitors: parseJsonField(painPoint.mentionedCompetitors),
      quotes: parseJsonField(painPoint.quotes),
      target_personas: parseJsonField(painPoint.targetPersonas),
      actionable_insights: parseJsonField(painPoint.actionableInsights),
      industry_code: painPoint.industryCode,
      type_code: painPoint.typeCode,
      industry: industry
        ? {
            code: industry.code,
            name: industry.name,
          }
        : null,
      type: painPointType
        ? {
            code: painPointType.code,
            name: painPointType.name,
          }
        : null,
      total_score: painPoint.totalScore,
      confidence: painPoint.confidence,
      dimension_scores: {
        urgency: painPoint.scoreUrgency,
        frequency: painPoint.scoreFrequency,
        market_size: painPoint.scoreMarketSize,
        monetization: painPoint.scoreMonetization,
        barrier_to_entry: painPoint.scoreBarrierToEntry,
      },
      dimension_reasons: painPoint.dimensionReasons
        ? (() => {
            try {
              const parsed = JSON.parse(painPoint.dimensionReasons);
              return {
                urgency: parsed.urgency?.reason || "",
                frequency: parsed.frequency?.reason || "",
                market_size: parsed.market_size?.reason || "",
                monetization: parsed.monetization?.reason || "",
                barrier_to_entry: parsed.barrier_to_entry?.reason || "",
              };
            } catch {
              return null;
            }
          })()
        : null,
      tags: tagsMap[painPoint.id] || [],
      post: post
        ? {
            id: post.id,
            subreddit: subreddit
              ? {
                  id: subreddit.id,
                  name: subreddit.name,
                }
              : null,
            reddit_id: post.redditId,
            title: post.title,
            content: post.content,
            author: post.author,
            url: post.url,
            score: post.score,
            num_comments: post.numComments,
            reddit_created_at: post.redditCreatedAt,
          }
        : null,
      created_at: painPoint.createdAt,
      updated_at: painPoint.updatedAt,
    }));

    return successResponse(data, {
      page,
      limit: perPage,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("获取痛点列表失败:", error);
    return ApiErrors.databaseError("获取痛点列表失败");
  }
}
