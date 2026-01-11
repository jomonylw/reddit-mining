"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubreddits,
  getSubreddit,
  createSubreddit,
  updateSubreddit,
  deleteSubreddit,
} from "@/lib/api/client";
import { Subreddit } from "@/types";

/**
 * 获取 Subreddit 列表
 */
export function useSubreddits() {
  return useQuery({
    queryKey: ["subreddits"],
    queryFn: async () => {
      const response = await getSubreddits();
      return response.data || [];
    },
  });
}

/**
 * 获取单个 Subreddit
 */
export function useSubreddit(id: string | undefined) {
  return useQuery({
    queryKey: ["subreddits", id],
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await getSubreddit(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * 创建 Subreddit
 */
export function useCreateSubreddit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Subreddit>) => {
      const response = await createSubreddit(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subreddits"] });
    },
  });
}

/**
 * 更新 Subreddit
 */
export function useUpdateSubreddit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Subreddit> }) => {
      const response = await updateSubreddit(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subreddits"] });
      queryClient.invalidateQueries({ queryKey: ["subreddits", variables.id] });
    },
  });
}

/**
 * 删除 Subreddit
 */
export function useDeleteSubreddit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteSubreddit(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subreddits"] });
    },
  });
}