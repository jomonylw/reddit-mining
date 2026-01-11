"use client";

import { useParams, useRouter } from "next/navigation";
import { usePainPoint } from "@/hooks/use-pain-points";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/business/score-badge";
import { IndustryBadge, TypeBadge } from "@/components/business/type-badge";
import {
  PainPointDetail,
  PainPointStatsBar,
  PainPointDescription,
} from "@/components/business/pain-point-detail";
import { IndustryCode, PainPointTypeCode } from "@/types";
import { ArrowLeft, AlertTriangle, ExternalLink, Copy, Share2 } from "lucide-react";
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
        <p className="text-muted-foreground mb-4">无法加载痛点详情，请稍后重试</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
      </div>
    );
  }

  // 获取帖子信息
  const post = painPoint.post;
  const subredditName = post?.subreddit?.name || "unknown";
  const sourceUrl = post?.url;

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header - 与 Modal 保持一致的布局 */}
      <Card className="border-t-4 border-t-primary mb-4">
        <CardContent className="p-0">
          {/* Fixed Header - 与 Modal 一致 */}
          <div className="flex items-center gap-2.5 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4 border-b bg-background/95">
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button> */}
            <div className="shrink-0">
              <ScoreBadge score={painPoint.total_score} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight tracking-tight text-foreground line-clamp-2 sm:line-clamp-1">
                {painPoint.title}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 hidden sm:flex">
                {painPoint.industry_code && (
                  <IndustryBadge code={painPoint.industry_code as IndustryCode} size="sm" />
                )}
                {painPoint.type_code && (
                  <TypeBadge code={painPoint.type_code as PainPointTypeCode} size="sm" />
                )}
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-xs text-muted-foreground">r/{subredditName}</span>
                {painPoint.created_at && (
                  <>
                    <span className="text-muted-foreground mx-1">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(painPoint.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Area - 与 Modal 一致 */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4">
            {/* Mobile Tags - 移动端显示的标签 */}
            <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
              {painPoint.industry_code && (
                <IndustryBadge code={painPoint.industry_code as IndustryCode} size="sm" />
              )}
              {painPoint.type_code && (
                <TypeBadge code={painPoint.type_code as PainPointTypeCode} size="sm" />
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">r/{subredditName}</span>
            </div>

            {/* Stats bar - 紧凑的统计信息条 */}
            <PainPointStatsBar painPoint={painPoint} />

            {/* Description - 紧凑的描述区域 */}
            <PainPointDescription description={painPoint.description} />

            {/* Main content - 使用可复用组件 */}
            <PainPointDetail
              painPoint={painPoint}
              layout="compact"
              showRadar={true}
              radarSize={250}
            />
          </div>

          {/* Fixed Footer - 与 Modal 一致 */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t bg-muted/10 flex justify-end gap-2">
            {sourceUrl && (
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium" asChild>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  查看原文
                </a>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() =>
                handleCopy(
                  `${painPoint.title}\n\n${painPoint.description}\n\n用户需求: ${painPoint.user_need || "无"}\n\n可行动洞察:\n${painPoint.actionable_insights?.join("\n") || "无"}`,
                  "痛点信息"
                )
              }
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              复制信息
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PainPointDetailSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-0">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 px-6 py-4 border-b">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>

          {/* Content skeleton */}
          <div className="px-6 py-5 space-y-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-lg" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
              <div className="lg:col-span-5 space-y-3">
                <Skeleton className="h-80 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="px-6 py-4 border-t flex justify-end gap-2">
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
