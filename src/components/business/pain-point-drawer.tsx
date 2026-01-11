"use client";

import { PainPoint, IndustryCode, PainPointTypeCode } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScoreBadge } from "./score-badge";
import { IndustryBadge, TypeBadge } from "./type-badge";
import { DimensionList } from "./dimension-radar";
import { 
  ExternalLink, 
  Copy, 
  Eye, 
  MessageSquare, 
  ThumbsUp,
  Quote,
  User
} from "lucide-react";
import Link from "next/link";

interface PainPointDrawerProps {
  painPoint: PainPoint | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 痛点预览抽屉组件
 */
export function PainPointDrawer({
  painPoint,
  isOpen,
  onClose,
}: PainPointDrawerProps) {
  if (!painPoint) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${painPoint.title}\n\n${painPoint.description}\n\n用户需求: ${painPoint.user_need || "未知"}`
    );
  };

  const handleViewOnReddit = () => {
    if (painPoint.post?.url) {
      window.open(painPoint.post.url, "_blank");
    }
  };

  // 格式化时间
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          {/* 标签和评分 */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              {painPoint.type_code && (
                <TypeBadge code={painPoint.type_code as PainPointTypeCode} />
              )}
              {painPoint.industry_code && (
                <IndustryBadge code={painPoint.industry_code as IndustryCode} />
              )}
            </div>
            <ScoreBadge score={painPoint.total_score} />
          </div>

          <SheetTitle className="text-left text-lg leading-tight">
            {painPoint.title}
          </SheetTitle>
          
          <SheetDescription className="text-left">
            {painPoint.post?.subreddit && (
              <span className="text-xs">
                r/{painPoint.post.subreddit.name} • {formatDate(painPoint.created_at)}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* 核心指标 */}
          {painPoint.post && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                <span>{painPoint.post.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{painPoint.post.num_comments} 评论</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">置信度: {(painPoint.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          <Separator />

          {/* 痛点描述 */}
          <div>
            <h4 className="text-sm font-medium mb-2">痛点描述</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {painPoint.description}
            </p>
          </div>

          {/* 用户需求 */}
          {painPoint.user_need && (
            <div>
              <h4 className="text-sm font-medium mb-2">用户需求</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {painPoint.user_need}
              </p>
            </div>
          )}

          <Separator />

          {/* 维度评分 */}
          {painPoint.dimension_scores && (
            <div>
              <h4 className="text-sm font-medium mb-3">价值维度</h4>
              <DimensionList 
                scores={painPoint.dimension_scores} 
                reasons={painPoint.dimension_reasons as Record<string, string> | undefined}
              />
            </div>
          )}

          <Separator />

          {/* 原帖预览 */}
          {painPoint.post && (
            <div>
              <h4 className="text-sm font-medium mb-2">原帖信息</h4>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium line-clamp-2">
                  {painPoint.post.title}
                </p>
                {painPoint.post.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {painPoint.post.content}
                  </p>
                )}
                {painPoint.post.author && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>u/{painPoint.post.author}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 原文引用 */}
          {painPoint.quotes && painPoint.quotes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Quote className="h-4 w-4" />
                原文引用
              </h4>
              <div className="space-y-2">
                {painPoint.quotes.slice(0, 2).map((quote, index) => (
                  <blockquote
                    key={index}
                    className="border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground italic"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            复制内容
          </Button>
          
          {painPoint.post?.url && (
            <Button variant="outline" className="flex-1" onClick={handleViewOnReddit}>
              <ExternalLink className="h-4 w-4 mr-2" />
              查看原帖
            </Button>
          )}

          <Button asChild className="flex-1">
            <Link href={`/pain-points/${painPoint.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              查看详情
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}