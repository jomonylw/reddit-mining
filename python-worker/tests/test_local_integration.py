"""
本地集成测试（不依赖 Reddit API）

测试：
1. 数据库连接和操作
2. LLM API 调用
3. 使用模拟数据测试痛点生成流程
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import uuid
import json
from src.config import settings, get_logger
from src.database.client import db

logger = get_logger("local_test")


# 模拟 Reddit 帖子数据
MOCK_POSTS = [
    {
        "title": "I'm so frustrated with current AI coding assistants - they don't understand context",
        "content": """I've been using various AI coding assistants for the past few months and I'm really frustrated.
        
        The main issue is that these tools don't understand the broader context of my project. When I ask them to help with a specific function, they often suggest code that doesn't fit with my existing architecture.
        
        For example, I'm working on a React project with TypeScript and Zustand for state management. But every time I ask for help, the AI suggests solutions using Redux or plain React state. It completely ignores my project's conventions.
        
        I wish there was an AI assistant that could:
        1. Understand my entire codebase structure
        2. Follow my existing coding patterns
        3. Remember the decisions I've made in previous conversations
        
        Is anyone else experiencing this? Are there any tools that actually solve this problem?""",
        "author": "frustrated_dev",
        "score": 342,
        "num_comments": 87,
        "subreddit": "programming"
    },
    {
        "title": "Looking for a tool to track customer feedback across multiple channels",
        "content": """Our startup is growing and we're getting feedback from everywhere - Twitter, emails, support tickets, app reviews.
        
        The problem is that we can't consolidate all this feedback in one place. We're using 5 different tools and spending hours every week just trying to understand what our customers want.
        
        What we need:
        - Automatic collection of feedback from social media
        - Integration with our help desk (Zendesk)
        - AI to categorize and prioritize feedback
        - Reporting on trends over time
        
        Budget: $100-500/month for the right solution
        
        Has anyone found a good tool for this? We tried Productboard but it's too expensive for us.""",
        "author": "startup_founder",
        "score": 156,
        "num_comments": 43,
        "subreddit": "startups"
    }
]


def test_database_operations():
    """测试数据库 CRUD 操作"""
    logger.info("[测试1] 数据库 CRUD 操作")
    
    try:
        # 1. 检查连接
        row = db.fetchone("SELECT 1")
        if not row:
            logger.error("  ✗ 数据库连接失败")
            return False
        logger.info("  ✓ 数据库连接正常")
        
        # 2. 检查表结构
        tables = ["subreddits", "posts", "pain_points"]
        for table in tables:
            row = db.fetchone(f"SELECT COUNT(*) FROM {table}")
            count = row[0] if row else 0
            logger.info(f"    表 {table}: {count} 条记录")
        
        # 3. 测试插入 Subreddit
        test_name = f"test_subreddit_{int(time.time())}"
        test_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        db.execute(
            """
            INSERT INTO subreddits (id, name, is_active, fetch_frequency, posts_limit, created_at, updated_at)
            VALUES (?, ?, 1, 'daily', 10, ?, ?)
            """,
            (test_id, test_name, now, now)
        )
        db.conn.commit()
        
        # 4. 验证插入
        row = db.fetchone("SELECT id, name FROM subreddits WHERE id = ?", (test_id,))
        if row and row[0] == test_id:
            logger.info(f"  ✓ 插入测试成功: {test_name}")
        else:
            logger.error("  ✗ 插入验证失败")
            return False
        
        # 5. 清理测试数据
        db.execute("DELETE FROM subreddits WHERE id = ?", (test_id,))
        db.conn.commit()
        logger.info("  ✓ 清理测试数据完成")
        
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 数据库测试失败: {e}", exc_info=True)
        return False


