"""
LLM API 客户端
封装 OpenAI SDK 实现 LLM API 调用
"""

import json
import re
from typing import Optional
from openai import OpenAI

from src.config import settings, get_logger
from src.llm.prompts import SYSTEM_PROMPT

logger = get_logger(__name__)


class LLMClient:
    """
    LLM API 客户端
    
    支持 OpenAI 及兼容 API
    """
    
    def __init__(self):
        """初始化 LLM 客户端"""
        self._client: Optional[OpenAI] = None
    
    @property
    def client(self) -> OpenAI:
        """获取 OpenAI 客户端（延迟初始化）"""
        if self._client is None:
            logger.info(f"正在初始化 LLM 客户端 (model={settings.llm_model})...")
            self._client = OpenAI(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
            )
            logger.info("LLM 客户端初始化成功")
        return self._client
    
    def analyze(
        self,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> str:
        """
        调用 LLM 进行分析
        
        Args:
            user_prompt: 用户提示词
            temperature: 温度参数（推荐 0.3）
            
        Returns:
            LLM 响应内容
        """
        logger.debug(f"调用 LLM API (model={settings.llm_model})...")
        
        response = self.client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        
        content = response.choices[0].message.content
        
        # 记录 token 使用情况
        if response.usage:
            logger.debug(
                f"Token 使用: prompt={response.usage.prompt_tokens}, "
                f"completion={response.usage.completion_tokens}, "
                f"total={response.usage.total_tokens}"
            )
        
        return content or ""
    
    def analyze_with_retry(
        self,
        user_prompt: str,
        max_retries: int = 3,
        temperature: float = 0.3,
    ) -> str:
        """
        带重试的 LLM 调用
        
        Args:
            user_prompt: 用户提示词
            max_retries: 最大重试次数
            temperature: 温度参数
            
        Returns:
            LLM 响应内容
            
        Raises:
            Exception: 所有重试都失败时抛出
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return self.analyze(
                    user_prompt=user_prompt,
                    temperature=temperature,
                )
            except Exception as e:
                last_error = e
                logger.warning(f"LLM 调用失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                
                # 指数退避
                if attempt < max_retries - 1:
                    import time
                    delay = 2 ** attempt
                    logger.info(f"等待 {delay} 秒后重试...")
                    time.sleep(delay)
        
        raise last_error or Exception("LLM 调用失败")


def extract_json_from_response(content: str) -> dict:
    """
    从 LLM 响应中提取 JSON
    
    多级提取策略：
    1. 直接解析
    2. Markdown 代码块提取
    3. 行内代码提取
    4. 结构匹配
    
    Args:
        content: LLM 响应内容
        
    Returns:
        解析后的 JSON 对象
        
    Raises:
        ValueError: 无法解析 JSON
    """
    if not content:
        raise ValueError("响应内容为空")
    
    # 策略 1: 直接解析
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    
    # 策略 2: 提取 Markdown 代码块（完整的）
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
    matches = re.findall(code_block_pattern, content)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue
    
    # 策略 2.5: 处理不完整的代码块（响应被截断的情况）
    incomplete_block_pattern = r'```(?:json)?\s*([\s\S]*)'
    match = re.search(incomplete_block_pattern, content)
    if match:
        json_str = match.group(1).strip()
        # 尝试补全不完整的 JSON
        json_str = _try_complete_json(json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
    
    # 策略 3: 提取行内代码
    inline_pattern = r'`([^`]+)`'
    matches = re.findall(inline_pattern, content)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue
    
    # 策略 4: 提取 JSON 结构
    # 匹配最外层的 {...}
    brace_pattern = r'\{[\s\S]*\}'
    match = re.search(brace_pattern, content)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    
    raise ValueError(f"无法从响应中提取 JSON: {content[:200]}...")


def _try_complete_json(json_str: str) -> str:
    """
    尝试补全不完整的 JSON 字符串
    
    当 LLM 响应被截断时，尝试添加缺失的闭合括号。
    
    Args:
        json_str: 可能不完整的 JSON 字符串
        
    Returns:
        尝试补全后的 JSON 字符串
    """
    # 移除尾部不完整的内容（如被截断的字符串）
    # 先尝试找到最后一个完整的 key-value 对
    
    # 计算未闭合的括号
    open_braces = 0
    open_brackets = 0
    in_string = False
    escape_next = False
    last_valid_pos = 0
    
    for i, char in enumerate(json_str):
        if escape_next:
            escape_next = False
            continue
            
        if char == '\\' and in_string:
            escape_next = True
            continue
            
        if char == '"' and not escape_next:
            in_string = not in_string
            continue
            
        if in_string:
            continue
            
        if char == '{':
            open_braces += 1
        elif char == '}':
            open_braces -= 1
            if open_braces >= 0:
                last_valid_pos = i + 1
        elif char == '[':
            open_brackets += 1
        elif char == ']':
            open_brackets -= 1
            if open_brackets >= 0:
                last_valid_pos = i + 1
        elif char == ',' or char == ':':
            if open_braces > 0 or open_brackets > 0:
                last_valid_pos = i + 1
    
    # 如果在字符串中被截断，尝试闭合字符串
    if in_string:
        # 找到最后一个完整的逗号或冒号位置
        for i in range(len(json_str) - 1, -1, -1):
            if json_str[i] in ',:{[':
                json_str = json_str[:i+1]
                break
    
    # 添加缺失的闭合括号
    result = json_str.rstrip()
    
    # 移除尾部不完整的部分（如 "key": "incom...）
    while result and result[-1] not in '{}[],"0123456789':
        # 回退到上一个有效位置
        if ',' in result:
            result = result[:result.rfind(',')]
        elif ':' in result:
            result = result[:result.rfind(':')]
            # 还需要移除 key
            if '"' in result:
                result = result[:result.rfind('"')]
                if '"' in result:
                    result = result[:result.rfind('"')]
        else:
            break
    
    # 清理尾部的逗号
    result = result.rstrip().rstrip(',')
    
    # 添加缺失的闭合括号
    result += ']' * open_brackets
    result += '}' * open_braces
    
    return result


# 全局客户端实例
llm_client = LLMClient()