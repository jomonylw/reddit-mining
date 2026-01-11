"use client";

import { useParams, useRouter } from "next/navigation";
import { usePainPoint } from "@/hooks/use-pain-points";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/business/score-badge";
import { IndustryBadge, TypeBadge, TagBadge } from "@/components/business/type-badge";
import { DimensionRadar, DimensionList } from "@/components/business/dimension-radar";
import { DimensionScores } from "@/types";
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  TrendingUp,
  Users,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Share2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

export default function PainPointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: painPoint, isLoading, error } = usePainPoint(id);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}已复制到剪贴板`);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("链接已复制到剪贴板");
  };

  if (isLoading) {
    return <PainPointDetailSkeleton />;
  }

  if (error || !painPoint) {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">加载失败</h2>
        <p className="text-muted-foreground mb-4">
          无法加载痛点详情，请稍后重试
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
      </div>
    );
  }

  // API 返回的 dimension_scores 是 { urgency: { score, reason }, ... } 格式
  // 需要提取出纯数值用于雷达图和列表组件
  type RawDimensionScore = number | { score: number; reason?: string };
  type RawDimensionScores = Record<string, RawDimensionScore>;
  
  const rawScores: RawDimensionScores = (painPoint.dimension_scores as unknown as RawDimensionScores) || {};
  
  // 处理两种可能的格式：{ urgency: 8 } 或 { urgency: { score: 8, reason: "..." } }
  const extractScore = (value: number | { score: number; reason?: string } | undefined): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && 'score' in value) return value.score;
    return 0;
  };

  const dimensionScores: DimensionScores = {
    urgency: extractScore(rawScores.urgency),
    frequency: extractScore(rawScores.frequency),
    market_size: extractScore(rawScores.market_size),
    monetization: extractScore(rawScores.monetization),
    barrier_to_entry: extractScore(rawScores.barrier_to_entry),
  };

  // 提取评分理由
  const extractReason = (value: number | { score: number; reason?: string } | undefined): string => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object' && 'reason' in value) return value.reason || '';
    return '';
  };

  const dimensionReasons: Record<string, string> = {
    urgency: extractReason(rawScores.urgency),
    frequency: extractReason(rawScores.frequency),
    market_size: extractReason(rawScores.market_size),
    monetization: extractReason(rawScores.monetization),
    barrier_to_entry: extractReason(rawScores.barrier_to_entry),
  };

  // 获取帖子信息
  const post = painPoint.post;
  const subredditName = post?.subreddit?.name || "unknown";
  const sourceUrl = post?.url;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 返回按钮 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            分享
          </Button>
        </div>
      </div>

      {/* Hero 区域 */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 左侧：核心信息 */}
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                <ScoreBadge score={painPoint.total_score} size="lg" />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{painPoint.title}</h1>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {painPoint.industry_code && (
                      <IndustryBadge code={painPoint.industry_code} />
                    )}
                    {painPoint.type_code && (
                      <TypeBadge code={painPoint.type_code} />
                    )}
                    {painPoint.mentioned_competitors?.map((competitor: string) => (
                      <TagBadge key={competitor} tag={competitor} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed">
                {painPoint.description}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {painPoint.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      发现于{" "}
                      {formatDistanceToNow(new Date(painPoint.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>来源: r/{subredditName}</span>
                </div>
              </div>
            </div>

            {/* 右侧：维度雷达图 */}
            <div className="lg:w-80">
              <DimensionRadar scores={dimensionScores} size={280} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：详细分析 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 用户需求 */}
          {painPoint.user_need && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  用户需求分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {painPoint.user_need}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(painPoint.user_need || "", "需求分析")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  复制内容
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 当前解决方案 vs 理想解决方案 */}
          {(painPoint.current_solution || painPoint.ideal_solution) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  解决方案对比
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {painPoint.current_solution && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">当前解决方案</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">
                      {painPoint.current_solution}
                    </p>
                  </div>
                )}
                {painPoint.ideal_solution && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">理想解决方案</h4>
                    <p className="text-sm bg-primary/10 p-3 rounded-md">
                      {painPoint.ideal_solution}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 用户原话/证据 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                用户原话
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {painPoint.quotes && painPoint.quotes.length > 0 ? (
                <div className="space-y-3">
                  {painPoint.quotes.map((quote: string, index: number) => (
                    <blockquote
                      key={index}
                      className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground"
                    >
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">暂无用户原话记录</p>
              )}
            </CardContent>
          </Card>

          {/* 可行动洞察 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                可行动洞察
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {painPoint.actionable_insights && painPoint.actionable_insights.length > 0 ? (
                <ul className="space-y-3">
                  {painPoint.actionable_insights.map((insight: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">暂无可行动洞察</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：决策支持 */}
        <div className="space-y-6">
          {/* 商业潜力评估 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                商业潜力评估
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DimensionList
                scores={dimensionScores}
                reasons={dimensionReasons}
              />
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">综合评分</span>
                  <span className="font-bold text-lg">{painPoint.total_score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">可信度</span>
                  <span className="font-medium">{(painPoint.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">市场规模</span>
                  <span>{getMarketSizeLabel(dimensionScores.market_size)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">准入门槛</span>
                  <span>{getBarrierLabel(dimensionScores.barrier_to_entry)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 目标用户画像 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                目标用户画像
              </CardTitle>
            </CardHeader>
            <CardContent>
              {painPoint.target_personas && painPoint.target_personas.length > 0 ? (
                <ul className="space-y-2">
                  {painPoint.target_personas.map((persona: string, index: number) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {persona}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  暂无目标用户画像描述
                </p>
              )}
            </CardContent>
          </Card>

          {/* 竞品提及 */}
          {painPoint.mentioned_competitors && painPoint.mentioned_competitors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  提及的竞品
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {painPoint.mentioned_competitors.map((competitor: string) => (
                    <TagBadge key={competitor} tag={competitor} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 相关链接 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                原始来源
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceUrl ? (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    查看原始帖子
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">暂无原始来源链接</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getMarketSizeLabel(score: number): string {
  if (score >= 8) return "大型市场";
  if (score >= 6) return "中型市场";
  if (score >= 4) return "小型市场";
  return "利基市场";
}

function getBarrierLabel(score: number): string {
  if (score >= 8) return "门槛较高";
  if (score >= 6) return "中等门槛";
  if (score >= 4) return "门槛较低";
  return "几乎无门槛";
}

function PainPointDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <Skeleton className="h-10 w-24" />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-64 w-80" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}