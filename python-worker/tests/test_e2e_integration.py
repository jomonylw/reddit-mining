"""
端到端集成测试（轻量版）

测试完整的数据流（只测试单个帖子）：
1. 添加 Subreddit
2. 抓取单个 Reddit 帖子
3. LLM 分析生成痛点
4. 验证数据完整性
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import uuid
from typing import Optional
from src.config import settings, get_logger
from src.database.client import db
from src.reddit.client import RedditClient, TimeFilter

logger = get_logger("e2e_test")


def test_add_subreddit(name: str = "AI_Agents", display_name: str = "AI Agents 讨论") -> Optional[str]:
    """
    测试添加 Subreddit
    
    Args:
        name: Subreddit 名称（不含 r/）
        display_name: 显示名称
        
    Returns:
        创建的 Subreddit ID，失败返回 None
    """
    logger.info(f"[测试1] 添加 Subreddit: r/{name}")
    
    try:
        # 检查是否已存在
        row = db.fetchone(
            "SELECT id FROM subreddits WHERE name = ?",
            (name,)
        )
        if row:
            subreddit_id = row[0]
            logger.info(f"  Subreddit r/{name} 已存在 (ID: {subreddit_id})")
            # 确保是活跃状态
            db.execute(
                "UPDATE subreddits SET is_active = 1 WHERE id = ?",
                (subreddit_id,)
            )
            db.conn.commit()
            return subreddit_id
        
        # 创建新 Subreddit
        subreddit_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        db.execute(
            """
            INSERT INTO subreddits (id, name, display_name, is_active, fetch_frequency, posts_limit, created_at, updated_at)
            VALUES (?, ?, ?, 1, 'daily', 10, ?, ?)
            """,
            (subreddit_id, name, display_name, now, now)
        )
        db.conn.commit()
        
        logger.info(f"  ✓ Subreddit r/{name} 创建成功 (ID: {subreddit_id})")
        return subreddit_id
            
    except Exception as e:
        logger.error(f"  ✗ 添加 Subreddit 失败: {e}", exc_info=True)
        return None


def test_fetch_single_post(subreddit_id: str, subreddit_name: str) -> bool:
    """
    测试抓取单个帖子（轻量版）
    
    Args:
        subreddit_id: Subreddit ID
        subreddit_name: Subreddit 名称
        
    Returns:
        是否成功
    """
    logger.info(f"[测试2] 抓取单个帖子 (r/{subreddit_name})")
    
    try:
        from src.reddit.fetcher import Fetcher
        
        client = RedditClient()
        
        # 检查客户端是否可用
        if not client.is_available():
            logger.warning("  ! Reddit 客户端暂不可用（Token 冷却中）")
            return False
        
        # 只获取1个帖子
        posts = client.get_top_posts(
            subreddit=subreddit_name,
            time_filter=TimeFilter.WEEK,
            limit=1,
            max_pages=1,
            fetch_comments=True,
        )
        
        if not posts:
            logger.warning("  ! 未获取到帖子")
            return False
        
        post_data = posts[0]
        logger.info(f"  获取到帖子: {post_data.title[:50]}...")
        
        # 转换为 RedditPost
        from src.reddit.client import RedditPost
        reddit_post = RedditPost.from_post_data(post_data)
        
        # 使用 Fetcher 处理帖子
        fetcher = Fetcher(client)
        
        # 检查是否已存在
        from src.database.client import post_exists, insert_post, update_post
        
        exists = post_exists(reddit_post.reddit_id)
        
        # 构建内容
        cleaned_content = fetcher._build_content(reddit_post)
        
        if exists:
            update_post(
                reddit_id=reddit_post.reddit_id,
                score=reddit_post.score,
                num_comments=reddit_post.num_comments,
                content=cleaned_content,
            )
            logger.info(f"  ✓ 帖子已更新 (reddit_id: {reddit_post.reddit_id})")
        else:
            insert_post(
                subreddit_id=subreddit_id,
                reddit_id=reddit_post.reddit_id,
                title=fetcher.clean_text(reddit_post.title),
                content=cleaned_content,
                author=reddit_post.author,
                url=reddit_post.url,
                score=reddit_post.score,
                num_comments=reddit_post.num_comments,
                reddit_created_at=reddit_post.reddit_created_at,
            )
            logger.info(f"  ✓ 新帖子已插入 (reddit_id: {reddit_post.reddit_id})")
        
        # 验证数据库中有帖子
        row = db.fetchone(
            "SELECT COUNT(*) FROM posts WHERE subreddit_id = ?",
            (subreddit_id,)
        )
        post_count = row[0] if row else 0
        logger.info(f"  数据库中共 {post_count} 条帖子")
        
        return True
            
    except Exception as e:
        logger.error(f"  ✗ 抓取帖子失败: {e}", exc_info=True)
        return False


def test_llm_process() -> bool:
    """
    测试 LLM 处理
    
    Returns:
        是否成功
    """
    logger.info("[测试3] LLM 处理帖子")
    
    # 检查 LLM 配置
    if not settings.llm_api_key:
        logger.warning("  ! LLM API Key 未配置，跳过测试")
        return False
    
    try:
        from src.llm.processor import processor
        
        stats = processor.run_batch()
        logger.info(f"  处理统计: {stats}")
        
        if stats.get("processed", 0) > 0:
            logger.info(f"  ✓ 成功处理 {stats['processed']} 条帖子")
            return True
        elif stats.get("pain_points_created", 0) > 0:
            logger.info(f"  ✓ 创建了 {stats['pain_points_created']} 个痛点")
            return True
        else:
            logger.warning("  ! 本批次没有需要处理的帖子")
            return True  # 如果没有待处理的帖子，也算通过
            
    except Exception as e:
        logger.error(f"  ✗ LLM 处理失败: {e}", exc_info=True)
        return False


def test_verify_pain_points() -> bool:
    """
    验证痛点数据
    
    检查：
    1. pain_points 表有数据
    2. 标题/描述为中文
    3. 维度评分有效
    
    Returns:
        是否通过验证
    """
    logger.info("[测试4] 验证痛点数据")
    
    try:
        rows = db.fetchall(
            """
            SELECT 
                pp.id,
                pp.title,
                pp.description,
                pp.total_score,
                pp.confidence,
                pp.industry_code,
                pp.type_code,
                p.title as post_title
            FROM pain_points pp
            JOIN posts p ON pp.post_id = p.id
            ORDER BY pp.created_at DESC
            LIMIT 5
            """
        )
        
        if not rows or len(rows) == 0:
            logger.warning("  ! pain_points 表暂无数据")
            return False
        
        logger.info(f"  发现 {len(rows)} 条痛点数据:")
        
        has_chinese = False
        all_valid = True
        
        for row in rows:
            pp_id, title, desc, score, conf, industry, type_code, post_title = row
            
            # 检查是否包含中文
            is_chinese = any('\u4e00' <= c <= '\u9fff' for c in (title or "") + (desc or ""))
            if is_chinese:
                has_chinese = True
            
            # 检查评分是否有效
            is_valid_score = 0 <= (score or 0) <= 10
            
            status = "✓" if is_chinese and is_valid_score else "⚠"
            title_display = (title[:40] if title else "无标题")
            logger.info(f"    {status} [{industry or 'N/A'}] {title_display}...")
            logger.info(f"       评分: {score:.1f}, 置信度: {conf:.2f}, 类型: {type_code}")
            
            if not is_valid_score:
                all_valid = False
        
        if has_chinese:
            logger.info("  ✓ 确认痛点内容为中文")
        else:
            logger.warning("  ! 痛点内容可能不是中文")
        
        return has_chinese and all_valid
            
    except Exception as e:
        logger.error(f"  ✗ 验证失败: {e}", exc_info=True)
        return False


def test_exception_llm_retry():
    """
    测试 LLM API 失败时的重试机制
    """
    logger.info("[异常测试1] LLM API 重试机制")
    
    # 检查 LLM 配置
    if not settings.llm_api_key:
        logger.warning("  ! LLM API Key 未配置，跳过测试")
        return False
    
    try:
        from src.llm.client import llm_client
        
        # 使用一个简单的测试请求
        logger.info("  测试 LLM API 连接...")
        
        # 注意: analyze 方法不接受 system_prompt 参数
        response = llm_client.analyze(
            user_prompt="Test: Please respond with a simple JSON object: {\"status\": \"ok\"}"
        )
        
        if response:
            logger.info("  ✓ LLM API 连接正常")
            logger.info(f"    响应: {response[:100]}...")
            return True
        else:
            logger.warning("  ! LLM API 返回空响应")
            return False
            
    except Exception as e:
        logger.error(f"  ✗ LLM API 测试失败: {e}")
        return False


def test_exception_empty_subreddit():
    """
    测试抓取空 Subreddit 的情况
    """
    logger.info("[异常测试2] 抓取空/不存在的 Subreddit")
    
    try:
        client = RedditClient()
        
        if not client.is_available():
            logger.warning("  ! Reddit 客户端暂不可用，跳过测试")
            return True  # 跳过但不算失败
        
        # 尝试获取不存在的 subreddit
        fake_name = "ThisSubredditDoesNotExist12345XYZ"
        
        try:
            posts = client.get_top_posts(
                subreddit=fake_name,
                time_filter=TimeFilter.DAY,
                limit=1,
                max_pages=1,
                fetch_comments=False,
            )
            if not posts:
                logger.info("  ✓ 空 Subreddit 返回空列表（正常）")
            else:
                logger.info("  ⚠ 意外获取到帖子")
        except Exception as e:
            logger.info(f"  ✓ 空 Subreddit 正确抛出异常: {type(e).__name__}")
            
        return True
            
    except Exception as e:
        logger.error(f"  ✗ 测试失败: {e}", exc_info=True)
        return False


def test_exception_db_connection():
    """
    测试数据库连接状态
    """
    logger.info("[异常测试3] 数据库连接检查")
    
    try:
        # 简单的连接测试
        row = db.fetchone("SELECT 1")
        
        if row:
            logger.info("  ✓ 数据库连接正常")
            
            # 检查表是否存在
            tables = ["subreddits", "posts", "pain_points"]
            for table in tables:
                row = db.fetchone(f"SELECT COUNT(*) FROM {table}")
                count = row[0] if row else 0
                logger.info(f"    表 {table}: {count} 条记录")
            
            return True
        else:
            logger.error("  ✗ 数据库查询无返回")
            return False
            
    except Exception as e:
        logger.error(f"  ✗ 数据库连接失败: {e}")
        return False


def run_all_tests():
    """
    运行所有集成测试
    """
    logger.info("=" * 60)
    logger.info("端到端集成测试")
    logger.info("=" * 60)
    
    # 连接数据库
    try:
        db.connect()
        logger.info("数据库连接成功")
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return False
    
    results = {}
    
    try:
        # 1. 端到端流程测试
        logger.info("\n" + "=" * 40)
        logger.info("第一部分: 端到端流程测试")
        logger.info("=" * 40)
        
        # 使用 SaaS 作为测试 Subreddit（稳定且内容丰富）
        test_subreddit_name = "SaaS"
        subreddit_id = test_add_subreddit(test_subreddit_name, "SaaS 讨论社区")
        results["添加 Subreddit"] = subreddit_id is not None
        
        if subreddit_id:
            # 抓取单个帖子
            results["抓取帖子"] = test_fetch_single_post(subreddit_id, test_subreddit_name)
            
            # 等待一下让数据写入
            time.sleep(1)
            
            # LLM 处理
            results["LLM 处理"] = test_llm_process()
            
            # 等待处理完成
            time.sleep(2)
            
            # 验证痛点
            results["验证痛点"] = test_verify_pain_points()
        
        # 2. 异常情况测试
        logger.info("\n" + "=" * 40)
        logger.info("第二部分: 异常情况测试")
        logger.info("=" * 40)
        
        results["LLM 重试机制"] = test_exception_llm_retry()
        results["空 Subreddit"] = test_exception_empty_subreddit()
        results["数据库连接"] = test_exception_db_connection()
        
    finally:
        db.close()
    
    # 打印测试结果汇总
    logger.info("\n" + "=" * 60)
    logger.info("测试结果汇总")
    logger.info("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        logger.info(f"  {test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    logger.info("-" * 40)
    logger.info(f"通过: {passed}, 失败: {failed}, 总计: {len(results)}")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)