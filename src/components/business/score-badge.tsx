import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

/**
 * 评分徽章组件
 * 根据分数显示不同颜色：>8 绿色, >5 黄色, ≤5 红色
 */
export function ScoreBadge({ 
  score, 
  size = "md", 
  showIcon = true,
  className 
}: ScoreBadgeProps) {
  // 确保分数在 0-10 范围内
  const normalizedScore = Math.min(10, Math.max(0, score));
  
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
    </span>
  );
}