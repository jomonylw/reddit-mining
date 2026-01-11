"""
LLM 模块
封装 LLM 客户端和处理逻辑
"""

from src.llm.client import LLMClient, llm_client
from src.llm.processor import Processor, processor

__all__ = ["LLMClient", "llm_client", "Processor", "processor"]