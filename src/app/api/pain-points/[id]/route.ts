/**
 * 痛点详情 API
 * GET /api/pain-points/[id] - 获取单个痛点详情
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
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

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/pain-points/[id]
 * 获取单个痛点的完整信息
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 查询痛点及其关联数据
    const results = await db
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
      .leftJoin(painPointTypes, eq(painPoints.typeCode, painPointTypes.code))
      .where(eq(painPoints.id, id))
      .limit(1);

    if (results.length === 0) {
      return ApiErrors.notFound("痛点");
    }

    const { painPoint, post, subreddit, industry, painPointType } = results[0];

    // 获取标签
    const tagsResult = await db
      .select({
        tagName: tags.name,
      })
      .from(painPointTags)
      .innerJoin(tags, eq(painPointTags.tagId, tags.id))
      .where(eq(painPointTags.painPointId, id));

    const tagNames = tagsResult.map((t) => t.tagName);

    // 解析 JSON 字段
    const parseJsonField = (field: string | null): string[] | null => {
      if (!field) return null;
      try {
        return JSON.parse(field);
      } catch {
        return null;
      }
    };

    const parseDimensionReasons = (
      field: string | null
    ): Record<string, { score: number; reason: string }> | null => {
      if (!field) return null;
      try {
        return JSON.parse(field);
      } catch {
        return null;
      }
    };

    // 构建响应数据
    const data = {
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
      confidence: painPoint.confidence,
      total_score: painPoint.totalScore,
      dimension_scores: {
        urgency: {
          score: painPoint.scoreUrgency,
          reason: parseDimensionReasons(painPoint.dimensionReasons)?.urgency?.reason || "",
        },
        frequency: {
          score: painPoint.scoreFrequency,
          reason: parseDimensionReasons(painPoint.dimensionReasons)?.frequency?.reason || "",
        },
        market_size: {
          score: painPoint.scoreMarketSize,
          reason: parseDimensionReasons(painPoint.dimensionReasons)?.market_size?.reason || "",
        },
        monetization: {
          score: painPoint.scoreMonetization,
          reason: parseDimensionReasons(painPoint.dimensionReasons)?.monetization?.reason || "",
        },
        barrier_to_entry: {
          score: painPoint.scoreBarrierToEntry,
          reason: parseDimensionReasons(painPoint.dimensionReasons)?.barrier_to_entry?.reason || "",
        },
      },
      tags: tagNames,
      post: post
        ? {
            id: post.id,
            subreddit: subreddit?.name || null,
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
    };

    return successResponse(data);
  } catch (error) {
    console.error("获取痛点详情失败:", error);
    return ApiErrors.databaseError("获取痛点详情失败");
  }
}