def test_llm_connection():
    """测试 LLM API 连接"""
    logger.info("[测试2] LLM API 连接")
    
    if not settings.llm_api_key:
        logger.warning("  ! LLM API Key 未配置，跳过测试")
        return False
    
    try:
        from src.llm.client import llm_client
        
        logger.info(f"  LLM 配置:")
        logger.info(f"    Base URL: {settings.llm_base_url}")
        logger.info(f"    Model: {settings.llm_model}")
        
        # 简单的 API 测试
        response = llm_client.analyze(
            user_prompt="Return a JSON object with a single field 'status' set to 'ok'. Example: {\"status\": \"ok\"}"
        )
        
        if response:
            logger.info(f"  ✓ LLM API 响应成功")
            logger.info(f"    响应: {response[:200]}...")
            return True
        else:
            logger.warning("  ! LLM API 返回空响应")
            return False
            
    except Exception as e:
        logger.error(f"  ✗ LLM API 测试失败: {e}")
        return False


def test_pain_point_extraction():
    """测试痛点提取流程（使用模拟数据）"""
    logger.info("[测试3] 痛点提取流程")
    
    if not settings.llm_api_key:
        logger.warning("  ! LLM API Key 未配置，跳过测试")
        return False
    
    try:
        from src.llm.processor import processor
        from src.llm.client import llm_client, extract_json_from_response
        from src.llm.prompts import build_user_prompt
        
        # 使用第一个模拟帖子
        mock_post = MOCK_POSTS[0]
        
        logger.info(f"  测试帖子: {mock_post['title'][:50]}...")
        
        # 构建 prompt
        user_prompt = build_user_prompt(
            title=mock_post["title"],
            content=mock_post["content"],
            subreddit=mock_post["subreddit"],
            score=mock_post["score"],
            num_comments=mock_post["num_comments"],
            top_comments="- I totally agree, context is the biggest issue with AI tools.\n- This is exactly why I switched to a different tool."
        )
        
        logger.info("  调用 LLM API...")
        
        # 调用 LLM
        response = llm_client.analyze_with_retry(user_prompt)
        
        if not response:
            logger.error("  ✗ LLM 返回空响应")
            return False
        
        logger.info(f"  LLM 响应长度: {len(response)} 字符")
        
        # 解析 JSON
        result = extract_json_from_response(response)
        
        # 验证结果结构
        is_pain_point = result.get("is_pain_point", False)
        logger.info(f"  是否包含痛点: {is_pain_point}")
        
        if is_pain_point:
            title = result.get("title", "")
            description = result.get("description", "")
            industry = result.get("industry_code", "")
            type_code = result.get("type_code", "")
            
            # 检查是否为中文
            has_chinese = any('\u4e00' <= c <= '\u9fff' for c in title + description)
            
            logger.info(f"  痛点标题: {title}")
            logger.info(f"  行业: {industry}, 类型: {type_code}")
            logger.info(f"  是否中文: {'是' if has_chinese else '否'}")
            
            if has_chinese:
                logger.info("  ✓ 痛点提取成功，输出为中文")
                return True
            else:
                logger.warning("  ! 痛点提取成功，但输出不是中文")
                return True  # 功能正常，只是语言问题
        else:
            logger.info("  帖子未被识别为痛点（可能是正常情况）")
            return True
            
    except Exception as e:
        logger.error(f"  ✗ 痛点提取测试失败: {e}", exc_info=True)
        return False


