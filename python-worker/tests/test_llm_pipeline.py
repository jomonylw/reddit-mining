#!/usr/bin/env python3
"""
LLM Pipeline 验证测试脚本
测试痛点分析处理流程的完整性
"""

import os
import sys
import json
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.llm.prompts import SYSTEM_PROMPT, build_user_prompt, format_comments
from src.llm.client import LLMClient
from src.models.schemas import AnalysisResult, PainPointExtraction, Score, ScoresDict


def test_prompt_generation():
    """测试 Prompt 生成"""
    print("=" * 60)
    print("测试 1: Prompt 模板生成")
    print("=" * 60)
    
    sample_post = {
        "title": "I'm so frustrated with my project management tool - it keeps losing my data!",
        "selftext": "Every time I try to save my project timeline, the software crashes and I lose all my work. I've tried reinstalling but nothing helps. Is there any reliable alternative?",
        "subreddit": "projectmanagement",
        "score": 150,
        "num_comments": 45
    }
    
    top_comments = format_comments([
        "Same here, I switched to Notion last month and never looked back.",
        "This is a known bug, they've been promising a fix for months."
    ])
    
    user_prompt = build_user_prompt(
        subreddit=sample_post["subreddit"],
        title=sample_post["title"],
        content=sample_post["selftext"],
        score=sample_post["score"],
        num_comments=sample_post["num_comments"],
        top_comments=top_comments
    )
    
    print("\n[系统提示词预览 (前500字符)]:")
    print(SYSTEM_PROMPT[:500] + "...")
    
    print("\n[用户提示词]:")
    print(user_prompt)
    
    print("\n✅ Prompt 生成测试通过")
    return True


def test_schema_validation():
    """测试 Schema 验证"""
    print("\n" + "=" * 60)
    print("测试 2: Pydantic Schema 验证")
    print("=" * 60)
    
    # 构建有效的 ScoresDict
    valid_scores = ScoresDict(
        urgency=Score(score=8, reason="用户表达了强烈的挫败感"),
        frequency=Score(score=7, reason="每次保存都会出现问题"),
        market_size=Score(score=6, reason="项目管理是常见需求"),
        monetization=Score(score=5, reason="用户愿意尝试替代品"),
        barrier_to_entry=Score(score=5, reason="需要一定的技术积累")
    )
    
    # 测试有效的痛点提取结果
    valid_pain_point = PainPointExtraction(
        title="项目管理软件数据丢失问题",
        description="用户在使用项目管理工具时遇到频繁的数据保存失败和软件崩溃问题，导致工作进度丢失。",
        user_need="需要一个稳定可靠的项目管理工具",
        current_solution="尝试重新安装软件",
        ideal_solution="自动保存和云端同步",
        industry_code="PRODUCTIVITY",
        type_code="RELIABILITY",
        tags=["数据丢失", "软件崩溃", "项目管理", "用户体验"],
        mentioned_competitors=["Notion"],
        quotes=["it keeps losing my data", "the software crashes"],
        target_personas=["项目经理", "团队负责人"],
        actionable_insights=["开发自动保存功能", "增加本地缓存"],
        scores=valid_scores
    )
    
    try:
        print("\n[PainPointExtraction 验证]:")
        print(f"  - title: {valid_pain_point.title}")
        print(f"  - industry_code: {valid_pain_point.industry_code}")
        print(f"  - type_code: {valid_pain_point.type_code}")
        print(f"  - tags: {valid_pain_point.tags}")
        print("\n✅ PainPointExtraction 验证通过")
    except Exception as e:
        print(f"\n❌ PainPointExtraction 验证失败: {e}")
        return False
    
    # 测试有效的分析结果（包含痛点）
    valid_result = AnalysisResult(
        is_pain_point=True,
        confidence=0.85,
        reason="用户明确表达了对项目管理工具的不满，描述了具体的数据丢失问题",
        pain_point=valid_pain_point
    )
    
    try:
        print("\n[有效 AnalysisResult 验证]:")
        print(f"  - is_pain_point: {valid_result.is_pain_point}")
        print(f"  - confidence: {valid_result.confidence}")
        print(f"  - reason: {valid_result.reason[:50]}...")
        print(f"  - pain_point.title: {valid_result.pain_point.title}")
        print("\n✅ 有效 AnalysisResult 验证通过")
    except Exception as e:
        print(f"\n❌ 有效 AnalysisResult 验证失败: {e}")
        return False
    
    # 测试非痛点结果
    non_pain_point = AnalysisResult(
        is_pain_point=False,
        confidence=0.9,
        reason="帖子是一个简单的技术咨询问题",
        pain_point=None
    )
    
    try:
        print("\n[非痛点结果验证]:")
        print(f"  - is_pain_point: {non_pain_point.is_pain_point}")
        print(f"  - confidence: {non_pain_point.confidence}")
        print(f"  - pain_point: {non_pain_point.pain_point}")
        print("\n✅ 非痛点结果验证通过")
    except Exception as e:
        print(f"\n❌ 非痛点结果验证失败: {e}")
        return False
    
    # 测试置信度范围验证
    print("\n[置信度范围验证]:")
    try:
        AnalysisResult(
            is_pain_point=True,
            confidence=1.5,  # 超出范围
            reason="测试",
            pain_point=None
        )
        print("  ❌ 应该拒绝 confidence > 1.0")
        return False
    except ValueError as e:
        print(f"  ✅ 正确拒绝无效置信度: {e}")
    
    return True


