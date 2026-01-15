import { sqliteTable, text, integer, real, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Subreddit 配置表
 * 存储系统监控的 Subreddit 配置信息
 */
export const subreddits = sqliteTable(
  "subreddits",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    displayName: text("display_name"),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    fetchFrequency: text("fetch_frequency", { enum: ["hourly", "daily", "weekly"] })
      .notNull()
      .default("daily"),
    postsLimit: integer("posts_limit").notNull().default(100),
    lastFetchedAt: text("last_fetched_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("idx_subreddits_name").on(table.name),
    index("idx_subreddits_is_active").on(table.isActive),
  ]
);

/**
 * Reddit 帖子表
 * 存储从 Reddit 抓取的原始帖子数据
 */
export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    subredditId: text("subreddit_id").references(() => subreddits.id),
    redditId: text("reddit_id").notNull().unique(),
    title: text("title").notNull(),
    content: text("content"),
    author: text("author"),
    url: text("url").notNull(),
    score: integer("score").notNull().default(0),
    numComments: integer("num_comments").notNull().default(0),
    redditCreatedAt: text("reddit_created_at").notNull(),
    processStatus: text("process_status", {
      enum: ["pending", "processing", "completed", "no_pain_point", "failed", "skipped"],
    })
      .notNull()
      .default("pending"),
    processedAt: text("processed_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("idx_posts_reddit_id").on(table.redditId),
    index("idx_posts_subreddit_id").on(table.subredditId),
    index("idx_posts_process_status").on(table.processStatus),
    index("idx_posts_created_at").on(table.createdAt),
  ]
);

/**
 * 行业分类表
 * 存储预定义的行业分类数据
 */
export const industries = sqliteTable("industries", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * 痛点类型表
 * 存储预定义的痛点类型分类
 */
export const painPointTypes = sqliteTable("pain_point_types", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * 痛点数据表
 * 存储 LLM 分析提取的痛点信息
 */
export const painPoints = sqliteTable(
  "pain_points",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .references(() => posts.id)
      .unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    userNeed: text("user_need"),
    currentSolution: text("current_solution"),
    idealSolution: text("ideal_solution"),
    mentionedCompetitors: text("mentioned_competitors"), // JSON 数组
    quotes: text("quotes"), // JSON 数组
    targetPersonas: text("target_personas"), // JSON 数组
    actionableInsights: text("actionable_insights"), // JSON 数组
    industryCode: text("industry_code").references(() => industries.code),
    typeCode: text("type_code").references(() => painPointTypes.code),
    confidence: real("confidence").notNull().default(0),
    totalScore: real("total_score").notNull().default(0),
    scoreUrgency: integer("score_urgency").notNull().default(0),
    scoreFrequency: integer("score_frequency").notNull().default(0),
    scoreMarketSize: integer("score_market_size").notNull().default(0),
    scoreMonetization: integer("score_monetization").notNull().default(0),
    scoreBarrierToEntry: integer("score_barrier_to_entry").notNull().default(0),
    dimensionReasons: text("dimension_reasons"), // JSON 对象
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("idx_pain_points_post_id").on(table.postId),
    index("idx_pain_points_industry_code").on(table.industryCode),
    index("idx_pain_points_type_code").on(table.typeCode),
    index("idx_pain_points_total_score").on(table.totalScore),
    index("idx_pain_points_score_urgency").on(table.scoreUrgency),
    index("idx_pain_points_score_monetization").on(table.scoreMonetization),
    index("idx_pain_points_created_at").on(table.createdAt),
  ]
);

/**
 * 标签表
 * 存储系统中使用的所有标签
 */
export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("idx_tags_name").on(table.name),
    index("idx_tags_usage_count").on(table.usageCount),
  ]
);

/**
 * 痛点标签关联表
 * 痛点与标签的多对多关联
 */
export const painPointTags = sqliteTable(
  "pain_point_tags",
  {
    painPointId: text("pain_point_id")
      .notNull()
      .references(() => painPoints.id),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [
    primaryKey({ columns: [table.painPointId, table.tagId] }),
    index("idx_pain_point_tags_pain_point_id").on(table.painPointId),
    index("idx_pain_point_tags_tag_id").on(table.tagId),
  ]
);

// 导出类型
export type Subreddit = typeof subreddits.$inferSelect;
export type NewSubreddit = typeof subreddits.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type Industry = typeof industries.$inferSelect;
export type NewIndustry = typeof industries.$inferInsert;

export type PainPointType = typeof painPointTypes.$inferSelect;
export type NewPainPointType = typeof painPointTypes.$inferInsert;

export type PainPoint = typeof painPoints.$inferSelect;
export type NewPainPoint = typeof painPoints.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type PainPointTag = typeof painPointTags.$inferSelect;
export type NewPainPointTag = typeof painPointTags.$inferInsert;
