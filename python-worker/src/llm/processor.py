"""
LLM 处理器
负责从数据库获取待处理帖子、调用 LLM 分析、保存结果
"""

import json
from typing import Dict, Any, Optional

from src.config import settings, get_logger
from src.llm.client import llm_client, extract_json_from_response
from src.llm.prompts import build_user_prompt, format_comments
from src.models.schemas import (
    AnalysisResult,
    calculate_total_score,
)
from src.database.client import (
    get_pending_posts,
    update_post_status,
    insert_pain_point,
    get_or_create_tag,
    link_pain_point_tag,
)

logger = get_logger(__name__)


class Processor:
    """
    LLM 处理器
    
    负责协调 LLM 客户端和数据库操作，
    实现完整的痛点分析流程。
    """
    
    def __init__(self):
        """初始化处理器"""
        self.client = llm_client
    
    def run_batch(self, batch_size: Optional[int] = None) -> Dict[str, int]:
        """
        执行批量处理任务
        
        从数据库获取待处理帖子，调用 LLM 分析，保存结果。
        
        Args:
            batch_size: 批量大小（默认使用配置值）
            
        Returns:
            处理统计信息
        """
        if batch_size is None:
            batch_size = settings.batch_size
        
        logger.info(f"开始批量处理，batch_size={batch_size}")
        
        stats = {
            "total": 0,
            "pain_points": 0,
            "no_pain_points": 0,
            "failed": 0,
        }
        
        # 获取待处理帖子
        posts = get_pending_posts(limit=batch_size)
        stats["total"] = len(posts)
        
        if not posts:
            logger.info("没有待处理的帖子")
            return stats
        
        logger.info(f"获取到 {len(posts)} 个待处理帖子")
        
        # 处理每个帖子
        for post in posts:
            try:
                result = self.process_single(post)
                
                if result == "pain_point":
                    stats["pain_points"] += 1
                elif result == "no_pain_point":
                    stats["no_pain_points"] += 1
                else:
                    stats["failed"] += 1
                    
            except Exception as e:
                logger.error(f"处理帖子 {post['id']} 失败: {e}", exc_info=True)
                stats["failed"] += 1
                
                # 标记为失败
                try:
                    update_post_status(post["id"], "failed")
                except Exception:
                    pass
        
        logger.info(
            f"批量处理完成: "
            f"总计 {stats['total']}, "
            f"痛点 {stats['pain_points']}, "
            f"非痛点 {stats['no_pain_points']}, "
            f"失败 {stats['failed']}"
        )
        
        return stats
    
    def process_single(self, post: Dict[str, Any]) -> str:
        """
        处理单个帖子
        
        Args:
            post: 帖子数据
            
        Returns:
            处理结果: "pain_point", "no_pain_point", 或 "failed"
        """
        post_id = post["id"]
        logger.info(f"正在处理帖子: {post_id} - {post['title'][:50]}...")
        
        # 标记为处理中
        update_post_status(post_id, "processing")
        
        try:
            # 构建提示词
            user_prompt = self._build_prompt(post)
            
            # 调用 LLM
            response = self.client.analyze_with_retry(
                user_prompt=user_prompt,
                max_retries=3,
            )
            
            # 解析响应
            json_data = extract_json_from_response(response)
            
            # Pydantic 校验
            analysis = AnalysisResult.model_validate(json_data)
            
            # 保存结果
            if analysis.is_pain_point and analysis.pain_point:
                self._save_pain_point(post_id, analysis)
                update_post_status(post_id, "completed")
                logger.info(f"帖子 {post_id} 识别为痛点，置信度 {analysis.confidence}")
                return "pain_point"
            else:
                update_post_status(post_id, "no_pain_point")
                logger.info(f"帖子 {post_id} 不是痛点: {analysis.reason}")
                return "no_pain_point"
                
        except Exception as e:
            logger.error(f"处理帖子 {post_id} 失败: {e}")
            update_post_status(post_id, "failed")
            return "failed"
    
    def _build_prompt(self, post: Dict[str, Any]) -> str:
        """
        构建 LLM 提示词
        
        Args:
            post: 帖子数据
            
        Returns:
            用户提示词
        """
        # 从内容中提取评论（如果有的话）
        content = post.get("content", "") or ""
        top_comments = ""
        
        # 尝试分离正文和评论
        if "【热门评论】" in content:
            parts = content.split("【热门评论】")
            main_content = parts[0].replace("【正文】", "").strip()
            if len(parts) > 1:
                top_comments = parts[1].strip()
        else:
            main_content = content.replace("【正文】", "").strip()
        
        return build_user_prompt(
            subreddit=post.get("subreddit_name", "unknown"),
            title=post["title"],
            content=main_content,
            score=post.get("score", 0),
            num_comments=post.get("num_comments", 0),
            top_comments=top_comments,
        )
    
    def _save_pain_point(self, post_id: str, analysis: AnalysisResult) -> str:
        """
        保存痛点数据到数据库
        
        Args:
            post_id: 帖子 ID
            analysis: 分析结果
            
        Returns:
            痛点 ID
        """
        pain_point = analysis.pain_point
        if not pain_point:
            raise ValueError("没有痛点数据")
        
        # 计算总分
        total_score = calculate_total_score(pain_point.scores)
        
        # 构建维度原因 JSON
        dimension_reasons = {
            "urgency": {"score": pain_point.scores.urgency.score, "reason": pain_point.scores.urgency.reason},
            "frequency": {"score": pain_point.scores.frequency.score, "reason": pain_point.scores.frequency.reason},
            "market_size": {"score": pain_point.scores.market_size.score, "reason": pain_point.scores.market_size.reason},
            "monetization": {"score": pain_point.scores.monetization.score, "reason": pain_point.scores.monetization.reason},
            "barrier_to_entry": {"score": pain_point.scores.barrier_to_entry.score, "reason": pain_point.scores.barrier_to_entry.reason},
        }
        
        # 插入痛点
        pain_point_id = insert_pain_point(
            post_id=post_id,
            title=pain_point.title,
            description=pain_point.description,
            user_need=pain_point.user_need,
            current_solution=pain_point.current_solution,
            ideal_solution=pain_point.ideal_solution,
            mentioned_competitors=json.dumps(pain_point.mentioned_competitors) if pain_point.mentioned_competitors else None,
            quotes=json.dumps(pain_point.quotes) if pain_point.quotes else None,
            target_personas=json.dumps(pain_point.target_personas) if pain_point.target_personas else None,
            actionable_insights=json.dumps(pain_point.actionable_insights) if pain_point.actionable_insights else None,
            industry_code=pain_point.industry_code,
            type_code=pain_point.type_code,
            confidence=analysis.confidence,
            total_score=total_score,
            score_urgency=pain_point.scores.urgency.score,
            score_frequency=pain_point.scores.frequency.score,
            score_market_size=pain_point.scores.market_size.score,
            score_monetization=pain_point.scores.monetization.score,
            score_barrier_to_entry=pain_point.scores.barrier_to_entry.score,
            dimension_reasons=json.dumps(dimension_reasons, ensure_ascii=False),
        )
        
        # 处理标签
        if pain_point.tags:
            for tag_name in pain_point.tags:
                try:
                    tag_id = get_or_create_tag(tag_name)
                    link_pain_point_tag(pain_point_id, tag_id)
                except Exception as e:
                    logger.warning(f"处理标签 '{tag_name}' 失败: {e}")
        
        logger.info(f"痛点已保存: {pain_point_id} (总分: {total_score})")
        return pain_point_id


# 全局处理器实例
processor = Processor()