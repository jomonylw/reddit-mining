"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPainPoints,
  getPainPoint,
  getIndustries,
  getPainPointTypes,
} from "@/lib/api/client";
import { PainPointsQuery } from "@/types";

// Query Keys
export const painPointKeys = {
  all: ["painPoints"] as const,
  lists: () => [...painPointKeys.all, "list"] as const,
  list: (query?: PainPointsQuery) => [...painPointKeys.lists(), query] as const,
  details: () => [...painPointKeys.all, "detail"] as const,
  detail: (id: string) => [...painPointKeys.details(), id] as const,
};

export const metadataKeys = {
  industries: ["industries"] as const,
  painPointTypes: ["painPointTypes"] as const,
};

/**
 * 获取痛点列表
 */
export function usePainPoints(query?: PainPointsQuery) {
  return useQuery({
    queryKey: painPointKeys.list(query),
    queryFn: () => getPainPoints(query),
    select: (data) => ({
      painPoints: data.data || [],
      pagination: data.pagination,
    }),
  });
}

/**
 * 获取痛点详情
 */
export function usePainPoint(id: string) {
  return useQuery({
    queryKey: painPointKeys.detail(id),
    queryFn: () => getPainPoint(id),
    select: (data) => data.data,
    enabled: !!id,
  });
}

/**
 * 获取行业列表
 */
export function useIndustries() {
  return useQuery({
    queryKey: metadataKeys.industries,
    queryFn: getIndustries,
    select: (data) => data.data || [],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * 获取痛点类型列表
 */
export function usePainPointTypes() {
  return useQuery({
    queryKey: metadataKeys.painPointTypes,
    queryFn: getPainPointTypes,
    select: (data) => data.data || [],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}