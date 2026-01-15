"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/business/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  {
    name: "痛点发现",
    href: "/",
    icon: BarChart3,
  },
  {
    name: "数据源管理",
    href: "/subreddits",
    icon: Settings,
  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold mr-4 md:mr-8">
          <Search className="h-5 w-5 text-primary" />
          <span>Reddit Mining</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center rounded-md transition-colors",
                      // 移动端：仅图标，与主题切换按钮一致的尺寸
                      "h-9 w-9",
                      // 桌面端：图标+文字
                      "md:h-auto md:w-auto md:px-3 md:py-2",
                      isActive
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <item.icon className="h-4 w-4 md:mr-2 shrink-0" />
                    {/* 文字仅在桌面端显示 */}
                    <span className="hidden md:inline text-sm">{item.name}</span>
                  </Link>
                </TooltipTrigger>
                {/* Tooltip 仅在移动端有意义 */}
                <TooltipContent className="md:hidden">{item.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
