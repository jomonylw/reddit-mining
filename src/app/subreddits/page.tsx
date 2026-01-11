"use client";

import { useState } from "react";
import { useSubreddits, useDeleteSubreddit } from "@/hooks/use-subreddits";
import { SubredditFormDialog } from "@/components/business/subreddit-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Subreddit } from "@/types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Database,
  Clock,
  FileText,
} from "lucide-react";

const FETCH_FREQUENCY_LABELS: Record<string, string> = {
  hourly: "每小时",
  daily: "每天",
  weekly: "每周",
};

export default function SubredditsPage() {
  const { data: subreddits, isLoading, error, refetch } = useSubreddits();
  const deleteMutation = useDeleteSubreddit();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSubreddit, setEditingSubreddit] = useState<Subreddit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubreddit, setDeletingSubreddit] = useState<Subreddit | null>(null);

  const handleAdd = () => {
    setEditingSubreddit(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (subreddit: Subreddit) => {
    setEditingSubreddit(subreddit);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (subreddit: Subreddit) => {
    setDeletingSubreddit(subreddit);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubreddit) return;

    try {
      await deleteMutation.mutateAsync(deletingSubreddit.id);
      toast.success("数据源已删除");
      setDeleteDialogOpen(false);
      setDeletingSubreddit(null);
    } catch (error) {
      toast.error("删除失败，请重试");
    }
  };

  const activeCount = subreddits?.filter((s) => s.is_active).length || 0;
  const totalCount = subreddits?.length || 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">数据源管理</h1>
          <p className="text-muted-foreground">
            管理 Reddit Subreddit 数据源配置
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            添加数据源
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总数据源</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              已配置的 Subreddit 数量
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃数据源</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              正在定期抓取数据
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">停用数据源</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {totalCount - activeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              暂停抓取的数据源
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 数据源列表 */}
      <Card>
        <CardHeader>
          <CardTitle>数据源列表</CardTitle>
          <CardDescription>
            配置要监控的 Reddit Subreddit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SubredditsTableSkeleton />
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              加载失败，请刷新重试
            </div>
          ) : subreddits && subreddits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subreddit</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>抓取频率</TableHead>
                  <TableHead>帖子限制</TableHead>
                  <TableHead>最后抓取</TableHead>
                  <TableHead className="w-[70px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subreddits.map((subreddit) => (
                  <TableRow key={subreddit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <a
                            href={`https://reddit.com/r/${subreddit.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            r/{subreddit.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {subreddit.display_name && (
                            <p className="text-sm text-muted-foreground">
                              {subreddit.display_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subreddit.is_active ? (
                        <Badge variant="default" className="bg-green-500">
                          活跃
                        </Badge>
                      ) : (
                        <Badge variant="secondary">已停用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {FETCH_FREQUENCY_LABELS[subreddit.fetch_frequency] ||
                        subreddit.fetch_frequency}
                    </TableCell>
                    <TableCell>{subreddit.posts_limit} 条/次</TableCell>
                    <TableCell>
                      {subreddit.last_fetched_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(subreddit.last_fetched_at),
                            { addSuffix: true, locale: zhCN }
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          从未抓取
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">操作菜单</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(subreddit)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(
                                `https://reddit.com/r/${subreddit.name}`,
                                "_blank"
                              )
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            访问 Reddit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(subreddit)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无数据源</h3>
              <p className="text-muted-foreground mb-4">
                添加 Subreddit 以开始监控用户讨论
              </p>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                添加第一个数据源
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 表单对话框 */}
      <SubredditFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        subreddit={editingSubreddit}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除数据源 r/{deletingSubreddit?.name} 吗？
              此操作不可撤销，相关的帖子和痛点数据不会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubredditsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}