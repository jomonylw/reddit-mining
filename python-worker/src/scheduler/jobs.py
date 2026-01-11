"""
定时任务配置
使用 APScheduler 配置和管理定时任务
"""

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED, SchedulerEvent
from datetime import datetime, timedelta

from src.config import settings, get_logger
from src.reddit.fetcher import fetcher
from src.llm.processor import processor

logger = get_logger(__name__)

# 创建调度器
scheduler = BlockingScheduler(
    timezone="UTC",
    job_defaults={
        "coalesce": True,  # 合并错过的任务
        "max_instances": 1,  # 同一任务最多运行一个实例
        "misfire_grace_time": 60 * 5,  # 错过任务的容忍时间（5分钟）
    }
)


def job_listener(event: SchedulerEvent):
    """
    任务事件监听器
    
    Args:
        event: 调度器事件
    """
    if event.exception:
        logger.error(
            f"任务 {event.job_id} 执行失败: {event.exception}",
            exc_info=event.exception,
        )
    else:
        logger.info(f"任务 {event.job_id} 执行完成")


# 注册事件监听
scheduler.add_listener(job_listener, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)


def run_fetch_job():
    """
    Reddit 数据抓取任务
    
    从配置的所有活跃 Subreddit 抓取帖子。
    """
    logger.info("=" * 50)
    logger.info("开始执行 Reddit 抓取任务")
    logger.info("=" * 50)
    
    try:
        stats = fetcher.run_fetch_all()
        logger.info(f"抓取任务统计: {stats}")
    except Exception as e:
        logger.error(f"抓取任务执行失败: {e}", exc_info=True)
        raise


def run_process_job():
    """
    LLM 处理任务
    
    处理待分析的帖子，提取痛点信息。
    """
    logger.info("=" * 50)
    logger.info("开始执行 LLM 处理任务")
    logger.info("=" * 50)
    
    # 检查 LLM API 配置
    if not settings.llm_api_key:
        logger.warning("LLM API Key 未配置，跳过处理任务")
        return
    
    try:
        stats = processor.run_batch()
        logger.info(f"处理任务统计: {stats}")
    except Exception as e:
        logger.error(f"处理任务执行失败: {e}", exc_info=True)
        raise


def setup_jobs():
    """
    配置定时任务
    
    根据配置添加抓取和处理任务。
    """
    # 抓取任务：按配置的间隔执行
    fetch_hours = settings.fetch_interval_hours
    scheduler.add_job(
        run_fetch_job,
        trigger=IntervalTrigger(hours=fetch_hours),
        id="fetch_reddit_posts",
        name="Reddit 帖子抓取",
        replace_existing=True,
    )
    logger.info(f"已配置抓取任务: 每 {fetch_hours} 小时执行一次")
    
    # 处理任务：按配置的间隔执行
    process_minutes = settings.process_interval_minutes
    scheduler.add_job(
        run_process_job,
        trigger=IntervalTrigger(minutes=process_minutes),
        id="process_posts",
        name="LLM 痛点分析",
        replace_existing=True,
    )
    logger.info(f"已配置处理任务: 每 {process_minutes} 分钟执行一次")
    
    # 立即执行一次抓取任务（启动时）
    scheduler.add_job(
        run_fetch_job,
        trigger="date",  # 一次性任务
        run_date=datetime.now() + timedelta(seconds=5),  # 5秒后执行
        id="fetch_reddit_posts_initial",
        name="初始抓取任务",
        replace_existing=True,
    )
    logger.info("已配置初始抓取任务: 5秒后执行")


def start_scheduler():
    """
    启动调度器
    
    配置任务并启动调度器（阻塞运行）。
    """
    logger.info("正在启动调度器...")
    
    # 配置任务
    setup_jobs()
    
    # 打印已配置的任务
    jobs = scheduler.get_jobs()
    logger.info(f"已配置 {len(jobs)} 个任务:")
    for job in jobs:
        logger.info(f"  - {job.id}: {job.name} (trigger: {job.trigger})")
    
    # 启动调度器（阻塞）
    logger.info("调度器启动成功，等待任务执行...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("调度器已停止")