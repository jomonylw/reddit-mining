"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  IndustryCode,
  PainPointTypeCode,
  INDUSTRY_NAMES,
  PAIN_POINT_TYPE_NAMES,
  PainPointsQuery,
} from "@/types";

interface FilterBarProps {
  filters: PainPointsQuery;
  onFiltersChange: (filters: PainPointsQuery) => void;
  onClear: () => void;
}

type SortOption = "total_score" | "confidence" | "created_at";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "total_score", label: "评分" },
  { value: "confidence", label: "置信度" },
  { value: "created_at", label: "发布时间" },
];

/**
 * 筛选工具栏组件
 */
export function FilterBar({ filters, onFiltersChange, onClear }: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // 获取已选中的筛选条件
  const activeFilters: { key: string; label: string }[] = [];

  if (filters.industry) {
    activeFilters.push({
      key: "industry",
      label: INDUSTRY_NAMES[filters.industry] || filters.industry,
    });
  }
  if (filters.type) {
    activeFilters.push({
      key: "type",
      label: PAIN_POINT_TYPE_NAMES[filters.type] || filters.type,
    });
  }
  if (filters.sort && filters.sort !== "total_score") {
    const sortLabel = sortOptions.find((o) => o.value === filters.sort)?.label;
    activeFilters.push({
      key: "sort",
      label: `排序: ${sortLabel}`,
    });
  }

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue, page: 1 });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleIndustryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      industry: value === "all" ? undefined : (value as IndustryCode),
      page: 1,
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === "all" ? undefined : (value as PainPointTypeCode),
      page: 1,
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sort: value as SortOption,
      page: 1,
    });
  };

  const handleOrderToggle = () => {
    onFiltersChange({
      ...filters,
      order: filters.order === "asc" ? "desc" : "asc",
    });
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    if (key === "industry") delete newFilters.industry;
    if (key === "type") delete newFilters.type;
    if (key === "sort") newFilters.sort = "total_score";
    onFiltersChange({ ...newFilters, page: 1 });
  };

  const hasActiveFilters = activeFilters.length > 0 || filters.search;

  return (
    <div className="space-y-3">
      {/* 主筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索痛点..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                onFiltersChange({ ...filters, search: undefined, page: 1 });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="清除搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 行业筛选 */}
        <Select value={filters.industry || "all"} onValueChange={handleIndustryChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="行业" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部行业</SelectItem>
            {Object.entries(INDUSTRY_NAMES).map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 更多筛选 */}
        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              更多筛选
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">筛选条件</h4>

              {/* 痛点类型 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">痛点类型</label>
                <Select value={filters.type || "all"} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {Object.entries(PAIN_POINT_TYPE_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 排序 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">排序方式</label>
                <div className="flex gap-2">
                  <Select value={filters.sort || "total_score"} onValueChange={handleSortChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOrderToggle}
                    title={filters.order === "asc" ? "升序" : "降序"}
                  >
                    {filters.order === "asc" ? "↑" : "↓"}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onClear();
                  setIsFiltersOpen(false);
                }}
              >
                重置所有筛选
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 已选条件展示 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">已选:</span>

          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              搜索: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setSearchValue("");
                  onFiltersChange({ ...filters, search: undefined, page: 1 });
                }}
              />
            </Badge>
          )}

          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(filter.key)} />
            </Badge>
          ))}

          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
            清除所有
          </Button>
        </div>
      )}
    </div>
  );
}
