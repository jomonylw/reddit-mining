"""
完整流程测试脚本 (生产环境模拟版)

测试目标：使用实际的调度任务函数 (run_fetch_job, run_process_job) 验证完整数据流
测试范围：
1. 任务调度层面的执行 (Jobs)
2. 数据抓取与入库 (Fetcher)
3. LLM 分析与结果存储 (Processor)
4. 数据库状态变化验证
"""

import sys
from pathlib import Path
import time
import uuid

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings, get_logger
from src.database.client import db
from src.scheduler.jobs import run_fetch_job, run_process_job

logger = get_logger("test_full_flow_prod")

def setup_test_environment(subreddit_name="SaaS", limit=3):
    """准备测试环境"""
    logger.info(f"\n[步骤 1] 环境准备: r/{subreddit_name}")
    
    # 1. 获取或创建 Subreddit
    row = db.fetchone("SELECT id FROM subreddits WHERE name = ?", (subreddit_name,))
    
    if row:
        subreddit_id = row[0]
        logger.info(f"  Subreddit 已存在 (ID: {subreddit_id})")
        # 更新配置：激活，设置限制，设置频率
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        db.execute(
            """
            UPDATE subreddits
            SET posts_limit = ?, fetch_frequency = 'daily', is_active = 1, updated_at = ?
            WHERE id = ?
            """,
            (limit, now, subreddit_id)
        )
    else:
        subreddit_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        db.execute(
            """
            INSERT INTO subreddits (id, name, description, is_active, fetch_frequency, posts_limit, created_at, updated_at)
            VALUES (?, ?, 'Test Subreddit', 1, 'daily', ?, ?, ?)
            """,
            (subreddit_id, subreddit_name, limit, now, now)
        )
        logger.info(f"  创建新 Subreddit (ID: {subreddit_id})")
    
    db.conn.commit()
    
    # 2. 清理历史数据 (为了验证完整的"新增"流程)
    # 注意：在生产环境中这很危险，但这是测试脚本
    logger.info("  清理该 Subreddit 的历史帖子和痛点数据...")
    
    # 获取该 subreddit 的所有 post_id
    post_rows = db.fetchall("SELECT id FROM posts WHERE subreddit_id = ?", (subreddit_id,))
    post_ids = [r[0] for r in post_rows]
    
    if post_ids:
        placeholders = ','.join(['?'] * len(post_ids))
        
        # 删除关联的痛点标签
        # 先找痛点
        pp_rows = db.fetchall(f"SELECT id FROM pain_points WHERE post_id IN ({placeholders})", tuple(post_ids))
        pp_ids = [r[0] for r in pp_rows]
        
        if pp_ids:
            pp_placeholders = ','.join(['?'] * len(pp_ids))
            db.execute(f"DELETE FROM pain_point_tags WHERE pain_point_id IN ({pp_placeholders})", tuple(pp_ids))
            db.execute(f"DELETE FROM pain_points WHERE id IN ({pp_placeholders})", tuple(pp_ids))
            
        # 删除帖子
        db.execute(f"DELETE FROM posts WHERE id IN ({placeholders})", tuple(post_ids))
        db.conn.commit()
        logger.info(f"  已清理 {len(post_ids)} 条历史帖子及其关联数据")
    else:
        logger.info("  无历史数据需清理")
        
    return subreddit_id

def verify_fetch_results(subreddit_id, expected_min_count=1):
    """验证抓取结果"""
    logger.info(f"\n[步骤 3] 验证抓取结果")
    
    # 检查帖子数量
    row = db.fetchone("SELECT COUNT(*) FROM posts WHERE subreddit_id = ?", (subreddit_id,))
    count = row[0]
    logger.info(f"  当前数据库中该 Subreddit 帖子数: {count}")
    
    if count < expected_min_count:
        logger.error(f"  抓取数量不足 (期望至少 {expected_min_count})")
        return False
        
    # 检查状态
    pending_count = db.fetchone(
        "SELECT COUNT(*) FROM posts WHERE subreddit_id = ? AND process_status = 'pending'",
        (subreddit_id,)
    )[0]
    logger.info(f"  待处理 (pending) 帖子数: {pending_count}")
    
    if pending_count == 0:
        logger.warning("  没有待处理的帖子 (可能所有帖子都已存在且未更新?)")
        # 如果是全新的环境，应该都是 pending。
        # 如果我们刚才清理了数据，那么抓回来的应该都是 pending。
        return False
        
    return True