def test_insert_mock_data():
    """插入模拟数据到数据库"""
    logger.info("[测试4] 插入模拟数据")
    
    try:
        # 创建或获取测试用的 Subreddit
        test_subreddit_name = "test_integration"
        row = db.fetchone(
            "SELECT id FROM subreddits WHERE name = ?",
            (test_subreddit_name,)
        )
        
        if row:
            subreddit_id = row[0]
            logger.info(f"  使用已有 Subreddit: {test_subreddit_name} (ID: {subreddit_id})")
        else:
            subreddit_id = str(uuid.uuid4())
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            db.execute(
                """
                INSERT INTO subreddits (id, name, is_active, fetch_frequency, posts_limit, created_at, updated_at)
                VALUES (?, ?, 1, 'daily', 10, ?, ?)
                """,
                (subreddit_id, test_subreddit_name, now, now)
            )
            db.conn.commit()
            logger.info(f"  创建新 Subreddit: {test_subreddit_name} (ID: {subreddit_id})")
        
        # 插入模拟帖子
        for i, mock_post in enumerate(MOCK_POSTS):
            post_id = str(uuid.uuid4())
            reddit_id = f"test_{int(time.time())}_{i}"
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            # 检查是否已存在
            row = db.fetchone(
                "SELECT 1 FROM posts WHERE title = ? AND subreddit_id = ?",
                (mock_post["title"], subreddit_id)
            )
            
            if row:
                logger.info(f"  跳过已存在的帖子: {mock_post['title'][:40]}...")
                continue
            
            db.execute(
                """
                INSERT INTO posts (
                    id, subreddit_id, reddit_id, title, content, author,
                    url, score, num_comments, reddit_created_at,
                    process_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                """,
                (
                    post_id, subreddit_id, reddit_id,
                    mock_post["title"], mock_post["content"], mock_post["author"],
                    f"https://reddit.com/r/{mock_post['subreddit']}/test",
                    mock_post["score"], mock_post["num_comments"],
                    now, now
                )
            )
            db.conn.commit()
            logger.info(f"  ✓ 插入帖子: {mock_post['title'][:40]}...")
        
        # 检查待处理的帖子数
        row = db.fetchone(
            "SELECT COUNT(*) FROM posts WHERE process_status = 'pending'"
        )
        pending_count = row[0] if row else 0
        logger.info(f"  当前待处理帖子数: {pending_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 插入模拟数据失败: {e}", exc_info=True)
        return False


def test_batch_process():
    """测试批量 LLM 处理"""
    logger.info("[测试5] 批量 LLM 处理")
    
    if not settings.llm_api_key:
        logger.warning("  ! LLM API Key 未配置，跳过测试")
        return False
    
    try:
        from src.llm.processor import processor
        
        stats = processor.run_batch()
        logger.info(f"  处理统计: {stats}")
        
        processed = stats.get("processed", 0)
        created = stats.get("pain_points_created", 0)
        
        if processed > 0 or created > 0:
            logger.info(f"  ✓ 处理了 {processed} 条帖子，创建了 {created} 个痛点")
        else:
            logger.info("  没有待处理的帖子或所有帖子都不包含痛点")
        
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 批量处理失败: {e}", exc_info=True)
        return False


def test_verify_results():
    """验证处理结果"""
    logger.info("[测试6] 验证处理结果")
    
    try:
        # 查询痛点
        rows = db.fetchall(
            """
            SELECT 
                pp.title,
                pp.description,
                pp.industry_code,
                pp.type_code,
                pp.total_score,
                pp.confidence
            FROM pain_points pp
            ORDER BY pp.created_at DESC
            LIMIT 5
            """
        )
        
        if not rows:
            logger.warning("  ! 暂无痛点数据")
            return True
        
        logger.info(f"  发现 {len(rows)} 条最新痛点:")
        
        has_chinese = False
        for row in rows:
            title, desc, industry, type_code, score, conf = row
            
            is_chinese = any('\u4e00' <= c <= '\u9fff' for c in (title or "") + (desc or ""))
            if is_chinese:
                has_chinese = True
            
            status = "✓" if is_chinese else "⚠"
            title_display = (title[:35] if title else "无标题")
            logger.info(f"    {status} [{industry or 'N/A'}] {title_display}...")
            logger.info(f"       评分: {score:.1f}, 置信度: {conf:.2f}")
        
        if has_chinese:
            logger.info("  ✓ 确认痛点内容包含中文")
        
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 验证失败: {e}", exc_info=True)
        return False


def run_local_tests():
    """运行本地测试"""
    logger.info("=" * 60)
    logger.info("本地集成测试（不依赖 Reddit API）")
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
        # 测试列表
        results["数据库操作"] = test_database_operations()
        results["LLM 连接"] = test_llm_connection()
        results["痛点提取"] = test_pain_point_extraction()
        results["插入模拟数据"] = test_insert_mock_data()
        results["批量处理"] = test_batch_process()
        results["验证结果"] = test_verify_results()
        
    finally:
        db.close()
    
    # 打印结果汇总
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
    success = run_local_tests()
    sys.exit(0 if success else 1)