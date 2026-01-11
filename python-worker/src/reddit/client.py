"""
Reddit API 客户端
使用 requests 库直接调用 Reddit OAuth2 API
"""

import os
import json
import time
from dataclasses import dataclass, field, fields
from enum import Enum
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

import requests
from requests.auth import HTTPBasicAuth

from src.config import settings, get_logger

logger = get_logger(__name__)


# --- Enums ---

class TimeFilter(str, Enum):
    """Top 帖子的时间过滤选项"""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"
    ALL = "all"


# --- Data Classes ---

@dataclass
class PostData:
    """
    Reddit 帖子数据结构
    包含 API 返回的主要字段
    """
    # 帖子核心内容
    id: Optional[str] = None
    title: Optional[str] = None
    selftext: Optional[str] = None
    url: Optional[str] = None
    permalink: Optional[str] = None
    is_self: Optional[bool] = None
    
    # 作者信息
    author: Optional[str] = None
    author_fullname: Optional[str] = None
    
    # Subreddit 信息
    subreddit: Optional[str] = None
    subreddit_id: Optional[str] = None
    subreddit_name_prefixed: Optional[str] = None
    subreddit_subscribers: Optional[int] = None
    
    # 帖子元数据
    name: Optional[str] = None  # fullname (e.g., t3_abc123)
    created: Optional[float] = None
    created_utc: Optional[float] = None
    edited: Any = None  # Can be bool or float
    over_18: Optional[bool] = None
    spoiler: Optional[bool] = None
    locked: Optional[bool] = None
    stickied: Optional[bool] = None
    archived: Optional[bool] = None
    is_video: Optional[bool] = None
    
    # 投票和分数
    score: Optional[int] = None
    ups: Optional[int] = None
    downs: Optional[int] = None
    upvote_ratio: Optional[float] = None
    
    # 评论和互动
    num_comments: Optional[int] = None
    num_crossposts: Optional[int] = None
    
    # Flair
    link_flair_text: Optional[str] = None
    link_flair_background_color: Optional[str] = None
    
    # 奖励
    gilded: Optional[int] = None
    total_awards_received: Optional[int] = None
    
    # 媒体
    thumbnail: Optional[str] = None
    domain: Optional[str] = None
    is_reddit_media_domain: Optional[bool] = None
    
    # 用于存储获取的评论
    top_comments: List[str] = field(default_factory=list)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PostData":
        """从字典创建 PostData 对象，自动处理缺失的键"""
        field_names = {f.name for f in fields(cls)}
        return cls(**{
            k: data.get(k) for k in field_names if k != 'top_comments'
        })
    
    def get_full_url(self) -> str:
        """获取完整的帖子 URL"""
        if self.permalink:
            return f"https://www.reddit.com{self.permalink}"
        return ""
    
    def get_created_at_iso(self) -> str:
        """获取 ISO 格式的创建时间"""
        if self.created_utc:
            return datetime.utcfromtimestamp(self.created_utc).isoformat()
        return ""


@dataclass
class RedditPost:
    """简化的 Reddit 帖子数据结构（用于 fetcher 兼容）"""
    reddit_id: str
    title: str
    content: Optional[str]
    author: Optional[str]
    url: str
    score: int
    num_comments: int
    reddit_created_at: str
    subreddit_name: str
    top_comments: List[str]
    
    @classmethod
    def from_post_data(cls, post: PostData) -> "RedditPost":
        """从 PostData 转换"""
        content = None
        if post.is_self and post.selftext:
            if post.selftext not in ["[removed]", "[deleted]"]:
                content = post.selftext
        
        author = post.author
        if author in ["[deleted]", "[removed]"]:
            author = None
        
        return cls(
            reddit_id=post.id or "",
            title=post.title or "",
            content=content,
            author=author,
            url=post.get_full_url(),
            score=post.score or 0,
            num_comments=post.num_comments or 0,
            reddit_created_at=post.get_created_at_iso(),
            subreddit_name=post.subreddit or "",
            top_comments=post.top_comments,
        )


# --- Reddit Client ---

