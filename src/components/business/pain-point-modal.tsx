"use client";

import { PainPoint, DimensionScores, IndustryCode, PainPointTypeCode } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScoreBadge } from "./score-badge";
import { IndustryBadge, TypeBadge, TagBadge } from "./type-badge";
import { DimensionRadar, DimensionList } from "./dimension-radar";
import {
  Calendar,
  MessageSquare,
  TrendingUp,
  Users,
  Lightbulb,
  Target,
  CheckCircle2,
  ExternalLink,
  Copy,
  Share2,
  ArrowUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

interface PainPointModalProps {
  painPoint: PainPoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 痛点详情弹窗组件
 */
export function PainPointModal({
  painPoint,
  open,
  onOpenChange,
}: PainPointModalProps) {
  if (!painPoint) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}已复制到剪贴板`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/pain-points/${painPoint.id}`;
    navigator.clipboard.writeText(url);
    toast.success("链接已复制到剪贴板");
  };

  // 处理维度评分格式
  type RawDimensionScore = number | { score: number; reason?: string };
  type RawDimensionScores = Record<string, RawDimensionScore>;

  const rawScores: RawDimensionScores =
    (painPoint.dimension_scores as unknown as RawDimensionScores) || {};

  const extractScore = (
    value: number | { score: number; reason?: string } | undefined
  ): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "object" && "score" in value) return value.score;
    return 0;
  };

  const dimensionScores: DimensionScores = {
    urgency: extractScore(rawScores.urgency),
    frequency: extractScore(rawScores.frequency),
    market_size: extractScore(rawScores.market_size),
    monetization: extractScore(rawScores.monetization),
    barrier_to_entry: extractScore(rawScores.barrier_to_entry),
  };

  const extractReason = (
    value: number | { score: number; reason?: string } | undefined
  ): string => {
    if (value === undefined || value === null) return "";
    if (typeof value === "object" && "reason" in value) return value.reason || "";
    return "";
  };

  const dimensionReasons: Record<string, string> = {
    urgency: extractReason(rawScores.urgency),
    frequency: extractReason(rawScores.frequency),
    market_size: extractReason(rawScores.market_size),
    monetization: extractReason(rawScores.monetization),
    barrier_to_entry: extractReason(rawScores.barrier_to_entry),
  };

  const post = painPoint.post;
  const subredditName = post?.subreddit?.name || "unknown";
  const sourceUrl = post?.url;

  const getMarketSizeLabel = (score: number): string => {
    if (score >= 8) return "大型市场";
    if (score >= 6) return "中型市场";
    if (score >= 4) return "小型市场";
    return "利基市场";
  };

  const getBarrierLabel = (score: number): string => {
    if (score >= 8) return "门槛较高";
    if (score >= 6) return "中等门槛";
    if (score >= 4) return "门槛较低";
    return "几乎无门槛";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[95vh]">
          <div className="p-5 space-y-5">
            {/* Header */}
            <DialogHeader className="space-y-4 pb-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-0.5">
                    <ScoreBadge score={painPoint.total_score} size="lg" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <DialogTitle className="text-xl font-bold leading-tight tracking-tight">
                      {painPoint.title}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-2">
                      {painPoint.industry_code && (
                        <IndustryBadge code={painPoint.industry_code as IndustryCode} size="sm" />
                      )}
                      {painPoint.type_code && (
                        <TypeBadge code={painPoint.type_code as PainPointTypeCode} size="sm" />
                      )}
                      {painPoint.mentioned_competitors?.slice(0, 3).map((competitor: string) => (
                        <TagBadge key={competitor} tag={competitor} />
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="icon" onClick={handleShare} className="shrink-0 h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Description */}
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {painPoint.description}
                </p>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border-b pb-3">
                {painPoint.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 opacity-70" />
                    <span>
                      {formatDistanceToNow(new Date(painPoint.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground/80">r/{subredditName}</span>
                </div>
                {post && (
                  <div className="flex items-center gap-3 border-l pl-3">
                    <div className="flex items-center gap-1" title="赞同数">
                      <ArrowUp className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-medium text-foreground/80">{post.score}</span>
                    </div>
                    <div className="flex items-center gap-1" title="评论数">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-medium text-foreground/80">{post.num_comments}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                   <div className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] font-medium border border-green-100 dark:border-green-800">
                    置信度 {(painPoint.confidence * 100).toFixed(0)}%
                   </div>
                </div>
              </div>
            </DialogHeader>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Left: Details */}
              <div className="lg:col-span-3 space-y-4">
                {/* User need */}
                {painPoint.user_need && (
                  <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="py-3 px-4 min-h-10">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        核心需求分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-3">
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {painPoint.user_need}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Solutions comparison */}
                {(painPoint.current_solution || painPoint.ideal_solution) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {painPoint.current_solution && (
                       <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/30">
                        <CardHeader className="py-2.5 px-4 pb-1.5 min-h-9">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                             现状与痛点
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                           <p className="text-xs text-foreground/80 leading-relaxed">
                            {painPoint.current_solution}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {painPoint.ideal_solution && (
                       <Card className="bg-green-50/30 dark:bg-green-950/10 border-green-100 dark:border-green-900/30">
                        <CardHeader className="py-2.5 px-4 pb-1.5 min-h-9">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                             理想解决方案
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                           <p className="text-xs text-foreground/80 leading-relaxed">
                            {painPoint.ideal_solution}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                 {/* Actionable insights */}
                {painPoint.actionable_insights && painPoint.actionable_insights.length > 0 && (
                  <Card className="border-l-4 border-l-amber-500 shadow-sm bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/10">
                    <CardHeader className="py-3 px-4 min-h-10">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        可行动洞察
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-3">
                      <ul className="grid gap-2">
                        {painPoint.actionable_insights.map((insight: string, index: number) => (
                          <li key={index} className="flex items-start gap-2.5 text-sm bg-white dark:bg-card p-2.5 rounded-md border shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="leading-relaxed text-xs">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Quotes */}
                {painPoint.quotes && painPoint.quotes.length > 0 && (
                  <Card className="shadow-none border-dashed">
                    <CardHeader className="py-2.5 px-4 min-h-9">
                      <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        用户原声
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-3 space-y-2">
                      {painPoint.quotes.slice(0, 3).map((quote: string, index: number) => (
                        <figure key={index} className="relative pl-3">
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-muted rounded-full" />
                          <blockquote className="text-xs italic text-muted-foreground leading-relaxed">
                            &ldquo;{quote}&rdquo;
                          </blockquote>
                        </figure>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Scores & Radar */}
              <div className="lg:col-span-2 space-y-4">
                {/* Radar chart */}
                <Card className="overflow-hidden border-primary/10 shadow-md">
                  <CardHeader className="py-3 px-4 bg-muted/30 border-b min-h-10">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      商业潜力评估
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-4 pb-4">
                    <div className="flex justify-center mb-4">
                      <DimensionRadar scores={dimensionScores} size={180} />
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-xs mb-4">
                      <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                        <span className="text-muted-foreground font-medium">综合评分</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-bold text-primary">{painPoint.total_score.toFixed(1)}</span>
                          <span className="text-muted-foreground text-[10px]">/ 10</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">市场规模</span>
                        <span className="font-medium px-1.5 py-0.5 bg-background rounded border text-foreground/80 shadow-sm text-[10px]">
                          {getMarketSizeLabel(dimensionScores.market_size)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">准入门槛</span>
                        <span className="font-medium px-1.5 py-0.5 bg-background rounded border text-foreground/80 shadow-sm text-[10px]">
                          {getBarrierLabel(dimensionScores.barrier_to_entry)}
                        </span>
                      </div>
                    </div>

                    <Separator className="mb-3" />
                    <div className="max-h-[250px] overflow-y-auto pr-1">
                      <DimensionList scores={dimensionScores} reasons={dimensionReasons} />
                    </div>
                  </CardContent>
                </Card>

                {/* Target personas */}
                {painPoint.target_personas && painPoint.target_personas.length > 0 && (
                  <Card>
                    <CardHeader className="py-3 px-4 border-b min-h-10">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        目标用户画像
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 px-4 pb-3">
                      <ul className="space-y-2">
                        {painPoint.target_personas.map((persona: string, index: number) => (
                          <li key={index} className="flex items-start gap-2.5 p-2.5 bg-secondary/20 rounded-lg border border-secondary/50">
                            <div className="bg-background p-1 rounded-full shadow-sm mt-0.5">
                              <Users className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs font-medium leading-relaxed">{persona}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  {sourceUrl && (
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                      asChild
                    >
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        查看原文
                      </a>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all"
                    onClick={() =>
                      handleCopy(
                        `${painPoint.title}\n\n${painPoint.description}\n\n用户需求: ${painPoint.user_need || "无"}\n\n可行动洞察:\n${painPoint.actionable_insights?.join("\n") || "无"}`,
                        "痛点信息"
                      )
                    }
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    复制信息
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}