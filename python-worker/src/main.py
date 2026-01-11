"""
Reddit Mining - Python Worker 主入口
负责定时抓取 Reddit 帖子并调用 LLM 进行分析
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings, get_logger
from src.database.client import db
from src.scheduler.jobs import start_scheduler

logger = get_logger(__name__)


def verify_config():
    """验证必要的配置项"""
    errors = []
    
    if not settings.turso_database_url:
        errors.append("TURSO_DATABASE_URL 未配置")
    
    if not settings.reddit_client_id:
        errors.append("REDDIT_CLIENT_ID 未配置")
    
    if not settings.reddit_client_secret:
        errors.append("REDDIT_CLIENT_SECRET 未配置")
    
    if errors:
        for error in errors:
            logger.error(f"配置错误: {error}")
        return False
    
    return True


def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("Reddit Mining - Python Worker")
    logger.info("=" * 60)
    
    # 验证配置
    if not verify_config():
        logger.error("配置验证失败，请检查环境变量设置")
        logger.info("提示: 复制 .env.example 为 .env 并填写必要的配置")
        sys.exit(1)
    
    logger.info("配置验证通过")
    
    # 验证数据库连接
    try:
        db.connect()
        logger.info("数据库连接成功")
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        sys.exit(1)
    
    # 启动调度器（阻塞运行）
    try:
        start_scheduler()
    except (KeyboardInterrupt, SystemExit):
        logger.info("收到停止信号")
    finally:
        db.close()
        logger.info("Worker 已停止")


if __name__ == "__main__":
    main()