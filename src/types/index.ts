/**
 * 业务类型定义
 */

// 用户原声引用（双语）
export interface Quote {
  en: string; // 英文原文
  zh: string; // 中文翻译
}

// 行业代码枚举
export type IndustryCode =
  | "DEV_TOOLS"
  | "DEVOPS"
  | "DATA"
  | "SAAS"
  | "MARKETING"
  | "SALES"
  | "PRODUCTIVITY"
  | "FINANCE"
  | "HR"
  | "SECURITY"
  | "ECOMMERCE"
  | "COMMUNICATION"
  | "DESIGN"
  | "AI_ML"
  | "OTHER";

// 痛点类型代码枚举
export type PainPointTypeCode =
  | "MISSING_FEATURE"
  | "POOR_UX"
  | "HIGH_COST"
  | "EFFICIENCY"
  | "INTEGRATION"
  | "RELIABILITY"
  | "PERFORMANCE"
  | "LEARNING_CURVE"
  | "NO_SOLUTION"
  | "OTHER";

// 行业信息
export interface Industry {
  code: IndustryCode;
  name: string;
  description?: string;
}

// 痛点类型信息
export interface PainPointType {
  code: PainPointTypeCode;
  name: string;
  description?: string;
}

// 维度评分
export interface DimensionScores {
  urgency: number;
  frequency: number;
  market_size: number;
  monetization: number;
  barrier_to_entry: number;
}

// 维度评分理由
export interface DimensionReasons {
  urgency?: string;
  frequency?: string;
  market_size?: string;
  monetization?: string;
  barrier_to_entry?: string;
}

// 痛点数据
export interface PainPoint {
  id: string;
  post_id: string;
  title: string;
  description: string;
  user_need?: string;
  current_solution?: string;
  ideal_solution?: string;
  mentioned_competitors?: string[];
  quotes?: (Quote | string)[]; // 支持新旧两种格式，兼容历史数据
  target_personas?: string[];
  actionable_insights?: string[];
  industry_code?: IndustryCode;
  type_code?: PainPointTypeCode;
  confidence: number;
  total_score: number;
  dimension_scores?: DimensionScores;
  dimension_reasons?: DimensionReasons;
  created_at?: string;
  updated_at?: string;
  // 关联数据
  post?: RedditPost;
  industry?: Industry;
  pain_point_type?: PainPointType;
  type?: PainPointType; // API 返回的字段名
}

// Reddit 帖子
export interface RedditPost {
  id: string;
  subreddit_id: string;
  reddit_id: string;
  title: string;
  content?: string;
  author?: string;
  url: string;
  score: number;
  num_comments: number;
  reddit_created_at: string;
  process_status: string;
  processed_at?: string;
  created_at?: string;
  // 关联数据
  subreddit?: Subreddit;
}

// Subreddit 配置
export interface Subreddit {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  is_active: boolean;
  fetch_frequency: string;
  posts_limit: number;
  last_fetched_at?: string;
  created_at?: string;
  updated_at?: string;
}

// API 响应结构
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 痛点列表查询参数
export interface PainPointsQuery {
  page?: number;
  limit?: number;
  industry?: IndustryCode;
  type?: PainPointTypeCode;
  sort?: "total_score" | "confidence" | "created_at";
  order?: "asc" | "desc";
  search?: string;
}

// 行业中文名称映射
export const INDUSTRY_NAMES: Record<IndustryCode, string> = {
  DEV_TOOLS: "开发者工具",
  DEVOPS: "DevOps",
  DATA: "数据与分析",
  SAAS: "SaaS 通用",
  MARKETING: "营销",
  SALES: "销售",
  PRODUCTIVITY: "效率工具",
  FINANCE: "财务",
  HR: "人力资源",
  SECURITY: "安全",
  ECOMMERCE: "电商",
  COMMUNICATION: "通讯",
  DESIGN: "设计",
  AI_ML: "AI/ML",
  OTHER: "其他",
};

// 痛点类型中文名称映射
export const PAIN_POINT_TYPE_NAMES: Record<PainPointTypeCode, string> = {
  MISSING_FEATURE: "功能缺失",
  POOR_UX: "体验不佳",
  HIGH_COST: "成本过高",
  EFFICIENCY: "效率低下",
  INTEGRATION: "集成困难",
  RELIABILITY: "稳定性差",
  PERFORMANCE: "性能问题",
  LEARNING_CURVE: "学习成本高",
  NO_SOLUTION: "无解决方案",
  OTHER: "其他",
};

// 维度中文名称映射
export const DIMENSION_NAMES: Record<keyof DimensionScores, string> = {
  urgency: "紧迫程度",
  frequency: "发生频率",
  market_size: "市场规模",
  monetization: "变现潜力",
  barrier_to_entry: "准入门槛",
};
