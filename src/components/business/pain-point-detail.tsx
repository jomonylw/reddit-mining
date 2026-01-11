"use client";

import { useState } from "react";
import { PainPoint, DimensionScores, IndustryCode, PainPointTypeCode, Quote } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScoreBadge } from "./score-badge";
import { IndustryBadge, TypeBadge, TagBadge } from "./type-badge";
import { DimensionRadar, DimensionList } from "./dimension-radar";
import {
  MessageSquare,
  TrendingUp,
  Users,
  Lightbulb,
  Target,
  CheckCircle2,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 获取引用文本（兼容新旧格式）
function getQuoteText(quote: string | Quote, lang: "zh" | "en"): string {
  if (typeof quote === "string") {
    return quote;
  }
  return quote[lang] || quote.en || "";
}

// 辅助函数：获取市场规模标签
function getMarketSizeLabel(score: number): string {
  if (score >= 8) return "大型市场";
  if (score >= 6) return "中型市场";
  if (score >= 4) return "小型市场";
  return "利基市场";
}

// 辅助函数：获取门槛标签
function getBarrierLabel(score: number): string {
  if (score >= 8) return "门槛较高";
  if (score >= 6) return "中等门槛";
  if (score >= 4) return "门槛较低";
  return "几乎无门槛";
}

// 提取维度分数的辅助函数
type RawDimensionScore = number | { score: number; reason?: string };
type RawDimensionScores = Record<string, RawDimensionScore>;

function extractScore(value: number | { score: number; reason?: string } | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "score" in value) return value.score;
  return 0;
}

