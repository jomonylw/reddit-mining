"""
配置管理模块
使用 pydantic-settings 进行类型安全的配置管理
"""

import logging
import sys
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Reddit API 配置
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "RedditPainPointMiner/1.0"
    
    # Turso 数据库配置
    turso_database_url: str = ""
    turso_auth_token: Optional[str] = None
    
    # LLM API 配置
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    
    # 调度配置
    fetch_interval_hours: int = 24  # 抓取间隔（小时）
    process_interval_minutes: int = 30  # 处理间隔（分钟）
    batch_size: int = 10  # 每批处理的帖子数量
    
    # 日志配置
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_date_format: str = "%Y-%m-%d %H:%M:%S"


def setup_logging(settings: Settings) -> logging.Logger:
    """
    配置日志系统
    
    Args:
        settings: 应用配置实例
        
    Returns:
        配置好的 root logger
    """
    # 获取日志级别
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    
    # 配置根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 清除已有的处理器
    root_logger.handlers.clear()
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # 创建格式化器
    formatter = logging.Formatter(
        fmt=settings.log_format,
        datefmt=settings.log_date_format,
    )
    console_handler.setFormatter(formatter)
    
    # 添加处理器
    root_logger.addHandler(console_handler)
    
    # 配置第三方库的日志级别（减少噪音）
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    获取指定名称的日志器
    
    Args:
        name: 日志器名称，通常使用 __name__
        
    Returns:
        日志器实例
    """
    return logging.getLogger(name)


# 全局配置实例
settings = Settings()

# 初始化日志系统
logger = setup_logging(settings)