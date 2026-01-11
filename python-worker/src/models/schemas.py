"""
数据模型定义
使用 Pydantic 进行类型安全的数据验证
"""

from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# 枚举定义
# ============================================================================

class IndustryCode(str, Enum):
    """行业分类代码"""
    DEV_TOOLS = "DEV_TOOLS"      # 开发者工具
    DEVOPS = "DEVOPS"            # DevOps
    DATA = "DATA"                # 数据与分析
    SAAS = "SAAS"                # SaaS 通用
    MARKETING = "MARKETING"      # 营销
    SALES = "SALES"              # 销售
    PRODUCTIVITY = "PRODUCTIVITY"  # 效率工具
    FINANCE = "FINANCE"          # 财务
    HR = "HR"                    # 人力资源
    SECURITY = "SECURITY"        # 安全
    ECOMMERCE = "ECOMMERCE"      # 电商
    COMMUNICATION = "COMMUNICATION"  # 通讯
    DESIGN = "DESIGN"            # 设计
    AI_ML = "AI_ML"              # AI/ML
    OTHER = "OTHER"              # 其他


class PainPointTypeCode(str, Enum):
    """痛点类型代码"""
    MISSING_FEATURE = "MISSING_FEATURE"  # 功能缺失
    POOR_UX = "POOR_UX"                  # 体验不佳
    HIGH_COST = "HIGH_COST"              # 成本过高
    EFFICIENCY = "EFFICIENCY"            # 效率低下
    INTEGRATION = "INTEGRATION"          # 集成困难
    RELIABILITY = "RELIABILITY"          # 稳定性差
    PERFORMANCE = "PERFORMANCE"          # 性能问题
    LEARNING_CURVE = "LEARNING_CURVE"    # 学习成本高
    NO_SOLUTION = "NO_SOLUTION"          # 无解决方案
    OTHER = "OTHER"                      # 其他


# ============================================================================
# 基础数据模型
# ============================================================================

class SubredditConfig(BaseModel):
    """Subreddit 配置"""
    id: str
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    fetch_frequency: str = "daily"
    posts_limit: int = 100
    last_fetched_at: Optional[str] = None


class RedditPost(BaseModel):
    """Reddit 帖子数据"""
    id: str
    subreddit_id: str
    reddit_id: str
    title: str
    content: Optional[str] = None
    author: Optional[str] = None
    url: str
    score: int = 0
    num_comments: int = 0
    reddit_created_at: str
    process_status: str = "pending"
    processed_at: Optional[str] = None
    created_at: Optional[str] = None


# ============================================================================
# LLM 分析相关模型
# ============================================================================

class Score(BaseModel):
    """单个维度的评分（含评分和理由）"""
    score: int = Field(..., ge=0, le=10, description="评分 (0-10)")
    reason: str = Field(..., description="评分理由（中文）")


class ScoresDict(BaseModel):
    """所有维度的评分"""
    urgency: Score = Field(..., description="紧迫程度")
    frequency: Score = Field(..., description="发生频率")
    market_size: Score = Field(..., description="市场规模")
    monetization: Score = Field(..., description="变现潜力")
    barrier_to_entry: Score = Field(..., description="准入门槛")


