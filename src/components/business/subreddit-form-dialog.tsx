"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Subreddit } from "@/types";
import { useCreateSubreddit, useUpdateSubreddit } from "@/hooks/use-subreddits";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SubredditFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subreddit?: Subreddit | null;
}

const FETCH_FREQUENCIES = [
  { value: "hourly", label: "每小时" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
];

const POSTS_LIMITS = [10, 25, 50, 100];

export function SubredditFormDialog({
  open,
  onOpenChange,
  subreddit,
}: SubredditFormDialogProps) {
  const isEditing = !!subreddit;
  
  // 使用 useMemo 计算初始值，避免在 effect 中调用 setState
  const initialFormData = useMemo(() => {
    if (subreddit) {
      return {
        name: subreddit.name,
        display_name: subreddit.display_name || "",
        description: subreddit.description || "",
        is_active: subreddit.is_active,
        fetch_frequency: subreddit.fetch_frequency,
        posts_limit: subreddit.posts_limit,
      };
    }
    return {
      name: "",
      display_name: "",
      description: "",
      is_active: true,
      fetch_frequency: "daily",
      posts_limit: 25,
    };
  }, [subreddit]);

  const [formData, setFormData] = useState(initialFormData);

  // 当 subreddit 变化时重置表单（通过 key 重新挂载组件更好，但这里使用简单方式）
  const formKey = subreddit?.id || "new";

  const createMutation = useCreateSubreddit();
  const updateMutation = useUpdateSubreddit();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // 当对话框打开时重置表单
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(initialFormData);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("请输入 Subreddit 名称");
      return;
    }

    try {
      if (isEditing && subreddit) {
        await updateMutation.mutateAsync({
          id: subreddit.id,
          data: formData,
        });
        toast.success("Subreddit 更新成功");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Subreddit 添加成功");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "更新失败，请重试" : "添加失败，请重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} key={formKey}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "编辑数据源" : "添加数据源"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "修改 Subreddit 配置信息"
                : "添加新的 Subreddit 作为数据源"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Subreddit 名称 */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Subreddit 名称 <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">r/</span>
                <Input
                  id="name"
                  placeholder="例如: SaaS, startups, Entrepreneur"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value.replace(/^r\//, "") })
                  }
                  disabled={isEditing}
                  className="flex-1"
                />
              </div>
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Subreddit 名称创建后不可修改
                </p>
              )}
            </div>

            {/* 显示名称 */}
            <div className="grid gap-2">
              <Label htmlFor="display_name">显示名称</Label>
              <Input
                id="display_name"
                placeholder="可选，用于界面显示的友好名称"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
              />
            </div>

            {/* 描述 */}
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="可选，简短描述此数据源的用途"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* 抓取频率 */}
            <div className="grid gap-2">
              <Label htmlFor="fetch_frequency">抓取频率</Label>
              <Select
                value={formData.fetch_frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, fetch_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择抓取频率" />
                </SelectTrigger>
                <SelectContent>
                  {FETCH_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 每次抓取帖子数 */}
            <div className="grid gap-2">
              <Label htmlFor="posts_limit">每次抓取帖子数</Label>
              <Select
                value={String(formData.posts_limit)}
                onValueChange={(value) =>
                  setFormData({ ...formData, posts_limit: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择帖子数量" />
                </SelectTrigger>
                <SelectContent>
                  {POSTS_LIMITS.map((limit) => (
                    <SelectItem key={limit} value={String(limit)}>
                      {limit} 条
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">启用数据源</Label>
                <p className="text-xs text-muted-foreground">
                  停用后将不再抓取此 Subreddit 的数据
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "保存更改" : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}