import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScoreBadgeProps {
  score: number;
  confidence?: number; // 置信度 (0-1 范围)
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showConfidence?: boolean;
  className?: string;
}

/**
 * 获取置信度颜色类名
 * 置信度颜色方案：
 * - 90-100%: 翠绿色（高度可信）
 * - 75-89%: 绿色（较可信）
 * - 50-74%: 橙色（中等可信）
 * - 0-49%: 红色（低可信度）
 */
function getConfidenceColorClasses(confidence: number): string {
  const percent = confidence * 100;
  if (percent >= 90) {
    return "text-emerald-600 dark:text-emerald-400";
  } else if (percent >= 75) {
    return "text-green-600 dark:text-green-400";
  } else if (percent >= 50) {
    return "text-amber-600 dark:text-amber-400";
  } else {
    return "text-red-600 dark:text-red-400";
  }
}

/**
 * 获取置信度描述
 */
function getConfidenceLabel(confidence: number): string {
  const percent = confidence * 100;
  if (percent >= 90) {
    return "高度可信";
  } else if (percent >= 75) {
    return "较可信";
  } else if (percent >= 50) {
    return "中等可信";
  } else {
    return "低可信度";
  }
}

/**
 * 评分徽章组件
 * 根据分数显示不同颜色：>8 绿色, >5 黄色, ≤5 红色
 * 支持显示置信度，置信度使用不同颜色区分范围
 */
export function ScoreBadge({
  score,
  confidence,
  size = "md",
  showIcon = true,
  showConfidence = false,
  className,
}: ScoreBadgeProps) {
  // 确保分数在 0-10 范围内
  const normalizedScore = Math.min(10, Math.max(0, score));

  // 确保置信度在 0-1 范围内
  const normalizedConfidence =
    confidence !== undefined ? Math.min(1, Math.max(0, confidence)) : undefined;

  // 根据分数确定颜色
  const getColorClasses = () => {
    if (normalizedScore > 8) {
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
    } else if (normalizedScore > 5) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800";
    } else {
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
    }
  };

  // 根据尺寸确定样式
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xs px-1.5 py-0.5 gap-0.5";
      case "lg":
        return "text-base px-3 py-1.5 gap-1.5";
      default:
        return "text-sm px-2 py-1 gap-1";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3";
      case "lg":
        return "h-5 w-5";
      default:
        return "h-4 w-4";
    }
  };

  const confidenceElement = showConfidence && normalizedConfidence !== undefined && (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("font-medium", getConfidenceColorClasses(normalizedConfidence))}>
            {Math.round(normalizedConfidence * 100)}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>置信度: {getConfidenceLabel(normalizedConfidence)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        getColorClasses(),
        getSizeClasses(),
        className
      )}
    >
      {showIcon && <Star className={cn(getIconSize(), "fill-current")} />}
      <span>{normalizedScore.toFixed(1)}</span>
      {confidenceElement && (
        <>
          <span className="opacity-50">·</span>
          {confidenceElement}
        </>
      )}
    </span>
  );
}