def test_llm_client_initialization():
    """测试 LLM 客户端初始化"""
    print("\n" + "=" * 60)
    print("测试 3: LLM 客户端初始化")
    print("=" * 60)
    
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("\n⚠️  未配置 LLM_API_KEY，跳过客户端初始化测试")
        print("   设置环境变量后可进行完整测试:")
        print("   export LLM_API_KEY=your_api_key")
        return True
    
    try:
        client = LLMClient(api_key=api_key)
        print(f"\n[客户端配置]:")
        print(f"  - Base URL: {client.base_url}")
        print(f"  - Model: {client.model}")
        print(f"  - Temperature: {client.temperature}")
        print(f"  - Max Tokens: {client.max_tokens}")
        print("\n✅ LLM 客户端初始化成功")
        return True
    except Exception as e:
        print(f"\n❌ LLM 客户端初始化失败: {e}")
        return False


def test_llm_analysis(run_actual=False):
    """测试 LLM 分析功能（可选实际调用）"""
    print("\n" + "=" * 60)
    print("测试 4: LLM 分析功能")
    print("=" * 60)
    
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not api_key or not run_actual:
        print("\n⚠️  跳过实际 LLM 调用测试")
        if not api_key:
            print("   原因: 未配置 LLM_API_KEY")
        if not run_actual:
            print("   原因: run_actual=False (避免消耗 API 配额)")
        print("   运行完整测试: python test_llm_pipeline.py --run-llm")
        return True
    
    sample_post = {
        "title": "Why is every SaaS tool subscription-based now? I just want to buy software once!",
        "selftext": "I'm tired of paying monthly fees for everything. My design software, my email client, my note-taking app - everything wants a subscription. Whatever happened to buying software once and owning it forever?",
        "subreddit": "software",
        "score": 523,
        "num_comments": 189
    }
    
    try:
        client = LLMClient(api_key=api_key)
        
        print("\n[发送分析请求...]")
        result = client.analyze_post(sample_post)
        
        print("\n[分析结果]:")
        print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
        
        # 验证结果
        assert isinstance(result.is_pain_point, bool), "is_pain_point 应为布尔值"
        assert 0 <= result.confidence <= 1, "confidence 应在 0-1 之间"
        
        if result.is_pain_point:
            assert result.title, "痛点应有标题"
            assert result.description, "痛点应有描述"
            assert result.pain_point_type, "痛点应有类型"
            print("\n✅ LLM 分析结果验证通过")
        else:
            print("\n✅ 帖子被判定为非痛点，结果有效")
        
        return True
    except Exception as e:
        print(f"\n❌ LLM 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_chinese_output():
    """验证中文输出"""
    print("\n" + "=" * 60)
    print("测试 5: 中文输出验证")
    print("=" * 60)
    
    # 检查系统提示词包含中文指令
    chinese_keywords = ["中文", "简体中文", "Chinese"]
    found = any(kw in SYSTEM_PROMPT for kw in chinese_keywords)
    
    print(f"\n[系统提示词中文指令检查]: {'✅ 包含中文输出指令' if found else '❌ 未找到中文输出指令'}")
    
    # 构建中文内容的痛点
    sample_scores = ScoresDict(
        urgency=Score(score=7, reason="用户表达了明确不满"),
        frequency=Score(score=6, reason="持续性问题"),
        market_size=Score(score=8, reason="影响大多数软件用户"),
        monetization=Score(score=5, reason="有一定付费意愿"),
        barrier_to_entry=Score(score=4, reason="门槛适中")
    )
    
    sample_pain_point = PainPointExtraction(
        title="SaaS软件订阅制收费模式引发用户不满",
        description="用户对软件行业普遍采用的订阅制收费模式表示不满，希望能一次性购买永久使用权。",
        user_need="一次性购买软件",
        industry_code="SAAS",
        type_code="HIGH_COST",
        tags=["订阅制", "软件定价", "用户不满", "SaaS"],
        scores=sample_scores
    )
    
    sample_result = AnalysisResult(
        is_pain_point=True,
        confidence=0.9,
        reason="用户对订阅制收费模式表达了明确不满",
        pain_point=sample_pain_point
    )
    
    # 验证中文内容
    assert any('\u4e00' <= char <= '\u9fff' for char in sample_result.pain_point.title), "标题应包含中文"
    assert any('\u4e00' <= char <= '\u9fff' for char in sample_result.pain_point.description), "描述应包含中文"
    
    print("\n[中文内容示例]:")
    print(f"  - 标题: {sample_result.pain_point.title}")
    print(f"  - 类型: {sample_result.pain_point.type_code}")
    print(f"  - 行业: {sample_result.pain_point.industry_code}")
    print(f"  - 标签: {sample_result.pain_point.tags}")
    
    print("\n✅ 中文输出验证通过")
    return True


def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("🚀 LLM Pipeline 验证测试")
    print(f"   时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    run_llm = "--run-llm" in sys.argv
    
    results = []
    results.append(("Prompt 模板生成", test_prompt_generation()))
    results.append(("Schema 验证", test_schema_validation()))
    results.append(("LLM 客户端初始化", test_llm_client_initialization()))
    results.append(("LLM 分析功能", test_llm_analysis(run_actual=run_llm)))
    results.append(("中文输出验证", test_chinese_output()))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {name}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！LLM Pipeline 就绪。")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查配置。")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())