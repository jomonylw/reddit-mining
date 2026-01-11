"""
Turso/LibSQL 数据库客户端
实现数据库连接管理和 CRUD 操作
"""

import libsql_experimental as libsql
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from src.config import settings, get_logger

logger = get_logger(__name__)


class Database:
    """数据库连接管理"""
    
    def __init__(self):
        self._connection = None
    
    def connect(self):
        """建立数据库连接"""
        if self._connection is None:
            logger.info(f"正在连接数据库: {settings.turso_database_url[:50]}...")
            self._connection = libsql.connect(
                database=settings.turso_database_url,
                auth_token=settings.turso_auth_token,
            )
            logger.info("数据库连接成功")
        return self._connection
    
    @property
    def conn(self):
        """获取数据库连接"""
        return self.connect()
    
    def execute(self, sql: str, params: tuple = ()):
        """执行 SQL 语句"""
        return self.conn.execute(sql, params)
    
    def fetchone(self, sql: str, params: tuple = ()):
        """查询单条记录"""
        cursor = self.execute(sql, params)
        return cursor.fetchone()
    
    def fetchall(self, sql: str, params: tuple = ()):
        """查询所有记录"""
        cursor = self.execute(sql, params)
        return cursor.fetchall()
    
    def close(self):
        """关闭数据库连接"""
        if self._connection:
            self._connection.close()
            self._connection = None
            logger.info("数据库连接已关闭")


# 全局数据库实例
db = Database()


# ============================================================================
# Subreddit 相关操作
# ============================================================================

def get_active_subreddits() -> List[Dict[str, Any]]:
    """
    获取所有活跃的 Subreddit 配置
    
    Returns:
        活跃的 Subreddit 列表
    """
    sql = """
        SELECT id, name, display_name, description, is_active,
               fetch_frequency, posts_limit, last_fetched_at,
               created_at, updated_at
        FROM subreddits
        WHERE is_active = 1
        ORDER BY name
    """
    rows = db.fetchall(sql)
    
    result = []
    for row in rows:
        result.append({
            "id": row[0],
            "name": row[1],
            "display_name": row[2],
            "description": row[3],
            "is_active": bool(row[4]),
            "fetch_frequency": row[5],
            "posts_limit": row[6],
            "last_fetched_at": row[7],
            "created_at": row[8],
            "updated_at": row[9],
        })
    
    logger.debug(f"获取到 {len(result)} 个活跃的 Subreddit")
    return result


def get_subreddit_by_name(name: str) -> Optional[Dict[str, Any]]:
    """
    根据名称获取 Subreddit
    
    Args:
        name: Subreddit 名称
        
    Returns:
        Subreddit 信息或 None
    """
    sql = """
        SELECT id, name, display_name, description, is_active,
               fetch_frequency, posts_limit, last_fetched_at,
               created_at, updated_at
        FROM subreddits
        WHERE name = ?
    """
    row = db.fetchone(sql, (name,))
    
    if not row:
        return None
    
    return {
        "id": row[0],
        "name": row[1],
        "display_name": row[2],
        "description": row[3],
        "is_active": bool(row[4]),
        "fetch_frequency": row[5],
        "posts_limit": row[6],
        "last_fetched_at": row[7],
        "created_at": row[8],
        "updated_at": row[9],
    }


def update_subreddit_last_fetched(subreddit_id: str) -> None:
    """
    更新 Subreddit 的最后抓取时间
    
    Args:
        subreddit_id: Subreddit ID
    """
    now = datetime.utcnow().isoformat()
    sql = """
        UPDATE subreddits
        SET last_fetched_at = ?, updated_at = ?
        WHERE id = ?
    """
    db.execute(sql, (now, now, subreddit_id))
    db.conn.commit()
    logger.debug(f"更新 Subreddit {subreddit_id} 的最后抓取时间")


# ============================================================================
# Post 相关操作
# ============================================================================

