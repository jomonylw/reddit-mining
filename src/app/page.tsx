"use client";

import { useState, useCallback } from "react";
import { usePainPoints } from "@/hooks/use-pain-points";
import { FilterBar } from "@/components/business/filter-bar";
import { StatsTicker } from "@/components/business/stats-ticker";
import { PainPointCard, PainPointCardSkeleton } from "@/components/business/pain-point-card";
import { PainPointModal } from "@/components/business/pain-point-modal";
import { Button } from "@/components/ui/button";
import { PainPoint, PainPointsQuery, IndustryCode } from "@/types";
import { ChevronLeft, ChevronRight, AlertCircle, Inbox } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const DEFAULT_FILTERS: PainPointsQuery = {
  page: 1,
  limit: 12,
  sort: "total_score",
  order: "desc",
};

export default function HomePage() {
  const [filters, setFilters] = useState<PainPointsQuery>(DEFAULT_FILTERS);
  const [selectedPainPoint, setSelectedPainPoint] = useState<PainPoint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, isError, error } = usePainPoints(filters);

  const painPoints = data?.painPoints || [];
  const pagination = data?.pagination;

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: PainPointsQuery) => {
    setFilters(newFilters);
  }, []);

  // 清除筛选
  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // 打开详情弹窗
  const handleCardClick = useCallback((painPoint: PainPoint) => {
    setSelectedPainPoint(painPoint);
    setIsModalOpen(true);
  }, []);

  // 复制痛点
  const handleCopy = useCallback((_painPoint: PainPoint) => {
    toast.success("已复制到剪贴板");
  }, []);

  // 分页
  const handlePrevPage = () => {
    if (pagination && pagination.page > 1) {
      setFilters((prev) => ({ ...prev, page: prev.page! - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }));
    }
  };

  // 计算统计数据
  const topIndustries = painPoints.reduce((acc, pp) => {
    if (pp.industry_code && !acc.includes(pp.industry_code as IndustryCode)) {
      acc.push(pp.industry_code as IndustryCode);
    }
    return acc;
  }, [] as IndustryCode[]);

  const avgScore =
    painPoints.length > 0
      ? painPoints.reduce((sum, pp) => sum + pp.total_score, 0) / painPoints.length
      : 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">痛点发现</h1>
        <p className="text-muted-foreground">从 Reddit 社区讨论中发现真实的用户痛点</p>
      </div>

      {/* 统计栏 */}
      <StatsTicker
        totalPainPoints={pagination?.total || painPoints.length}
        newToday={0} // TODO: Calculate from API
        topIndustries={topIndustries.slice(0, 3)}
        avgScore={avgScore}
      />

      {/* 筛选栏 */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* 内容区域 */}
      {isLoading ? (
        // 加载状态
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <PainPointCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        // 错误状态
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">加载失败</h3>
          <p className="text-muted-foreground mb-4">{error?.message || "获取数据时发生错误"}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      ) : painPoints.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无痛点数据</h3>
          <p className="text-muted-foreground mb-4">
            {filters.search || filters.industry || filters.type
              ? "没有找到符合条件的痛点，请尝试调整筛选条件"
              : "还没有发现痛点，请先添加 Subreddit 开始挖掘"}
          </p>
          {!filters.search && !filters.industry && !filters.type && (
            <Button asChild>
              <Link href="/subreddits">添加数据源</Link>
            </Button>
          )}
        </div>
      ) : (
        // 痛点列表
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((painPoint) => (
              <PainPointCard
                key={painPoint.id}
                painPoint={painPoint}
                onClick={handleCardClick}
                onCopy={handleCopy}
              />
            ))}
          </div>

          {/* 分页 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {pagination.page} / {pagination.totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages}
              >
                下一页
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* 详情弹窗 */}
      <PainPointModal
        painPoint={selectedPainPoint}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
