"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DimensionScores, DIMENSION_NAMES } from "@/types";

interface DimensionRadarProps {
  scores: DimensionScores;
  size?: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * 维度雷达图组件
 * 可视化展示五个评分维度
 */
export function DimensionRadar({
  scores,
  size = 300,
  showLabels: _showLabels = true,
  className,
}: DimensionRadarProps) {
  // 将评分数据转换为雷达图格式
  const data = [
    {
      dimension: DIMENSION_NAMES.urgency,
      value: scores.urgency,
      fullMark: 10,
    },
    {
      dimension: DIMENSION_NAMES.frequency,
      value: scores.frequency,
      fullMark: 10,
    },
    {
      dimension: DIMENSION_NAMES.market_size,
      value: scores.market_size,
      fullMark: 10,
    },
    {
      dimension: DIMENSION_NAMES.monetization,
      value: scores.monetization,
      fullMark: 10,
    },
    {
      dimension: DIMENSION_NAMES.barrier_to_entry,
      value: scores.barrier_to_entry,
      fullMark: 10,
    },
  ];

  return (
    <div className={className} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            tickCount={6}
            axisLine={false}
          />
          <Radar
            name="评分"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
                    <p className="text-sm font-medium text-popover-foreground">{data.dimension}</p>
                    <p className="text-sm text-muted-foreground">
                      评分: <span className="font-medium">{data.value}</span> / 10
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 维度评分列表（简化版，不使用图表）
 */
export function DimensionList({
  scores,
  reasons,
  className,
}: {
  scores: DimensionScores;
  reasons?: Record<string, string>;
  className?: string;
}) {
  const dimensions = [
    { key: "urgency" as const, name: DIMENSION_NAMES.urgency, score: scores.urgency },
    { key: "frequency" as const, name: DIMENSION_NAMES.frequency, score: scores.frequency },
    { key: "market_size" as const, name: DIMENSION_NAMES.market_size, score: scores.market_size },
    {
      key: "monetization" as const,
      name: DIMENSION_NAMES.monetization,
      score: scores.monetization,
    },
    {
      key: "barrier_to_entry" as const,
      name: DIMENSION_NAMES.barrier_to_entry,
      score: scores.barrier_to_entry,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getBarWidth = (score: number) => `${(score / 10) * 100}%`;

  const getBarColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {dimensions.map(({ key, name, score }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{name}</span>
              <span className={`text-sm font-medium ${getScoreColor(score)}`}>{score}/10</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(score)}`}
                style={{ width: getBarWidth(score) }}
              />
            </div>
            {reasons?.[key] && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{reasons[key]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