def verify_process_results(subreddit_id):
    """验证处理结果"""
    logger.info(f"\n[步骤 5] 验证处理结果")
    
    # 检查是否还有 pending 帖子
    pending_count = db.fetchone(
        "SELECT COUNT(*) FROM posts WHERE subreddit_id = ? AND process_status = 'pending'",
        (subreddit_id,)
    )[0]
    
    processed_count = db.fetchone(
        "SELECT COUNT(*) FROM posts WHERE subreddit_id = ? AND process_status != 'pending'",
        (subreddit_id,)
    )[0]
    
    logger.info(f"  处理后状态: 待处理 {pending_count}, 已完成/失败 {processed_count}")
    
    # 检查痛点生成情况
    pain_points_count = db.fetchone(
        """
        SELECT COUNT(*) 
        FROM pain_points pp
        JOIN posts p ON pp.post_id = p.id
        WHERE p.subreddit_id = ?
        """,
        (subreddit_id,)
    )[0]
    
    logger.info(f"  生成的痛点数量: {pain_points_count}")
    
    if pain_points_count > 0:
        # 显示前几个痛点
        rows = db.fetchall(
            """
            SELECT pp.title, pp.confidence, p.title
            FROM pain_points pp
            JOIN posts p ON pp.post_id = p.id
            WHERE p.subreddit_id = ?
            LIMIT 3
            """,
            (subreddit_id,)
        )
        for i, row in enumerate(rows, 1):
            logger.info(f"    痛点 {i}: {row[0]} (置信度: {row[1]})")
            logger.info(f"      来源: {row[2][:50]}...")
    else:
        logger.info("  未发现痛点 (这在少量样本测试中是正常的)")
        
    return True

def test_full_production_flow():
    logger.info("============================================================")
    logger.info("开始执行完整流程测试 (生产模式)")
    logger.info("============================================================")
    
    subreddit_name = "SaaS"
    test_limit = 3
    
    # 1. 准备环境
    try:
        subreddit_id = setup_test_environment(subreddit_name, test_limit)
    except Exception as e:
        logger.error(f"环境准备失败: {e}", exc_info=True)
        return False

    # 2. 执行抓取任务
    logger.info(f"\n[步骤 2] 执行抓取任务 (run_fetch_job)")
    try:
        run_fetch_job()
    except Exception as e:
        logger.error(f"抓取任务执行失败: {e}", exc_info=True)
        return False
        
    # 3. 验证抓取
    if not verify_fetch_results(subreddit_id, expected_min_count=1):
        logger.error("抓取验证失败，终止测试")
        return False
        
    # 4. 执行处理任务
    logger.info(f"\n[步骤 4] 执行处理任务 (run_process_job)")
    
    # 确保有 API Key
    if not settings.llm_api_key:
        logger.error("LLM API Key 未配置，无法执行处理任务")
        return False
        
    try:
        run_process_job()
    except Exception as e:
        logger.error(f"处理任务执行失败: {e}", exc_info=True)
        return False
        
    # 5. 验证处理
    if not verify_process_results(subreddit_id):
        return False
        
    logger.info("\n============================================================")
    logger.info("测试成功完成！")
    return True

if __name__ == "__main__":
    try:
        if test_full_production_flow():
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n测试已取消")
    except Exception as e:
        logger.error(f"测试发生未捕获异常: {e}", exc_info=True)
        sys.exit(1)