interface PainPointDetailProps {
  painPoint: PainPoint;
  /** 布局模式：compact 用于弹窗，full 用于独立页面 */
  layout?: "compact" | "full";
  /** 是否显示雷达图 */
  showRadar?: boolean;
  /** 雷达图尺寸 */
  radarSize?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 痛点详情内容组件（可复用）
 * 用于弹窗和独立页面中展示痛点的详细信息
 */
export function PainPointDetail({
  painPoint,
  layout = "compact",
  showRadar = true,
  radarSize = 250,
  className,
}: PainPointDetailProps) {
  // 用户原声语言切换状态
  const [quoteLang, setQuoteLang] = useState<"zh" | "en">("zh");

  // 处理维度评分格式
  const rawScores: RawDimensionScores =
    (painPoint.dimension_scores as unknown as RawDimensionScores) || {};

  const dimensionScores: DimensionScores = {
    urgency: extractScore(rawScores.urgency),
    frequency: extractScore(rawScores.frequency),
    market_size: extractScore(rawScores.market_size),
    monetization: extractScore(rawScores.monetization),
    barrier_to_entry: extractScore(rawScores.barrier_to_entry),
  };

  // 提取维度理由 - 支持多种数据格式
  const extractReason = (key: string): string => {
    // 1. 首先尝试从 dimension_reasons 字段获取（列表 API 返回的格式）
    const directReason = (painPoint as unknown as Record<string, unknown>).dimension_reasons as
      | Record<string, string>
      | undefined;
    if (directReason?.[key]) return directReason[key];

    // 2. 尝试从 dimension_scores 中的对象格式获取（详情 API 返回的格式）
    const scoreValue = rawScores[key];
    if (scoreValue && typeof scoreValue === "object" && "reason" in scoreValue) {
      return scoreValue.reason || "";
    }

    return "";
  };

  const dimensionReasons: Record<string, string> = {
    urgency: extractReason("urgency"),
    frequency: extractReason("frequency"),
    market_size: extractReason("market_size"),
    monetization: extractReason("monetization"),
    barrier_to_entry: extractReason("barrier_to_entry"),
  };

  const isCompact = layout === "compact";

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {/* Main content grid */}
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          isCompact ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1 lg:grid-cols-3"
        )}
      >
        {/* Left: Details */}
        <div className={cn(isCompact ? "lg:col-span-7" : "lg:col-span-2", "space-y-3")}>
          {/* User need */}
          {painPoint.user_need && (
            <Card className="border-l-2 border-l-blue-500 shadow-sm">
              <CardHeader className={isCompact ? "px-3" : "px-4"}>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  核心需求分析
                </CardTitle>
              </CardHeader>
              <CardContent className={cn("pt-0", isCompact ? "px-3 pb-2.5" : "px-4 pb-3")}>
                <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                  {painPoint.user_need}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Solutions comparison */}
          {(painPoint.current_solution || painPoint.ideal_solution) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {painPoint.current_solution && (
                <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-200/80 dark:border-red-900/30">
                  <CardHeader className={cn("pb-1", isCompact ? "py-2 px-3" : "py-3 px-4")}>
                    <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400">
                      现状与痛点
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={isCompact ? "px-3 pb-2.5" : "px-4 pb-3"}>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {painPoint.current_solution}
                    </p>
                  </CardContent>
                </Card>
              )}

              {painPoint.ideal_solution && (
                <Card className="bg-green-50/30 dark:bg-green-950/10 border-green-200/80 dark:border-green-900/30">
                  <CardHeader className={cn("pb-1", isCompact ? "py-2 px-3" : "py-3 px-4")}>
                    <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-400">
                      理想解决方案
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={isCompact ? "px-3 pb-2.5" : "px-4 pb-3"}>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {painPoint.ideal_solution}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Actionable insights */}
          {painPoint.actionable_insights && painPoint.actionable_insights.length > 0 && (
            <Card className="border-l-2 border-l-amber-500 shadow-sm bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10">
              <CardHeader className={cn(isCompact ? "py-2 px-3" : "py-3 px-4")}>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  可行动洞察
                </CardTitle>
              </CardHeader>
              <CardContent className={cn("pt-0", isCompact ? "px-3 pb-2.5" : "px-4 pb-3")}>
                <ul className="space-y-1.5">
                  {painPoint.actionable_insights.map((insight: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 bg-white/80 dark:bg-card/50 px-2.5 py-1.5 rounded border text-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-snug text-foreground/85">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quotes */}
          {painPoint.quotes && painPoint.quotes.length > 0 && (
            <Card className="shadow-none border-dashed border-muted-foreground/25">
              <CardHeader className={cn(isCompact ? "py-2 px-3" : "py-3 px-4")}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    用户原声
                  </CardTitle>
                  {/* 语言切换按钮 */}
                  <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                    <button
                      onClick={() => setQuoteLang("zh")}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded transition-colors",
                        quoteLang === "zh"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => setQuoteLang("en")}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded transition-colors",
                        quoteLang === "en"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent
                className={cn("pt-0 space-y-2", isCompact ? "px-3 pb-2.5" : "px-4 pb-3")}
              >
                {painPoint.quotes
                  .slice(0, isCompact ? 3 : undefined)
                  .map((quote, index: number) => (
                    <figure key={index} className="relative pl-3">
                      <div className="absolute left-0 top-0.5 bottom-0.5 w-0.5 bg-muted-foreground/25 rounded-full" />
                      <blockquote className="text-xs italic text-muted-foreground leading-relaxed">
                        &ldquo;{getQuoteText(quote, quoteLang)}&rdquo;
                      </blockquote>
                    </figure>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Scores & Radar */}
        <div className={cn(isCompact ? "lg:col-span-5" : "lg:col-span-1", "space-y-3")}>
          {/* Radar chart */}
          <Card className="overflow-hidden border-primary/15 shadow-sm">
            <CardHeader className={cn("border-b", isCompact ? "py-2 px-3" : "py-3 px-4")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  商业潜力评估
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">
                    {painPoint.total_score.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className={isCompact ? "p-3" : "p-4"}>
              {/* 雷达图 */}
              {showRadar && (
                <div className="flex justify-center mb-3">
                  <DimensionRadar scores={dimensionScores} size={radarSize} />
                </div>
              )}

              {/* 快速指标 */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="flex flex-col items-center p-2 bg-muted/40 rounded-md">
                  <span className="text-muted-foreground mb-0.5">市场规模</span>
                  <span className="font-medium text-foreground/90">
                    {getMarketSizeLabel(dimensionScores.market_size)}
                  </span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/40 rounded-md">
                  <span className="text-muted-foreground mb-0.5">准入门槛</span>
                  <span className="font-medium text-foreground/90">
                    {getBarrierLabel(dimensionScores.barrier_to_entry)}
                  </span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/40 rounded-md">
                  <span className="text-muted-foreground mb-0.5">变现潜力</span>
                  <span className="font-medium text-foreground/90">
                    {dimensionScores.monetization >= 7
                      ? "高"
                      : dimensionScores.monetization >= 4
                        ? "中"
                        : "低"}
                  </span>
                </div>
              </div>

              <Separator className="mb-2.5" />
              <div className="max-h-none overflow-visible">
                <DimensionList scores={dimensionScores} reasons={dimensionReasons} />
              </div>
            </CardContent>
          </Card>

          {/* Target personas */}
          {painPoint.target_personas && painPoint.target_personas.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className={cn("border-b", isCompact ? "py-2 px-3" : "py-3 px-4")}>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  目标用户画像
                </CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "p-2.5" : "p-3"}>
                <ul className="space-y-1.5">
                  {painPoint.target_personas.map((persona: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary/25 rounded border border-secondary/40 text-sm"
                    >
                      <Users className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="font-medium text-foreground/90">{persona}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 痛点统计信息条组件
 */
interface PainPointStatsBarProps {
  painPoint: PainPoint;
  className?: string;
}

export function PainPointStatsBar({ painPoint, className }: PainPointStatsBarProps) {
  const post = painPoint.post;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2",
        className
      )}
    >
      {post && (
        <>
          <div className="flex items-center gap-1" title="赞同数">
            <ArrowUp className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-medium text-foreground/80">{post.score}</span>
          </div>
          <div className="flex items-center gap-1" title="评论数">
            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium text-foreground/80">{post.num_comments}</span>
          </div>
          <span className="text-border">|</span>
        </>
      )}
      <div className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium">
        置信度 {(painPoint.confidence * 100).toFixed(0)}%
      </div>
      {painPoint.mentioned_competitors && painPoint.mentioned_competitors.length > 0 && (
        <>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1">
            {painPoint.mentioned_competitors.slice(0, 3).map((competitor: string) => (
              <TagBadge key={competitor} tag={competitor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 痛点头部信息组件
 */
interface PainPointHeaderProps {
  painPoint: PainPoint;
  showScore?: boolean;
  className?: string;
}

export function PainPointHeader({ painPoint, showScore = true, className }: PainPointHeaderProps) {
  const post = painPoint.post;
  const subredditName = post?.subreddit?.name || "unknown";

  return (
    <div className={cn("flex items-start gap-4", className)}>
      {showScore && (
        <div className="shrink-0">
          <ScoreBadge score={painPoint.total_score} size="lg" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg sm:text-xl font-bold leading-tight tracking-tight text-foreground line-clamp-2">
          {painPoint.title}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {painPoint.industry_code && (
            <IndustryBadge code={painPoint.industry_code as IndustryCode} size="sm" />
          )}
          {painPoint.type_code && (
            <TypeBadge code={painPoint.type_code as PainPointTypeCode} size="sm" />
          )}
          <span className="text-muted-foreground mx-1">·</span>
          <span className="text-xs text-muted-foreground">r/{subredditName}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 痛点描述组件
 */
interface PainPointDescriptionProps {
  description: string;
  className?: string;
}

export function PainPointDescription({ description, className }: PainPointDescriptionProps) {
  return (
    <div className={cn("bg-muted/30 px-3 py-2.5 rounded-lg border border-border/50", className)}>
      <p className="text-sm text-foreground/90 leading-relaxed">{description}</p>
    </div>
  );
}
