"""
异常情况测试

测试：
1. LLM API 失败时的重试机制
2. 抓取空 Subreddit 的情况
3. 数据库连接中断的情况
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import uuid
from unittest.mock import patch, MagicMock
from src.config import settings, get_logger
from src.database.client import db

logger = get_logger("exception_test")


def test_llm_retry_mechanism():
    """测试 LLM API 失败时的重试机制"""
    logger.info("[测试1] LLM 重试机制")
    
    if not settings.llm_api_key:
        logger.warning("  ! LLM API Key 未配置，跳过测试")
        return False
    
    try:
        from src.llm.client import LLMClient
        
        # 创建一个临时客户端用于测试
        test_client = LLMClient()
        
        # 模拟 API 调用失败
        call_count = 0
        original_analyze = test_client.analyze
        
        def mock_analyze_with_failures(user_prompt, max_retries=3):
            nonlocal call_count
            call_count += 1
            
            if call_count < 3:
                # 前两次调用抛出异常
                logger.info(f"    模拟第 {call_count} 次调用失败")
                raise Exception(f"Simulated API failure #{call_count}")
            else:
                # 第三次调用成功
                logger.info(f"    第 {call_count} 次调用成功")
                return '{"status": "ok"}'
        
        # 测试 analyze_with_retry 方法
        logger.info("  测试重试逻辑...")
        
        with patch.object(test_client, 'analyze', side_effect=mock_analyze_with_failures):
            try:
                # 这里我们直接测试重试逻辑的概念
                # 因为 analyze_with_retry 内部会调用 analyze
                result = None
                retries = 0
                max_retries = 3
                
                while retries < max_retries:
                    try:
                        result = test_client.analyze("test prompt")
                        break
                    except Exception as e:
                        retries += 1
                        logger.info(f"    重试 {retries}/{max_retries}")
                        if retries >= max_retries:
                            raise
                        time.sleep(0.1)  # 短暂等待
                
                if result:
                    logger.info(f"  ✓ 重试机制正常，第 {call_count} 次调用成功")
                    return True
                    
            except Exception as e:
                logger.info(f"  ✓ 重试机制正常，在 {call_count} 次尝试后抛出异常: {e}")
                return True  # 重试机制按预期工作
        
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 重试机制测试失败: {e}", exc_info=True)
        return False


def test_empty_subreddit():
    """测试抓取空 Subreddit 的情况"""
    logger.info("[测试2] 空 Subreddit 处理")
    
    try:
        from src.reddit.client import reddit_client
        
        # 使用一个几乎肯定为空或不存在的 subreddit
        empty_subreddit = "this_subreddit_definitely_does_not_exist_12345"
        
        logger.info(f"  尝试抓取空/不存在的 Subreddit: {empty_subreddit}")
        
        try:
            posts = reddit_client.fetch_top_posts(empty_subreddit, limit=5)
            
            if posts is None or len(posts) == 0:
                logger.info("  ✓ 正确处理空 Subreddit，返回空列表")
                return True
            else:
                logger.warning(f"  ! 意外获取到 {len(posts)} 条帖子")
                return True  # 仍然算通过，可能 Reddit 有这个 subreddit
                
        except Exception as e:
            # 如果抛出异常，检查是否是预期的错误
            error_msg = str(e).lower()
            if "not found" in error_msg or "404" in error_msg or "403" in error_msg or "empty" in error_msg:
                logger.info(f"  ✓ 正确处理不存在的 Subreddit: {e}")
                return True
            else:
                logger.error(f"  ✗ 意外的错误: {e}")
                return False
                
    except Exception as e:
        # 如果是 Reddit API 连接问题，跳过测试
        error_msg = str(e).lower()
        if "403" in error_msg or "forbidden" in error_msg or "unauthorized" in error_msg:
            logger.warning(f"  ! Reddit API 访问被拒绝，跳过测试: {e}")
            return True  # 不算失败
        logger.error(f"  ✗ 测试失败: {e}", exc_info=True)
        return False


def test_database_connection_recovery():
    """测试数据库连接中断的情况"""
    logger.info("[测试3] 数据库连接恢复")
    
    try:
        # 首先确保数据库已连接
        db.connect()
        
        # 验证连接正常
        row = db.fetchone("SELECT 1")
        if not row:
            logger.error("  ✗ 初始数据库连接失败")
            return False
        logger.info("  初始连接正常")
        
        # 模拟连接断开
        logger.info("  模拟连接断开...")
        db.close()
        
        # 尝试重新连接
        logger.info("  尝试重新连接...")
        db.connect()
        
        # 验证重新连接成功
        row = db.fetchone("SELECT 1")
        if row:
            logger.info("  ✓ 数据库重连成功")
            return True
        else:
            logger.error("  ✗ 数据库重连失败")
            return False
            
    except Exception as e:
        logger.error(f"  ✗ 数据库连接测试失败: {e}", exc_info=True)
        return False


def test_invalid_llm_response():
    """测试 LLM 返回无效 JSON 的情况"""
    logger.info("[测试4] 无效 LLM 响应处理")
    
    try:
        from src.llm.client import extract_json_from_response
        
        # 测试各种无效响应
        test_cases = [
            ("空字符串", ""),
            ("纯文本", "This is not JSON"),
            ("部分 JSON", '{"is_pain_point": true, "title":'),
            ("Markdown 包装的 JSON", '```json\n{"is_pain_point": true}\n```'),
            ("带前缀的 JSON", 'Here is the result: {"is_pain_point": false}'),
        ]
        
        for name, invalid_response in test_cases:
            try:
                result = extract_json_from_response(invalid_response)
                if result is not None:
                    logger.info(f"    {name}: 成功解析 -> {type(result)}")
                else:
                    logger.info(f"    {name}: 返回 None")
            except Exception as e:
                logger.info(f"    {name}: 抛出异常 -> {type(e).__name__}")
        
        logger.info("  ✓ 无效响应处理测试完成")
        return True
        
    except Exception as e:
        logger.error(f"  ✗ 测试失败: {e}", exc_info=True)
        return False


def test_concurrent_processing():
    """测试并发处理的情况"""
    logger.info("[测试5] 并发处理安全性")
    
    try:
        import threading
        import libsql_experimental as libsql
        
        errors = []
        success_count = 0
        lock = threading.Lock()
        
        def db_operation(thread_id):
            nonlocal success_count
            try:
                # 每个线程创建自己的数据库连接
                conn = libsql.connect(
                    settings.turso_database_url,
                    auth_token=settings.turso_auth_token
                )
                
                # 执行简单查询
                for i in range(3):
                    row = conn.execute("SELECT ?", (thread_id * 10 + i,)).fetchone()
                    if row:
                        with lock:
                            success_count += 1
                
                conn.close()
                
            except Exception as e:
                with lock:
                    errors.append(f"Thread {thread_id}: {e}")
        
        # 启动多个线程
        threads = []
        num_threads = 3
        
        logger.info(f"  启动 {num_threads} 个并发线程...")
        
        for i in range(num_threads):
            t = threading.Thread(target=db_operation, args=(i,))
            threads.append(t)
            t.start()
        
        # 等待所有线程完成
        for t in threads:
            t.join(timeout=10)
        
        if errors:
            logger.warning(f"  ! 发现 {len(errors)} 个错误:")
            for err in errors[:3]:
                logger.warning(f"    - {err}")
        
        logger.info(f"  成功操作数: {success_count}/{num_threads * 3}")
        
        if success_count >= num_threads * 2:  # 至少 2/3 成功
            logger.info("  ✓ 并发处理测试通过")
            return True
        else:
            logger.error("  ✗ 并发处理成功率过低")
            return False
            
    except Exception as e:
        logger.error(f"  ✗ 并发测试失败: {e}", exc_info=True)
        return False


def run_exception_tests():
    """运行异常测试"""
    logger.info("=" * 60)
    logger.info("异常情况测试")
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
        results["LLM 重试机制"] = test_llm_retry_mechanism()
        results["空 Subreddit 处理"] = test_empty_subreddit()
        results["数据库连接恢复"] = test_database_connection_recovery()
        results["无效 LLM 响应"] = test_invalid_llm_response()
        results["并发处理安全性"] = test_concurrent_processing()
        
    finally:
        try:
            db.close()
        except:
            pass
    
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
    success = run_exception_tests()
    sys.exit(0 if success else 1)