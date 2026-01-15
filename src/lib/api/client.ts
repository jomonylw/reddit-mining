import {
  PainPoint,
  Subreddit,
  Industry,
  PainPointType,
  ApiResponse,
  PainPointsQuery,
} from "@/types";

const API_BASE = "/api";

/**
 * 通用 API 请求函数
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }

  return data;
}

// ============================================================================
// 痛点 API
// ============================================================================

/**
 * 获取痛点列表
 */
export async function getPainPoints(query?: PainPointsQuery): Promise<ApiResponse<PainPoint[]>> {
  const params = new URLSearchParams();

  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.industry) params.set("industry", query.industry);
  if (query?.type) params.set("type", query.type);
  if (query?.sort) params.set("sort", query.sort);
  if (query?.order) params.set("order", query.order);
  if (query?.search) params.set("search", query.search);

  const queryString = params.toString();
  const endpoint = `/pain-points${queryString ? `?${queryString}` : ""}`;

  return fetchApi<PainPoint[]>(endpoint);
}

/**
 * 获取痛点详情
 */
export async function getPainPoint(id: string): Promise<ApiResponse<PainPoint>> {
  return fetchApi<PainPoint>(`/pain-points/${id}`);
}

// ============================================================================
// Subreddit API
// ============================================================================

/**
 * 获取 Subreddit 列表
 */
export async function getSubreddits(): Promise<ApiResponse<Subreddit[]>> {
  return fetchApi<Subreddit[]>("/subreddits");
}

/**
 * 获取单个 Subreddit
 */
export async function getSubreddit(id: string): Promise<ApiResponse<Subreddit>> {
  return fetchApi<Subreddit>(`/subreddits/${id}`);
}

/**
 * 创建 Subreddit
 */
export async function createSubreddit(data: Partial<Subreddit>): Promise<ApiResponse<Subreddit>> {
  return fetchApi<Subreddit>("/subreddits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 更新 Subreddit
 */
export async function updateSubreddit(
  id: string,
  data: Partial<Subreddit>
): Promise<ApiResponse<Subreddit>> {
  return fetchApi<Subreddit>(`/subreddits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * 删除 Subreddit
 */
export async function deleteSubreddit(id: string): Promise<ApiResponse<void>> {
  return fetchApi<void>(`/subreddits/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// 元数据 API
// ============================================================================

/**
 * 获取行业列表
 */
export async function getIndustries(): Promise<ApiResponse<Industry[]>> {
  return fetchApi<Industry[]>("/industries");
}

/**
 * 获取痛点类型列表
 */
export async function getPainPointTypes(): Promise<ApiResponse<PainPointType[]>> {
  return fetchApi<PainPointType[]>("/pain-point-types");
}

// ============================================================================
// 统计 API
// ============================================================================

export interface Stats {
  new_today: number;
  total_pain_points: number;
  active_subreddits: number;
  pending_posts: number;
  avg_score: number;
}

/**
 * 获取系统统计信息
 */
export async function getStats(): Promise<ApiResponse<Stats>> {
  return fetchApi<Stats>("/stats");
}
