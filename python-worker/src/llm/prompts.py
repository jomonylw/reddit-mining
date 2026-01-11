"""
LLM Prompt 模板
定义系统提示词和用户提示词模板
"""

# ============================================================================
# 系统提示词 (System Prompt)
# ============================================================================

SYSTEM_PROMPT = """你是一位专业的产品分析 AI 助手，专注于从在线社区讨论中识别用户痛点。你的任务是分析 Reddit 帖子，为独立开发者和 SaaS 创业者提取可操作的产品洞察。

## 核心任务

1. **识别真实痛点**：识别用户的抱怨、不满和未被满足的需求
2. **过滤噪音**：排除简单提问、产品推广、一般性讨论等无效内容
3. **提取结构化信息**：从帖子中提取结构化的痛点信息
4. **准确分类**：按行业和类型对痛点进行分类
5. **评估商业价值**：评估痛点对独立开发者的商业价值

## 重要规则

1. **语言要求**：虽然输入内容是英文 Reddit 帖子，但你的所有输出（标题、描述、建议、理由等）必须是**流畅的简体中文**。
2. **输出格式**：必须严格按照 JSON 格式输出，不要添加任何额外文字。
3. **客观分析**：基于帖子内容和评论进行客观分析，不要添加主观臆测。
4. **结合评论**：使用热门评论来验证痛点的真实性和普遍性。

## 痛点识别标准

以下情况应识别为有效痛点：
- 用户明确表达对现有产品/服务的不满
- 用户描述了工作中反复遇到的问题
- 用户在寻找特定问题的解决方案
- 多个评论者表示遇到相同问题

以下情况**不是**有效痛点：
- 单纯的技术问题咨询（如"如何使用 X"）
- 产品推广或自我宣传
- 招聘信息或求职帖
- 纯粹的新闻分享或讨论
- 主观偏好讨论（如"A vs B 哪个好"）

请严格按照用户提示词中指定的 JSON 格式进行响应。"""


# ============================================================================
# 行业分类列表
# ============================================================================

INDUSTRY_LIST = """可用的行业分类：
- DEV_TOOLS: 开发者工具（IDE、调试工具、开发效率工具）
- DEVOPS: DevOps（CI/CD、监控、部署工具）
- DATA: 数据与分析（数据库、BI、数据处理）
- SAAS: SaaS 通用（通用 SaaS 产品）
- MARKETING: 营销（营销自动化、SEO、社交媒体）
- SALES: 销售（CRM、销售自动化）
- PRODUCTIVITY: 效率工具（笔记、任务管理、协作）
- FINANCE: 财务（记账、发票、财务管理）
- HR: 人力资源（招聘、员工管理）
- SECURITY: 安全（网络安全、身份认证）
- ECOMMERCE: 电商（在线销售、支付）
- COMMUNICATION: 通讯（邮件、即时通讯）
- DESIGN: 设计（UI/UX 设计工具）
- AI_ML: AI/ML（人工智能、机器学习）
- OTHER: 其他（未归类）"""


# ============================================================================
# 痛点类型列表
# ============================================================================

PAIN_POINT_TYPE_LIST = """可用的痛点类型：
- MISSING_FEATURE: 功能缺失（产品缺少用户需要的功能）
- POOR_UX: 体验不佳（现有产品难以使用）
- HIGH_COST: 成本过高（价格或资源消耗过高）
- EFFICIENCY: 效率低下（工作流程效率问题）
- INTEGRATION: 集成困难（系统间无法打通）
- RELIABILITY: 稳定性差（产品不稳定或 Bug 多）
- PERFORMANCE: 性能问题（速度慢、资源占用高）
- LEARNING_CURVE: 学习成本高（难以上手）
- NO_SOLUTION: 无解决方案（市场上没有相关产品）
- OTHER: 其他（未归类）"""


# ============================================================================
# 评分指南
# ============================================================================

