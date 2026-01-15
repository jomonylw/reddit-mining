/**
 * 统计数据 Hook
 */

import { useQuery } from "@tanstack/react-query";
import { Stats } from "@/lib/api/client";

export type { Stats };

/**
 * 获取系统统计数据（带时区支持）
 */
export function useStats() {
  return useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      // 获取用户时区偏移量（分钟）
      const timezoneOffset = new Date().getTimezoneOffset();

      const response = await fetch("/api/stats", {
        headers: {
          "x-timezone-offset": String(timezoneOffset),
        },
      });

      if (!response.ok) {
        throw new Error("获取统计数据失败");
      }

      const json = await response.json();
      if (!json.data) {
        throw new Error("获取统计数据失败");
      }
      return json.data as Stats;
    },
    // 每5分钟刷新一次
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
