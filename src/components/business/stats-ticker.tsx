"use client";

import { TrendingUp, Zap, Target, BarChart3 } from "lucide-react";
import { INDUSTRY_NAMES, IndustryCode } from "@/types";

interface StatsTickerProps {
  totalPainPoints?: number;
  newToday?: number;
  topIndustries?: IndustryCode[];
  avgScore?: number;
}

/**
 * 统计栏组件
 */
export function StatsTicker({
  totalPainPoints = 0,
  newToday = 0,
  topIndustries = [],
  avgScore = 0,
}: StatsTickerProps) {
  const stats = [
    {
      icon: Target,
      label: "痛点总数",
      value: totalPainPoints.toLocaleString("zh-CN"),
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "今日新增",
      value: `+${newToday}`,
      color: "text-green-600 dark:text-green-400",
    },
    {
      icon: BarChart3,
      label: "平均评分",
      value: avgScore.toFixed(1),
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 统计数据 */}
        <div className="flex flex-wrap items-center gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-sm text-muted-foreground">{stat.label}:</span>
              <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* 热门行业 */}
        {topIndustries.length > 0 && (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-muted-foreground">热门领域:</span>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {topIndustries
                .slice(0, 3)
                .map((code) => INDUSTRY_NAMES[code] || code)
                .join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}