class PainPointExtraction(BaseModel):
    """LLM 提取的痛点信息"""
    title: str = Field(..., max_length=200, description="痛点标题（中文，一句话概括）")
    description: str = Field(..., description="痛点详细描述（中文）")
    user_need: Optional[str] = Field(None, description="用户实际需求（中文）")
    current_solution: Optional[str] = Field(None, description="当前解决方案（中文）")
    ideal_solution: Optional[str] = Field(None, description="理想解决方案（中文）")
    industry_code: str = Field(..., description="行业分类代码")
    type_code: str = Field(..., description="痛点类型代码")
    tags: List[str] = Field(default_factory=list, description="标签列表（中文，最多5个）")
    mentioned_competitors: List[str] = Field(default_factory=list, description="提及的竞品")
    quotes: List[str] = Field(default_factory=list, description="原文引用")
    target_personas: List[str] = Field(default_factory=list, description="目标用户角色（中文）")
    actionable_insights: List[str] = Field(default_factory=list, description="行动建议（中文）")
    scores: ScoresDict = Field(..., description="各维度评分")
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        """限制标签数量最多5个"""
        if len(v) > 5:
            return v[:5]
        return v
    
    @field_validator('industry_code')
    @classmethod
    def validate_industry_code(cls, v: str) -> str:
        """验证行业代码"""
        valid_codes = [e.value for e in IndustryCode]
        if v not in valid_codes:
            return IndustryCode.OTHER.value
        return v
    
    @field_validator('type_code')
    @classmethod
    def validate_type_code(cls, v: str) -> str:
        """验证痛点类型代码"""
        valid_codes = [e.value for e in PainPointTypeCode]
        if v not in valid_codes:
            return PainPointTypeCode.OTHER.value
        return v


class AnalysisResult(BaseModel):
    """LLM 分析结果（最终结构）"""
    is_pain_point: bool = Field(..., description="是否为有效痛点")
    confidence: float = Field(..., ge=0.0, le=1.0, description="识别置信度 (0-1)")
    reason: str = Field(..., description="判断理由（中文）")
    pain_point: Optional[PainPointExtraction] = Field(None, description="痛点信息（仅当 is_pain_point=True 时有值）")
    
    @field_validator('confidence')
    @classmethod
    def round_confidence(cls, v: float) -> float:
        """保留两位小数"""
        return round(v, 2)


# ============================================================================
# 数据库存储模型
# ============================================================================

class DimensionScores(BaseModel):
    """维度评分（数据库存储格式）"""
    urgency: int = Field(ge=0, le=10, description="紧迫程度 (0-10)")
    frequency: int = Field(ge=0, le=10, description="发生频率 (0-10)")
    market_size: int = Field(ge=0, le=10, description="市场规模 (0-10)")
    monetization: int = Field(ge=0, le=10, description="变现潜力 (0-10)")
    barrier_to_entry: int = Field(ge=0, le=10, description="准入门槛 (0-10)")


class DimensionReasons(BaseModel):
    """维度评分理由（数据库存储格式）"""
    urgency: Optional[str] = None
    frequency: Optional[str] = None
    market_size: Optional[str] = None
    monetization: Optional[str] = None
    barrier_to_entry: Optional[str] = None


class PainPoint(BaseModel):
    """痛点数据（数据库存储格式）"""
    id: str
    post_id: str
    title: str
    description: str
    user_need: Optional[str] = None
    current_solution: Optional[str] = None
    ideal_solution: Optional[str] = None
    mentioned_competitors: Optional[List[str]] = None
    quotes: Optional[List[str]] = None
    target_personas: Optional[List[str]] = None
    actionable_insights: Optional[List[str]] = None
    industry_code: Optional[str] = None
    type_code: Optional[str] = None
    confidence: float = Field(ge=0, le=1, default=0)
    total_score: float = Field(ge=0, le=10, default=0)
    dimension_scores: Optional[DimensionScores] = None
    dimension_reasons: Optional[DimensionReasons] = None


# ============================================================================
# 辅助函数
# ============================================================================

def calculate_total_score(scores: ScoresDict) -> float:
    """
    计算总分（加权公式）
    
    权重：
    - market_size: 25%
    - urgency: 20%
    - frequency: 20%
    - monetization: 20%
    - barrier_to_entry: 15%
    """
    total = (
        scores.urgency.score * 0.20 +
        scores.frequency.score * 0.20 +
        scores.market_size.score * 0.25 +
        scores.monetization.score * 0.20 +
        scores.barrier_to_entry.score * 0.15
    )
    return round(total, 2)