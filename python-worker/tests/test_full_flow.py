"""
完整流程测试脚本

测试目标：验证从 Subreddit 添加 -> 帖子抓取 -> LLM 分析 -> 结果入库的完整数据流
测试范围：单个 Subreddit (r/SaaS)，限制抓取 3 个帖子
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import uuid
from src.config import settings, get_logger
from src.database.client import db
from src.reddit.client import RedditClient, TimeFilter
from src.reddit.fetcher import Fetcher
from src.llm.processor import processor

logger = get_logger("test_full_flow")

def test_full_flow():
    logger.info("============================================================")
    logger.info("开始执行完整流程测试")
    logger.info("============================================================")
    
    subreddit_name = "SaaS"
    subreddit_desc = "SaaS 讨论社区"
    limit = 3
    
    # 1. 添加/获取 Subreddit
    logger.info(f"\n[步骤 1] 准备 Subreddit: r/{subreddit_name}")
    
    # 检查是否存在
    row = db.fetchone("SELECT id FROM subreddits WHERE name = ?", (subreddit_name,))
    if row:
        subreddit_id = row[0]
        logger.info(f"  Subreddit 已存在 (ID: {subreddit_id})")
        # 更新配置以确保测试一致性
        db.execute(
            "UPDATE subreddits SET posts_limit = ?, fetch_frequency = 'daily', is_active = 1 WHERE id = ?",
            (limit, subreddit_id)
        )
        db.conn.commit()
    else:
        subreddit_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        db.execute(
            """
            INSERT INTO subreddits (id, name, description, is_active, fetch_frequency, posts_limit, created_at, updated_at)
            VALUES (?, ?, ?, 1, 'daily', ?, ?, ?)
            """,
            (subreddit_id, subreddit_name, subreddit_desc, limit, now, now)
        )
        db.conn.commit()
        logger.info(f"  创建新 Subreddit (ID: {subreddit_id})")

    # 2. 抓取帖子
    logger.info(f"\n[步骤 2] 抓取帖子 (限制 {limit} 条)")
    
    client = RedditClient()
    if not client.is_available():
        logger.error("  Reddit 客户端不可用（Token 冷却中），测试终止")
        return False
        
    fetcher = Fetcher(client)
    
    # 手动执行抓取逻辑，以便精确控制
    logger.info(f"  正在从 r/{subreddit_name} 获取 Top {limit} 帖子...")
    posts = client.get_top_posts(
        subreddit=subreddit_name,
        time_filter=TimeFilter.WEEK, # 使用本周热门，保证有内容
        limit=limit,
        max_pages=1,
        fetch_comments=True,
    )
    
    if not posts:
        logger.error("  未获取到任何帖子，测试终止")
        return False
        
    logger.info(f"  成功获取 {len(posts)} 个帖子数据")
    
    # 处理并入库
    processed_count = 0
    new_posts_ids = []
    
    from src.reddit.client import RedditPost
    from src.database.client import post_exists, update_post, insert_post
    
    for post_data in posts:
        try:
            reddit_post = RedditPost.from_post_data(post_data)
            logger.info(f"  处理帖子: {reddit_post.title[:30]}... (reddit_id: {reddit_post.reddit_id})")
            
            # 使用项目中的 post_exists 函数检查帖子是否存在
            logger.info(f"    检查帖子是否存在...")
            exists = post_exists(reddit_post.reddit_id)
            logger.info(f"    post_exists 返回: {exists}")
            
            # 使用项目中的 fetcher 清洗内容
            logger.info(f"    构建清洗内容...")
            cleaned_content = fetcher._build_content(reddit_post)
            logger.info(f"    内容清洗完成 (长度: {len(cleaned_content) if cleaned_content else 0})")
            
            if exists:
                # 使用项目中的 update_post 函数更新帖子
                logger.info(f"    调用 update_post...")
                update_post(
                    reddit_id=reddit_post.reddit_id,
                    score=reddit_post.score,
                    num_comments=reddit_post.num_comments,
                    content=cleaned_content,
                )
                logger.info(f"    update_post 成功")
                result = "updated"
            else:
                # 使用项目中的 insert_post 函数插入新帖子
                logger.info(f"    调用 insert_post (subreddit_id={subreddit_id})...")
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
                logger.info(f"    insert_post 成功")
                result = "new"
            
            # 获取帖子 ID
            logger.info(f"    查询帖子 ID...")
            row = db.fetchone("SELECT id FROM posts WHERE reddit_id = ?", (reddit_post.reddit_id,))
            if row:
                post_id = row[0]
                logger.info(f"    帖子 ID: {post_id}")
                new_posts_ids.append(post_id)
                
                # 强制将状态重置为 pending，确保后续 LLM 分析步骤能处理它
                logger.info(f"    更新帖子状态为 pending...")
                db.execute(
                    "UPDATE posts SET process_status = 'pending' WHERE id = ?",
                    (post_id,)
                )
                logger.info(f"    状态更新成功")
                
                # 先删除关联的 pain_point_tags (如果有)
                logger.info(f"    查询并清理关联的痛点...")
                pain_point_rows = db.fetchall(
                    "SELECT id FROM pain_points WHERE post_id = ?",
                    (post_id,)
                )
                for pp_row in pain_point_rows:
                    pp_id = pp_row[0]
                    logger.info(f"      删除 pain_point_tags (pain_point_id: {pp_id})...")
                    db.execute(
                        "DELETE FROM pain_point_tags WHERE pain_point_id = ?",
                        (pp_id,)
                    )
                
                # 然后删除 pain_points
                logger.info(f"    删除 pain_points...")
                db.execute(
                    "DELETE FROM pain_points WHERE post_id = ?",
                    (post_id,)
                )
                logger.info(f"    痛点清理成功")
                
                logger.info(f"    提交事务...")
                db.conn.commit()
                logger.info(f"    事务提交成功")
                
                action = "插入新帖子" if result == "new" else "更新帖子"
                logger.info(f"  {action}: {reddit_post.title[:30]}... (ID: {post_id})")
                processed_count += 1
            else:
                logger.error(f"  帖子入库失败: {reddit_post.title[:30]}...")
            
        except Exception as e:
            logger.error(f"  处理帖子失败: {e}")
            
    logger.info(f"  入库完成，共 {processed_count} 个待处理帖子")

    # 3. LLM 分析
    logger.info(f"\n[步骤 3] LLM 分析 (处理 {len(new_posts_ids)} 个帖子)")
    
    # 确保只处理我们刚刚抓取的帖子
    # 这里我们直接调用 process_single 来处理指定的帖子，而不是 run_batch
    # 这样可以避免处理到其他积压的帖子
    
    success_count = 0
    pain_points_count = 0
    
    for post_id in new_posts_ids:
        # 获取完整帖子数据
        cursor = db.execute(
            """
            SELECT p.*, s.name as subreddit_name
            FROM posts p
            JOIN subreddits s ON p.subreddit_id = s.id
            WHERE p.id = ?
            """,
            (post_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            logger.error(f"  无法读取帖子数据: {post_id}")
            continue
            
        # 转换为字典
        columns = [desc[0] for desc in cursor.description]
        post = dict(zip(columns, row))
        
        logger.info(f"  正在分析: {post['title'][:30]}...")
        try:
            result = processor.process_single(post)
            logger.info(f"  分析结果: {result}")
            
            if result == "pain_point":
                pain_points_count += 1
            
            if result != "failed":
                success_count += 1
                
        except Exception as e:
            logger.error(f"  分析失败: {e}")

    # 4. 验证结果
    logger.info(f"\n[步骤 4] 结果验证")
    
    # 验证帖子状态
    pending_count = db.fetchone(
        f"SELECT COUNT(*) FROM posts WHERE id IN ({','.join(['?']*len(new_posts_ids))}) AND process_status = 'pending'",
        tuple(new_posts_ids)
    )[0]
    
    completed_count = db.fetchone(
        f"SELECT COUNT(*) FROM posts WHERE id IN ({','.join(['?']*len(new_posts_ids))}) AND process_status != 'pending'",
        tuple(new_posts_ids)
    )[0]
    
    logger.info(f"  帖子处理状态: 完成 {completed_count}, 待处理 {pending_count}")
    
    # 验证痛点数据
    if pain_points_count > 0:
        logger.info(f"  发现 {pain_points_count} 个痛点，验证数据完整性...")
        
        rows = db.fetchall(
            f"""
            SELECT pp.title, pp.confidence, pp.total_score, pp.industry_code, pp.type_code
            FROM pain_points pp
            JOIN posts p ON pp.post_id = p.id
            WHERE p.id IN ({','.join(['?']*len(new_posts_ids))})
            """,
            tuple(new_posts_ids)
        )
        
        for i, row in enumerate(rows, 1):
            logger.info(f"    痛点 {i}: {row[0]}")
            logger.info(f"      置信度: {row[1]}, 总分: {row[2]}")
            logger.info(f"      行业: {row[3]}, 类型: {row[4]}")
            
            if not (row[0] and row[1] and row[2]):
                logger.error("      数据不完整！")
                return False
    else:
        logger.info("  本次测试未发现痛点 (这是可能的，取决于帖子内容)")

    logger.info("\n============================================================")
    if success_count == len(new_posts_ids):
        logger.info("测试成功！所有步骤执行正常")
        return True
    else:
        logger.warning(f"测试完成，但有 {len(new_posts_ids) - success_count} 个帖子处理失败")
        return False

if __name__ == "__main__":
    try:
        test_full_flow()
    except KeyboardInterrupt:
        print("\n测试已取消")
    except Exception as e:
        logger.error(f"测试发生未捕获异常: {e}", exc_info=True)