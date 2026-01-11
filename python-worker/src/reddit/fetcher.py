"""
Reddit 数据抓取器
负责从 Reddit 抓取帖子并存储到数据库
"""

import re
import html
from typing import List, Dict, Any, Optional
from datetime import datetime

from src.config import settings, get_logger
from src.reddit.client import RedditClient, RedditPost, reddit_client
from src.database.client import (
    get_active_subreddits,
    post_exists,
    insert_post,
    update_post,
    update_subreddit_last_fetched,
)

logger = get_logger(__name__)


class Fetcher:
    """
    Reddit 数据抓取器
    
    负责协调 Reddit 客户端和数据库操作，
    实现完整的数据抓取流程。
    """
    
    def __init__(self, client: Optional[RedditClient] = None):
        """
        初始化抓取器
        
        Args:
            client: Reddit 客户端实例（可选，默认使用全局实例）
        """
        self.client = client or reddit_client
    
    def run_fetch_all(self) -> Dict[str, int]:
        """
        执行完整的抓取任务
        
        遍历所有活跃的 Subreddit，抓取帖子并存储到数据库。
        
        Returns:
            抓取统计信息 {"total": N, "new": M, "updated": K, "skipped": L}
        """
        logger.info("开始执行抓取任务...")
        
        stats = {
            "total": 0,
            "new": 0,
            "updated": 0,
            "skipped": 0,
            "errors": 0,
        }
        
        # 检查 Reddit 客户端是否可用
        if not self.client.is_available():
            logger.warning("Reddit 客户端暂不可用（Token 获取冷却中），跳过抓取任务")
            return stats
        
        # 获取所有活跃的 Subreddit
        subreddits = get_active_subreddits()
        logger.info(f"找到 {len(subreddits)} 个活跃的 Subreddit")
        
        for subreddit in subreddits:
            # 每次抓取前检查客户端是否仍然可用
            if not self.client.is_available():
                logger.warning("Reddit 客户端暂不可用，停止后续抓取")
                break
                
            try:
                subreddit_stats = self.fetch_subreddit(subreddit)
                
                # 累加统计
                for key in ["total", "new", "updated", "skipped"]:
                    stats[key] += subreddit_stats.get(key, 0)
                    
            except Exception as e:
                logger.error(f"抓取 r/{subreddit['name']} 失败: {e}")
                stats["errors"] += 1
        
        logger.info(
            f"抓取任务完成: "
            f"总计 {stats['total']} 篇, "
            f"新增 {stats['new']} 篇, "
            f"更新 {stats['updated']} 篇, "
            f"跳过 {stats['skipped']} 篇, "
            f"错误 {stats['errors']} 个"
        )
        
        return stats
    
    def fetch_subreddit(self, subreddit: Dict[str, Any]) -> Dict[str, int]:
        """
        抓取单个 Subreddit 的帖子
        
        Args:
            subreddit: Subreddit 配置信息
            
        Returns:
            抓取统计信息
        """
        subreddit_id = subreddit["id"]
        subreddit_name = subreddit["name"]
        posts_limit = subreddit.get("posts_limit", 100)
        fetch_frequency = subreddit.get("fetch_frequency", "daily")
        
        logger.info(f"正在抓取 r/{subreddit_name} (limit={posts_limit}, frequency={fetch_frequency})")
        
        # 根据频率确定时间范围
        time_filter = self._get_time_filter(fetch_frequency)
        
        # 抓取帖子
        posts = self.client.fetch_top_posts(
            subreddit_name=subreddit_name,
            limit=posts_limit,
            time_filter=time_filter,
        )
        
        stats = {
            "total": len(posts),
            "new": 0,
            "updated": 0,
            "skipped": 0,
        }
        
        # 处理每个帖子
        for post in posts:
            try:
                result = self._process_post(post, subreddit_id)
                stats[result] += 1
            except Exception as e:
                logger.warning(f"处理帖子 {post.reddit_id} 失败: {e}")
                stats["skipped"] += 1
        
        # 更新 Subreddit 的最后抓取时间
        update_subreddit_last_fetched(subreddit_id)
        
        logger.info(
            f"r/{subreddit_name} 抓取完成: "
            f"新增 {stats['new']}, 更新 {stats['updated']}, 跳过 {stats['skipped']}"
        )
        
        return stats
    
    def _process_post(self, post: RedditPost, subreddit_id: str) -> str:
        """
        处理单个帖子
        
        Args:
            post: Reddit 帖子数据
            subreddit_id: 所属 Subreddit ID
            
        Returns:
            处理结果: "new", "updated", 或 "skipped"
        """
        # 检查是否已存在
        exists = post_exists(post.reddit_id)
        
        # 清洗内容
        cleaned_content = self._build_content(post)
        
        if exists:
            # 更新已存在的帖子
            update_post(
                reddit_id=post.reddit_id,
                score=post.score,
                num_comments=post.num_comments,
                content=cleaned_content,
            )
            return "updated"
        else:
            # 插入新帖子
            insert_post(
                subreddit_id=subreddit_id,
                reddit_id=post.reddit_id,
                title=self.clean_text(post.title),
                content=cleaned_content,
                author=post.author,
                url=post.url,
                score=post.score,
                num_comments=post.num_comments,
                reddit_created_at=post.reddit_created_at,
            )
            return "new"
    
    def _build_content(self, post: RedditPost) -> str:
        """
        构建帖子内容（包含正文和评论）
        
        Args:
            post: Reddit 帖子数据
            
        Returns:
            清洗后的完整内容
        """
        parts = []
        
        # 添加正文
        if post.content:
            cleaned_body = self.clean_text(post.content)
            if cleaned_body:
                parts.append(f"【正文】\n{cleaned_body}")
        
        # 添加评论
        if post.top_comments:
            cleaned_comments = []
            for i, comment in enumerate(post.top_comments, 1):
                cleaned = self.clean_text(comment)
                if cleaned:
                    cleaned_comments.append(f"评论{i}: {cleaned}")
            
            if cleaned_comments:
                parts.append(f"【热门评论】\n" + "\n".join(cleaned_comments))
        
        return "\n\n".join(parts) if parts else ""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        清洗文本内容
        
        - 解码 HTML 实体
        - 移除 HTML 标签
        - 移除 Reddit Markdown 链接
        - 移除多余空白字符
        - 移除常见的无用内容
        
        Args:
            text: 原始文本
            
        Returns:
            清洗后的文本
        """
        if not text:
            return ""
        
        # 解码 HTML 实体
        text = html.unescape(text)
        
        # 移除 HTML 标签
        text = re.sub(r'<[^>]+>', '', text)
        
        # 移除 Reddit Markdown 链接 [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        
        # 移除纯 URL
        text = re.sub(r'https?://\S+', '', text)
        
        # 移除 Reddit 特殊格式
        text = re.sub(r'&amp;#x200B;', '', text)  # 零宽空格
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # 粗体
        text = re.sub(r'\*([^*]+)\*', r'\1', text)  # 斜体
        text = re.sub(r'~~([^~]+)~~', r'\1', text)  # 删除线
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)  # 标题
        text = re.sub(r'^[>\s]+', '', text, flags=re.MULTILINE)  # 引用
        text = re.sub(r'^[-*]\s+', '', text, flags=re.MULTILINE)  # 列表项
        
        # 移除多余空白
        text = re.sub(r'\n{3,}', '\n\n', text)  # 多个换行 -> 两个换行
        text = re.sub(r'[ \t]+', ' ', text)  # 多个空格 -> 一个空格
        text = text.strip()
        
        return text
    
    def _get_time_filter(self, frequency: str) -> str:
        """
        根据抓取频率确定时间范围
        
        Args:
            frequency: 抓取频率 (hourly, daily, weekly)
            
        Returns:
            时间过滤器 (hour, day, week, month, year, all)
        """
        mapping = {
            "hourly": "hour",
            "daily": "day",
            "weekly": "week",
        }
        return mapping.get(frequency, "day")


# 全局抓取器实例
fetcher = Fetcher()