class RedditClient:
    """
    Reddit API 客户端
    
    使用 requests 库直接调用 Reddit OAuth2 API，
    支持 token 缓存和自动刷新。
    """
    
    _OAUTH_URL = "https://oauth.reddit.com"
    _TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
    _TOKEN_FILE = ".reddit_token.json"
    _TOKEN_RETRY_DELAY = 300  # Token 获取失败后的重试间隔（秒）
    
    def __init__(self):
        """初始化 Reddit 客户端"""
        self.app_id = settings.reddit_client_id
        self.app_secret = settings.reddit_client_secret
        self.user_agent = settings.reddit_user_agent
        
        self.access_token: Optional[str] = None
        self._token_fetch_failed_at: Optional[float] = None  # Token 获取失败时间
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})
        
        # 尝试从缓存加载 token
        self._load_token()
    
    def _get_token_file_path(self) -> str:
        """获取 token 文件路径"""
        # 使用相对于 python-worker 目录的路径
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(base_dir, self._TOKEN_FILE)
    
    def _save_token(self, token_data: Dict[str, Any]):
        """保存 token 到文件"""
        expires_in = token_data.get("expires_in", 3600)
        token_data["expires_at"] = time.time() + expires_in
        
        try:
            token_path = self._get_token_file_path()
            with open(token_path, "w") as f:
                json.dump(token_data, f)
            logger.debug(f"Token 已保存到 {token_path}")
        except IOError as e:
            logger.warning(f"无法保存 token 文件: {e}")
    
    def _load_token(self):
        """从文件加载 token"""
        token_path = self._get_token_file_path()
        
        if not os.path.exists(token_path):
            return
        
        try:
            with open(token_path, "r") as f:
                token_data = json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            logger.warning(f"无法加载 token 文件: {e}")
            return
        
        # 检查 token 是否过期（提前 60 秒刷新）
        if time.time() < token_data.get("expires_at", 0) - 60:
            self.access_token = token_data.get("access_token")
            logger.info("从缓存加载 token 成功")
        else:
            logger.info("缓存的 token 已过期")
    
    def _get_new_token(self) -> bool:
        """
        获取新的 access token
        
        Returns:
            成功返回 True，失败返回 False
        """
        # 检查是否在冷却期内（避免频繁请求被 block）
        if self._token_fetch_failed_at:
            elapsed = time.time() - self._token_fetch_failed_at
            if elapsed < self._TOKEN_RETRY_DELAY:
                remaining = int(self._TOKEN_RETRY_DELAY - elapsed)
                logger.warning(f"Token 获取冷却中，请等待 {remaining} 秒后重试")
                return False
        
        logger.info("正在获取新的 Reddit access token...")
        
        if not self.app_id or not self.app_secret:
            logger.error("Reddit API 凭证未配置")
            return False
        
        auth = HTTPBasicAuth(self.app_id, self.app_secret)
        data = {"grant_type": "client_credentials"}
        
        try:
            response = self.session.post(
                self._TOKEN_URL,
                auth=auth,
                data=data,
                timeout=15,
            )
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data.get("access_token")
            
            if self.access_token:
                self._save_token(token_data)
                self._token_fetch_failed_at = None  # 清除失败标记
                logger.info("成功获取并保存新 token")
                return True
            else:
                logger.error("API 响应中未找到 access_token")
                self._token_fetch_failed_at = time.time()
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"获取 token 失败: {e}")
            self.access_token = None
            self._token_fetch_failed_at = time.time()  # 记录失败时间
            return False
    
    def _ensure_token(self):
        """确保有有效的 access token"""
        if not self.access_token:
            self._get_new_token()
    
    def is_available(self) -> bool:
        """
        检查客户端是否可用（有有效 token 或可以获取新 token）
        """
        if self.access_token:
            return True
        
        # 检查是否在冷却期
        if self._token_fetch_failed_at:
            elapsed = time.time() - self._token_fetch_failed_at
            if elapsed < self._TOKEN_RETRY_DELAY:
                return False
        
        return True
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        retries: int = 1,
    ) -> Dict[str, Any]:
        """
        发送认证后的 API 请求
        
        Args:
            method: HTTP 方法
            endpoint: API 端点
            params: 查询参数
            retries: 重试次数
            
        Returns:
            响应 JSON 数据
        """
        self._ensure_token()
        
        if not self.access_token:
            raise ConnectionError("无法获取有效的 Reddit access token")
        
        url = f"{self._OAUTH_URL}{endpoint}"
        headers = {"Authorization": f"bearer {self.access_token}"}
        
        # 添加 raw_json 参数
        if params is None:
            params = {}
        params["raw_json"] = 1
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 401 and retries > 0:
                logger.warning("Token 已过期，正在刷新...")
                self._get_new_token()
                return self._make_request(method, endpoint, params, retries - 1)
            else:
                logger.error(f"HTTP 错误: {url} - {e}")
                raise
                
        except requests.exceptions.RequestException as e:
            logger.error(f"请求错误: {url} - {e}")
            raise
    
    def get_top_posts(
        self,
        subreddit: str,
        time_filter: TimeFilter = TimeFilter.DAY,
        limit: int = 100,
        max_pages: int = 1,
        fetch_comments: bool = True,
    ) -> List[PostData]:
        """
        获取 Subreddit 的 Top 帖子（支持分页）
        
        Args:
            subreddit: Subreddit 名称
            time_filter: 时间过滤器
            limit: 每页数量（最大 100）
            max_pages: 最大页数
            fetch_comments: 是否获取评论
            
        Returns:
            帖子列表
        """
        all_posts: List[PostData] = []
        after: Optional[str] = None
        
        for page_num in range(max_pages):
            logger.info(f"获取 r/{subreddit} Top 帖子 (页 {page_num + 1}/{max_pages})")
            
            endpoint = f"/r/{subreddit}/top"
            params: Dict[str, Any] = {
                "t": time_filter.value,
                "limit": min(limit, 100),
            }
            if after:
                params["after"] = after
            
            response_json = self._make_request("GET", endpoint, params=params)
            
            data = response_json.get("data", {})
            children = data.get("children", [])
            
            if not children:
                logger.info("没有更多帖子")
                break
            
            for child in children:
                if child.get("kind") == "t3":
                    post = PostData.from_dict(child["data"])
                    if fetch_comments and post.id:
                        post.top_comments = self._fetch_top_comments(subreddit, post.id)
                    all_posts.append(post)
            
            after = data.get("after")
            if not after:
                logger.info("已到达最后一页")
                break
        
        logger.info(f"成功获取 {len(all_posts)} 个帖子 from r/{subreddit}")
        return all_posts
    
    def get_new_posts(
        self,
        subreddit: str,
        limit: int = 100,
        max_pages: int = 1,
        fetch_comments: bool = True,
    ) -> List[PostData]:
        """获取 Subreddit 的最新帖子"""
        all_posts: List[PostData] = []
        after: Optional[str] = None
        
        for page_num in range(max_pages):
            logger.info(f"获取 r/{subreddit} 最新帖子 (页 {page_num + 1}/{max_pages})")
            
            endpoint = f"/r/{subreddit}/new"
            params: Dict[str, Any] = {"limit": min(limit, 100)}
            if after:
                params["after"] = after
            
            response_json = self._make_request("GET", endpoint, params=params)
            
            data = response_json.get("data", {})
            children = data.get("children", [])
            
            if not children:
                break
            
            for child in children:
                if child.get("kind") == "t3":
                    post = PostData.from_dict(child["data"])
                    if fetch_comments and post.id:
                        post.top_comments = self._fetch_top_comments(subreddit, post.id)
                    all_posts.append(post)
            
            after = data.get("after")
            if not after:
                break
        
        logger.info(f"成功获取 {len(all_posts)} 个帖子 from r/{subreddit}")
        return all_posts
    
    def get_hot_posts(
        self,
        subreddit: str,
        limit: int = 100,
        max_pages: int = 1,
        fetch_comments: bool = True,
    ) -> List[PostData]:
        """获取 Subreddit 的热门帖子"""
        all_posts: List[PostData] = []
        after: Optional[str] = None
        
        for page_num in range(max_pages):
            logger.info(f"获取 r/{subreddit} 热门帖子 (页 {page_num + 1}/{max_pages})")
            
            endpoint = f"/r/{subreddit}/hot"
            params: Dict[str, Any] = {"limit": min(limit, 100)}
            if after:
                params["after"] = after
            
            response_json = self._make_request("GET", endpoint, params=params)
            
            data = response_json.get("data", {})
            children = data.get("children", [])
            
            if not children:
                break
            
            for child in children:
                if child.get("kind") == "t3":
                    post = PostData.from_dict(child["data"])
                    if fetch_comments and post.id:
                        post.top_comments = self._fetch_top_comments(subreddit, post.id)
                    all_posts.append(post)
            
            after = data.get("after")
            if not after:
                break
        
        logger.info(f"成功获取 {len(all_posts)} 个帖子 from r/{subreddit}")
        return all_posts
    
    def _fetch_top_comments(
        self,
        subreddit: str,
        post_id: str,
        limit: int = 10,
        include_replies: bool = True,
    ) -> List[str]:
        """
        获取帖子的 Top 评论（包括嵌套回复）
        
        Args:
            subreddit: Subreddit 名称
            post_id: 帖子 ID
            limit: 获取数量上限（默认 10）
            include_replies: 是否包含嵌套回复
            
        Returns:
            评论内容列表（带层级缩进）
        """
        comments: List[str] = []
        
        try:
            endpoint = f"/r/{subreddit}/comments/{post_id}"
            params = {
                "limit": 100,  # 获取足够多的评论以便筛选
                "sort": "top",
                # 不设置 depth，获取所有层级
            }
            
            data = self._make_request("GET", endpoint, params=params)
            
            # 响应是 [帖子, 评论] 数组
            if not isinstance(data, list) or len(data) < 2:
                return comments
            
            comments_data = data[1]
            if "data" not in comments_data or "children" not in comments_data["data"]:
                return comments
            
            # 收集所有评论（包括嵌套）
            all_comments: List[tuple] = []
            
            for child in comments_data["data"]["children"]:
                if child.get("kind") != "t1":
                    continue
                
                # 递归提取评论及其回复
                all_comments.extend(
                    self._extract_comments_recursive(
                        child["data"],
                        include_replies=include_replies,
                        depth=0,
                    )
                )
            
            # 按分数排序取前 N 个
            all_comments.sort(key=lambda x: x[0], reverse=True)
            comments = [text for _, text in all_comments[:limit]]
            
        except Exception as e:
            logger.debug(f"获取评论失败 (post_id={post_id}): {e}")
        
        return comments
    
    def _extract_comments_recursive(
        self,
        comment_data: dict,
        include_replies: bool = True,
        depth: int = 0,
    ) -> List[tuple]:
        """
        递归提取评论及其回复
        
        Args:
            comment_data: 评论数据
            include_replies: 是否包含回复
            depth: 当前深度
            
        Returns:
            (score, formatted_text) 的列表
        """
        results: List[tuple] = []
        
        body = comment_data.get("body", "")
        score = comment_data.get("score", 0)
        
        # 过滤删除的评论
        if body in ["[deleted]", "[removed]"]:
            return results
        
        # 格式化评论（添加层级缩进）
        if depth == 0:
            formatted = body
        else:
            indent = "→ " * depth
            formatted = f"{indent}{body}"
        
        results.append((score, formatted))
        
        # 递归处理回复
        if include_replies:
            replies = comment_data.get("replies", {})
            if isinstance(replies, dict) and "data" in replies:
                for child in replies["data"].get("children", []):
                    if child.get("kind") == "t1":
                        results.extend(
                            self._extract_comments_recursive(
                                child["data"],
                                include_replies=include_replies,
                                depth=depth + 1,
                            )
                        )
        
        return results
    
    # --- 兼容旧接口 ---
    
    def fetch_top_posts(
        self,
        subreddit_name: str,
        limit: int = 100,
        time_filter: Literal["hour", "day", "week", "month", "year", "all"] = "day",
    ) -> List[RedditPost]:
        """兼容旧接口：获取 Top 帖子"""
        tf = TimeFilter(time_filter)
        posts = self.get_top_posts(subreddit_name, tf, limit)
        return [RedditPost.from_post_data(p) for p in posts]
    
    def fetch_new_posts(
        self,
        subreddit_name: str,
        limit: int = 100,
    ) -> List[RedditPost]:
        """兼容旧接口：获取最新帖子"""
        posts = self.get_new_posts(subreddit_name, limit)
        return [RedditPost.from_post_data(p) for p in posts]
    
    def fetch_hot_posts(
        self,
        subreddit_name: str,
        limit: int = 100,
    ) -> List[RedditPost]:
        """兼容旧接口：获取热门帖子"""
        posts = self.get_hot_posts(subreddit_name, limit)
        return [RedditPost.from_post_data(p) for p in posts]


# 全局客户端实例
reddit_client = RedditClient()