def post_exists(reddit_id: str) -> bool:
    """
    检查帖子是否已存在
    
    Args:
        reddit_id: Reddit 帖子 ID
        
    Returns:
        是否存在
    """
    sql = "SELECT 1 FROM posts WHERE reddit_id = ?"
    row = db.fetchone(sql, (reddit_id,))
    return row is not None


def insert_post(
    subreddit_id: str,
    reddit_id: str,
    title: str,
    content: Optional[str],
    author: Optional[str],
    url: str,
    score: int,
    num_comments: int,
    reddit_created_at: str,
) -> str:
    """
    插入新帖子
    
    Args:
        subreddit_id: 所属 Subreddit ID
        reddit_id: Reddit 帖子 ID
        title: 帖子标题
        content: 帖子内容
        author: 作者
        url: 帖子 URL
        score: 分数
        num_comments: 评论数
        reddit_created_at: Reddit 创建时间
        
    Returns:
        新插入帖子的 ID
    """
    post_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    sql = """
        INSERT INTO posts (
            id, subreddit_id, reddit_id, title, content, author,
            url, score, num_comments, reddit_created_at,
            process_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    """
    
    db.execute(sql, (
        post_id, subreddit_id, reddit_id, title, content, author,
        url, score, num_comments, reddit_created_at, now
    ))
    db.conn.commit()
    
    logger.debug(f"插入新帖子: {reddit_id} -> {post_id}")
    return post_id


def update_post(
    reddit_id: str,
    score: int,
    num_comments: int,
    content: Optional[str] = None,
) -> None:
    """
    更新已存在的帖子
    
    Args:
        reddit_id: Reddit 帖子 ID
        score: 新的分数
        num_comments: 新的评论数
        content: 更新的内容（可选）
    """
    if content is not None:
        sql = """
            UPDATE posts
            SET score = ?, num_comments = ?, content = ?
            WHERE reddit_id = ?
        """
        db.execute(sql, (score, num_comments, content, reddit_id))
    else:
        sql = """
            UPDATE posts
            SET score = ?, num_comments = ?
            WHERE reddit_id = ?
        """
        db.execute(sql, (score, num_comments, reddit_id))
    
    db.conn.commit()
    logger.debug(f"更新帖子: {reddit_id}")


def get_pending_posts(limit: int = 10) -> List[Dict[str, Any]]:
    """
    获取待处理的帖子
    
    Args:
        limit: 最大返回数量
        
    Returns:
        待处理帖子列表
    """
    sql = """
        SELECT p.id, p.subreddit_id, p.reddit_id, p.title, p.content,
               p.author, p.url, p.score, p.num_comments,
               p.reddit_created_at, p.process_status, p.created_at,
               s.name as subreddit_name
        FROM posts p
        LEFT JOIN subreddits s ON p.subreddit_id = s.id
        WHERE p.process_status = 'pending'
        ORDER BY p.score DESC, p.created_at ASC
        LIMIT ?
    """
    rows = db.fetchall(sql, (limit,))
    
    result = []
    for row in rows:
        result.append({
            "id": row[0],
            "subreddit_id": row[1],
            "reddit_id": row[2],
            "title": row[3],
            "content": row[4],
            "author": row[5],
            "url": row[6],
            "score": row[7],
            "num_comments": row[8],
            "reddit_created_at": row[9],
            "process_status": row[10],
            "created_at": row[11],
            "subreddit_name": row[12],
        })
    
    logger.debug(f"获取到 {len(result)} 个待处理帖子")
    return result


def update_post_status(
    post_id: str,
    status: str,
) -> None:
    """
    更新帖子处理状态
    
    Args:
        post_id: 帖子 ID
        status: 新状态 (pending, processing, completed, no_pain_point, failed, skipped)
    """
    now = datetime.utcnow().isoformat()
    sql = """
        UPDATE posts
        SET process_status = ?, processed_at = ?
        WHERE id = ?
    """
    db.execute(sql, (status, now, post_id))
    db.conn.commit()
    logger.debug(f"更新帖子 {post_id} 状态为 {status}")


# ============================================================================
# PainPoint 相关操作
# ============================================================================

