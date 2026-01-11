"use client";

import { PainPoint, IndustryCode, PainPointTypeCode, DIMENSION_NAMES } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScoreBadge } from "./score-badge";
import { IndustryBadge, TypeBadge } from "./type-badge";
import {
  Lightbulb,
  ArrowUp,
  MessageCircle,
  Users,
  TrendingUp,
  Clock,
  Target,
  DollarSign,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PainPointCardProps {
  painPoint: PainPoint;
  onClick?: (painPoint: PainPoint) => void;
  onCopy?: (painPoint: PainPoint) => void;
  className?: string;
}

// 维度图标映射
const DIMENSION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  urgency: Clock,
  frequency: TrendingUp,
  market_size: Target,
  monetization: DollarSign,
  barrier_to_entry: Shield,
};

// 维度颜色映射
const DIMENSION_COLORS: Record<string, string> = {
  urgency: "bg-red-500",
  frequency: "bg-blue-500",
  market_size: "bg-green-500",
  monetization: "bg-amber-500",
  barrier_to_entry: "bg-purple-500",
};

/**
 * 迷你维度评分条
 */
function MiniDimensionBar({ dimension, score }: { dimension: string; score: number }) {
  const Icon = DIMENSION_ICONS[dimension] || TrendingUp;
  const colorClass = DIMENSION_COLORS[dimension] || "bg-gray-500";
  const dimensionName = DIMENSION_NAMES[dimension as keyof typeof DIMENSION_NAMES] || dimension;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", colorClass)}
                style={{ width: `${(score / 10) * 100}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>
            {dimensionName}: {score}/10
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 痛点卡片组件
 */
export function PainPointCard({ painPoint, onClick, onCopy: _onCopy, className }: PainPointCardProps) {
  // 格式化时间
  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "刚刚";
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const handleCardClick = () => {
    onClick?.(painPoint);
  };

  // 获取维度评分（处理对象或数字格式）
  const getDimensionScore = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "object" && value !== null && "score" in value) {
      return (value as { score: number }).score;
    }
    return 0;
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted/60 hover:border-primary/50 flex flex-col h-full",
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="">
        {/* 标签行 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            {painPoint.type_code && (
              <TypeBadge code={painPoint.type_code as PainPointTypeCode} size="sm" />
            )}
            {painPoint.industry_code && (
              <IndustryBadge code={painPoint.industry_code as IndustryCode} size="sm" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge
              score={painPoint.total_score}
              confidence={painPoint.confidence}
              showConfidence={true}
              size="sm"
            />
          </div>
        </div>

        {/* 标题 */}
        <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {painPoint.title}
        </h3>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* 描述 */}
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {painPoint.description}
        </p>

        {/* 维度评分迷你图 */}
        {painPoint.dimension_scores && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 bg-muted/30 rounded-lg">
            {Object.entries(painPoint.dimension_scores).map(([key, value]) => (
              <MiniDimensionBar key={key} dimension={key} score={getDimensionScore(value)} />
            ))}
          </div>
        )}

        {/* 目标用户群体 */}
        {painPoint.target_personas && painPoint.target_personas.length > 0 && (
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-primary/70 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {painPoint.target_personas.slice(0, 3).map((persona, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 bg-secondary/50 text-secondary-foreground rounded-md border border-secondary"
                >
                  {persona}
                </span>
              ))}
              {painPoint.target_personas.length > 3 && (
                <span className="text-xs text-muted-foreground flex items-center px-1">
                  +{painPoint.target_personas.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 行动建议预览 */}
        {painPoint.actionable_insights && painPoint.actionable_insights.length > 0 && (
          <div className="relative overflow-hidden rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/80" />
            <div className="p-2.5 pl-3.5 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-900/80 dark:text-amber-200/90 line-clamp-2 font-medium">
                {painPoint.actionable_insights[0]}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/5 mt-auto">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          {/* 来源和互动数据 */}
          <div className="flex items-center gap-3">
            {painPoint.post?.subreddit && (
              <span className="font-medium text-foreground/80 hover:text-primary transition-colors">
                r/{painPoint.post.subreddit.name}
              </span>
            )}
            {painPoint.post && (
              <div className="flex items-center gap-3 opacity-80">
                <span className="flex items-center gap-1" title="赞同数">
                  <ArrowUp className="h-3 w-3" />
                  {painPoint.post.score}
                </span>
                <span className="flex items-center gap-1" title="评论数">
                  <MessageCircle className="h-3 w-3" />
                  {painPoint.post.num_comments}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="opacity-70">{formatTime(painPoint.created_at)}</span>
            {/* 复制按钮 */}
            {/* <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
              title="复制内容"
            >
              <Copy className="h-3 w-3" />
            </Button> */}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * 痛点卡片骨架屏
 */
export function PainPointCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-1.5">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-12 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-5 w-full bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted/70 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-muted/70 rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-muted/70 rounded animate-pulse" />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-7 w-20 bg-muted rounded animate-pulse" />
        </div>
      </CardFooter>
    </Card>
  );
}
