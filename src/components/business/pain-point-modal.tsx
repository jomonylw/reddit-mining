"use client";

import { PainPoint, IndustryCode, PainPointTypeCode } from "@/types";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "./score-badge";
import { IndustryBadge, TypeBadge } from "./type-badge";
import { PainPointDetail, PainPointStatsBar, PainPointDescription } from "./pain-point-detail";
import { ExternalLink, Copy, Share2, X } from "lucide-react";
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
export function PainPointModal({ painPoint, open, onOpenChange }: PainPointModalProps) {
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

  const post = painPoint.post;
  const subredditName = post?.subreddit?.name || "unknown";
  const sourceUrl = post?.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-screen h-screen max-w-none rounded-none border-0 sm:w-[95vw] sm:max-w-5xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:border p-0 overflow-hidden flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* Fixed Header - 更紧凑 */}
        <div className="flex items-center gap-2.5 sm:gap-4 px-3 py-2 sm:px-5 sm:py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0">
          <div className="shrink-0 scale-75 sm:scale-100 origin-left">
            <ScoreBadge score={painPoint.total_score} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base sm:text-lg font-bold leading-tight tracking-tight text-foreground line-clamp-1">
              {painPoint.title}
            </DialogTitle>
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
              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-3 py-3 sm:px-5 sm:py-4 space-y-3 sm:space-y-4">
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
        </div>

        {/* Fixed Footer - 更紧凑 */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-t bg-muted/10 flex justify-end gap-2 shrink-0">
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
      </DialogContent>
    </Dialog>
  );
}