SCORING_GUIDE = """## 评分指南

各维度评分范围为 1-10 分：

### urgency（紧迫程度）
用户对解决方案的迫切程度。
- 1-3分：可有可无，"would be nice", "someday"
- 4-6分：一般需求，"looking for", "wondering"
- 7-9分：急需解决，"frustrated", "urgent", "hate"
- 10分：极度紧迫，"critical", "blocking", "can't work"

### frequency（发生频率）
问题在用户日常工作中出现的频率。
- 1-3分：偶尔出现，"once in a while", "rarely"
- 4-6分：经常出现，"often", "regularly"
- 7-9分：每天出现，"every day", "constantly"
- 10分：持续存在，"always", "every time"

### market_size（市场规模）
有多少人可能面临同样的问题。
- 1-3分：小众需求，专业细分领域
- 4-6分：中等市场，特定职业群体
- 7-9分：大众需求，通用工具
- 10分：普遍需求，几乎所有开发者都会遇到

### monetization（变现潜力）
用户是否愿意为解决方案付费。
- 1-3分：付费意愿低，免费替代品多
- 4-6分：有付费可能，愿意尝试
- 7-9分：付费意愿高，明确表示愿意付费
- 10分：强烈付费意愿，"shut up and take my money"

### barrier_to_entry（准入门槛）
该机会的竞争壁垒。注意：我们倾向于寻找 4-7 分的机会，避免红海。
- 1-3分：极低门槛，周末项目即可完成，极易被复制
- 4-6分：中等门槛，需要领域知识或数据积累
- 7-9分：较高门槛，需要深厚技术背景
- 10分：极高门槛，需要科研级突破"""


# ============================================================================
# JSON 响应格式模板
# ============================================================================

JSON_FORMAT_TEMPLATE = """{
  "is_pain_point": true或false,
  "confidence": 0.0-1.0之间的置信度,
  "reason": "简要说明你的判断理由（中文）",
  "pain_point": {
    "title": "一句话概括痛点（中文）",
    "description": "痛点的详细描述（中文）",
    "user_need": "用户实际需要什么（中文）",
    "current_solution": "用户目前如何处理这个问题（中文，如有提及）",
    "ideal_solution": "用户期望的解决方案（中文，如有提及）",
    "industry_code": "上述行业分类中的代码",
    "type_code": "上述痛点类型中的代码",
    "tags": ["相关", "标签", "最多5个", "中文"],
    "mentioned_competitors": ["竞品1", "竞品2"],
    "quotes": ["原文引用1（英文原文）", "原文引用2"],
    "target_personas": ["目标角色1（中文）", "目标角色2"],
    "actionable_insights": ["行动建议1（中文）", "行动建议2"],
    "scores": {
      "urgency": {
        "score": 1-10分,
        "reason": "评分理由（中文）"
      },
      "frequency": {
        "score": 1-10分,
        "reason": "评分理由（中文）"
      },
      "market_size": {
        "score": 1-10分,
        "reason": "评分理由（中文）"
      },
      "monetization": {
        "score": 1-10分,
        "reason": "评分理由（中文）"
      },
      "barrier_to_entry": {
        "score": 1-10分,
        "reason": "评分理由（中文）"
      }
    }
  }
}

注意：如果 is_pain_point 为 false，pain_point 字段应为 null。"""


# ============================================================================
# 用户提示词模板
# ============================================================================

USER_PROMPT_TEMPLATE = """请分析以下 Reddit 帖子，判断其是否包含有效的用户痛点。

## 帖子信息
- 社区: r/{subreddit}
- 标题: {title}
- 内容: 
{content}
- 得分: {score}
- 评论数: {num_comments}

## 热门评论（用于验证痛点真实性）
{top_comments}

## 行业分类
{industry_list}

## 痛点类型
{type_list}

{scoring_guide}

## 响应格式
请严格按以下 JSON 格式响应，不要添加任何额外文字：

```json
{json_format}
```

请开始分析帖子："""


def build_user_prompt(
    subreddit: str,
    title: str,
    content: str,
    score: int,
    num_comments: int,
    top_comments: str,
) -> str:
    """
    构建用户提示词
    
    Args:
        subreddit: 社区名称
        title: 帖子标题
        content: 帖子内容
        score: 帖子得分
        num_comments: 评论数
        top_comments: 格式化的热门评论
        
    Returns:
        完整的用户提示词
    """
    # 处理空内容
    if not content or content.strip() == "":
        content = "（无正文内容，仅有标题）"
    
    if not top_comments or top_comments.strip() == "":
        top_comments = "（无热门评论）"
    
    return USER_PROMPT_TEMPLATE.format(
        subreddit=subreddit,
        title=title,
        content=content,
        score=score,
        num_comments=num_comments,
        top_comments=top_comments,
        industry_list=INDUSTRY_LIST,
        type_list=PAIN_POINT_TYPE_LIST,
        scoring_guide=SCORING_GUIDE,
        json_format=JSON_FORMAT_TEMPLATE,
    )


def format_comments(comments: list[str]) -> str:
    """
    格式化评论列表
    
    Args:
        comments: 评论内容列表
        
    Returns:
        格式化的评论字符串
    """
    if not comments:
        return "（无热门评论）"
    
    formatted = []
    for i, comment in enumerate(comments, 1):
        # 截断过长的评论
        if len(comment) > 500:
            comment = comment[:500] + "..."
        formatted.append(f"{i}. {comment}")
    
    return "\n".join(formatted)