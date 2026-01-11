import { cn } from "@/lib/utils";
import { IndustryCode, PainPointTypeCode, INDUSTRY_NAMES, PAIN_POINT_TYPE_NAMES } from "@/types";

/**
 * 行业标签颜色配置
 */
const industryColors: Record<IndustryCode, string> = {
  DEV_TOOLS:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  DEVOPS:
    "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
  DATA: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
  SAAS: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  MARKETING:
    "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
  SALES:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
  PRODUCTIVITY:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  FINANCE:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
  HR: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  SECURITY:
    "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  ECOMMERCE:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
  COMMUNICATION:
    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  DESIGN:
    "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:border-fuchsia-800",
  AI_ML:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
  OTHER:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
};

/**
 * 痛点类型标签颜色配置（语义化）
 */
const painPointTypeColors: Record<PainPointTypeCode, string> = {
  MISSING_FEATURE:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800", // 高优先级
  POOR_UX:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800", // 改进机会
  HIGH_COST:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800", // 替代品机会
  EFFICIENCY:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800", // 效率问题
  INTEGRATION:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800", // 集成问题
  RELIABILITY:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800", // 稳定性问题
  PERFORMANCE:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800", // 性能问题
  LEARNING_CURVE:
    "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800", // 学习曲线
  NO_SOLUTION:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800", // 蓝海机会
  OTHER:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
};

interface IndustryBadgeProps {
  code: IndustryCode;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 行业标签组件
 */
export function IndustryBadge({ code, size = "md", className }: IndustryBadgeProps) {
  const name = INDUSTRY_NAMES[code] || code;
  const colorClass = industryColors[code] || industryColors.OTHER;

  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        colorClass,
        sizeClass,
        className
      )}
    >
      {name}
    </span>
  );
}

interface TypeBadgeProps {
  code: PainPointTypeCode;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 痛点类型标签组件
 */
export function TypeBadge({ code, size = "md", className }: TypeBadgeProps) {
  const name = PAIN_POINT_TYPE_NAMES[code] || code;
  const colorClass = painPointTypeColors[code] || painPointTypeColors.OTHER;

  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        colorClass,
        sizeClass,
        className
      )}
    >
      {name}
    </span>
  );
}

interface TagBadgeProps {
  tag: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 通用标签组件
 */
export function TagBadge({ tag, size = "md", className }: TagBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
        sizeClass,
        className
      )}
    >
      {tag}
    </span>
  );
}