def insert_pain_point(
    post_id: str,
    title: str,
    description: str,
    user_need: Optional[str] = None,
    current_solution: Optional[str] = None,
    ideal_solution: Optional[str] = None,
    mentioned_competitors: Optional[str] = None,
    quotes: Optional[str] = None,
    target_personas: Optional[str] = None,
    actionable_insights: Optional[str] = None,
    industry_code: Optional[str] = None,
    type_code: Optional[str] = None,
    confidence: float = 0.0,
    total_score: float = 0.0,
    score_urgency: int = 0,
    score_frequency: int = 0,
    score_market_size: int = 0,
    score_monetization: int = 0,
    score_barrier_to_entry: int = 0,
    dimension_reasons: Optional[str] = None,
) -> str:
    """
    插入新的痛点数据
    
    Args:
        post_id: 关联的帖子 ID
        title: 痛点标题
        description: 痛点描述
        ... 其他字段
        
    Returns:
        新插入痛点的 ID
    """
    pain_point_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    sql = """
        INSERT INTO pain_points (
            id, post_id, title, description, user_need, current_solution,
            ideal_solution, mentioned_competitors, quotes, target_personas,
            actionable_insights, industry_code, type_code, confidence,
            total_score, score_urgency, score_frequency, score_market_size,
            score_monetization, score_barrier_to_entry, dimension_reasons,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    db.execute(sql, (
        pain_point_id, post_id, title, description, user_need, current_solution,
        ideal_solution, mentioned_competitors, quotes, target_personas,
        actionable_insights, industry_code, type_code, confidence,
        total_score, score_urgency, score_frequency, score_market_size,
        score_monetization, score_barrier_to_entry, dimension_reasons,
        now, now
    ))
    db.conn.commit()
    
    logger.info(f"插入新痛点: {title[:30]}... -> {pain_point_id}")
    return pain_point_id


# ============================================================================
# Tag 相关操作
# ============================================================================

def get_or_create_tag(name: str) -> str:
    """
    获取或创建标签
    
    Args:
        name: 标签名称
        
    Returns:
        标签 ID
    """
    # 先尝试获取
    sql = "SELECT id FROM tags WHERE name = ?"
    row = db.fetchone(sql, (name,))
    
    if row:
        # 更新使用次数
        update_sql = "UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?"
        db.execute(update_sql, (row[0],))
        db.conn.commit()
        return row[0]
    
    # 创建新标签
    tag_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    insert_sql = "INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, 1, ?)"
    db.execute(insert_sql, (tag_id, name, now))
    db.conn.commit()
    
    logger.debug(f"创建新标签: {name} -> {tag_id}")
    return tag_id


def link_pain_point_tag(pain_point_id: str, tag_id: str) -> None:
    """
    关联痛点和标签
    
    Args:
        pain_point_id: 痛点 ID
        tag_id: 标签 ID
    """
    sql = "INSERT OR IGNORE INTO pain_point_tags (pain_point_id, tag_id) VALUES (?, ?)"
    db.execute(sql, (pain_point_id, tag_id))
    db.conn.commit()


# ============================================================================
# 分类数据操作
# ============================================================================

def get_all_industries() -> List[Dict[str, Any]]:
    """
    获取所有行业分类
    
    Returns:
        行业列表
    """
    sql = "SELECT code, name, description, sort_order FROM industries ORDER BY sort_order"
    rows = db.fetchall(sql)
    
    return [
        {
            "code": row[0],
            "name": row[1],
            "description": row[2],
            "sort_order": row[3],
        }
        for row in rows
    ]


def get_all_pain_point_types() -> List[Dict[str, Any]]:
    """
    获取所有痛点类型
    
    Returns:
        痛点类型列表
    """
    sql = "SELECT code, name, description, sort_order FROM pain_point_types ORDER BY sort_order"
    rows = db.fetchall(sql)
    
    return [
        {
            "code": row[0],
            "name": row[1],
            "description": row[2],
            "sort_order": row[3],
        }
        for row in rows
    ]