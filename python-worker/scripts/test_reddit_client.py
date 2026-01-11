#!/usr/bin/env python3
"""
Reddit 客户端连接测试脚本

测试内容：
1. Token 获取
2. API 连接
3. 帖子获取
4. 评论获取

使用方法：
  cd python-worker
  python scripts/test_reddit_client.py
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.reddit.client import RedditClient, TimeFilter


def print_separator():
    print("\n" + "=" * 60 + "\n")


def test_token():
    """测试 Token 获取"""
    print("📌 测试 1: Token 获取")
    print("-" * 40)
    
    client = RedditClient()
    
    # 检查凭证配置
    if not client.app_id or not client.app_secret:
        print("❌ 错误: Reddit API 凭证未配置")
        print("   请在 .env 文件中设置:")
        print("   - REDDIT_CLIENT_ID")
        print("   - REDDIT_CLIENT_SECRET")
        return False, None
    
    print(f"✓ App ID 已配置: {client.app_id[:8]}...")
    print(f"✓ User Agent: {client.user_agent}")
    
    # 尝试获取 token
    if client.access_token:
        print(f"✓ 从缓存加载 Token: {client.access_token[:20]}...")
    else:
        success = client._get_new_token()
        if success:
            print(f"✓ 成功获取新 Token: {client.access_token[:20]}...")
        else:
            print("❌ 获取 Token 失败")
            return False, None
    
    return True, client


def test_api_connection(client: RedditClient):
    """测试 API 连接"""
    print("📌 测试 2: API 连接")
    print("-" * 40)
    
    try:
        # 使用公开 API 测试（subreddit about）
        response = client._make_request("GET", "/r/SaaS/about")
        
        if "data" in response:
            data = response["data"]
            print("✓ API 连接正常")
            print(f"  Subreddit: {data.get('display_name', 'N/A')}")
            print(f"  订阅者: {data.get('subscribers', 0):,}")
            print(f"  描述: {(data.get('public_description', '') or '')[:60]}...")
            return True
        else:
            print("⚠️ API 响应格式异常")
            return False
    except Exception as e:
        print(f"❌ API 连接失败: {e}")
        return False


def test_fetch_posts(client: RedditClient, subreddit: str = "SaaS"):
    """测试帖子获取"""
    print(f"📌 测试 3: 获取帖子 (r/{subreddit})")
    print("-" * 40)
    
    try:
        # 获取少量帖子用于测试
        posts = client.get_top_posts(
            subreddit=subreddit,
            time_filter=TimeFilter.WEEK,
            limit=5,
            max_pages=1,
            fetch_comments=False,  # 先不获取评论
        )
        
        print(f"✓ 成功获取 {len(posts)} 个帖子")
        
        if posts:
            print("\n  帖子列表:")
            for i, post in enumerate(posts[:5], 1):
                title = post.title[:50] + "..." if len(post.title or "") > 50 else post.title
                print(f"  {i}. [{post.score}↑] {title}")
                print(f"     ID: {post.id} | 评论: {post.num_comments}")
        
        return True, posts
    except Exception as e:
        print(f"❌ 获取帖子失败: {e}")
        import traceback
        traceback.print_exc()
        return False, []


def test_fetch_comments(client: RedditClient, subreddit: str, post_id: str):
    """测试评论获取"""
    print(f"📌 测试 4: 获取评论 (post_id: {post_id})")
    print("-" * 40)
    
    try:
        comments = client._fetch_top_comments(subreddit, post_id, limit=3)
        
        print(f"✓ 成功获取 {len(comments)} 条评论")
        
        if comments:
            print("\n  评论预览:")
            for i, comment in enumerate(comments, 1):
                preview = comment[:100] + "..." if len(comment) > 100 else comment
                preview = preview.replace("\n", " ")
                print(f"  {i}. {preview}")
        
        return True
    except Exception as e:
        print(f"❌ 获取评论失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_different_subreddits(client: RedditClient):
    """测试不同的 Subreddit"""
    print("📌 测试 5: 多个 Subreddit")
    print("-" * 40)
    
    test_subreddits = ["SaaS", "startups", "webdev", "Python"]
    results = []
    
    for sub in test_subreddits:
        try:
            posts = client.get_top_posts(
                subreddit=sub,
                time_filter=TimeFilter.DAY,
                limit=1,
                max_pages=1,
                fetch_comments=False,
            )
            status = "✓" if posts else "⚠ (空)"
            results.append((sub, True, len(posts)))
            print(f"  {status} r/{sub}: {len(posts)} 帖子")
        except Exception as e:
            results.append((sub, False, 0))
            print(f"  ❌ r/{sub}: {e}")
    
    success_count = sum(1 for _, ok, _ in results if ok)
    print(f"\n  成功率: {success_count}/{len(test_subreddits)}")
    
    return success_count == len(test_subreddits)


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("       Reddit 客户端测试")
    print("=" * 60)
    
    all_passed = True
    
    # 测试 1: Token
    print_separator()
    token_ok, client = test_token()
    if not token_ok:
        print("\n❌ Token 测试失败，无法继续")
        return 1
    
    # 测试 2: API 连接
    print_separator()
    api_ok = test_api_connection(client)
    all_passed = all_passed and api_ok
    
    # 测试 3: 帖子获取
    print_separator()
    subreddit = "SaaS"
    posts_ok, posts = test_fetch_posts(client, subreddit)
    all_passed = all_passed and posts_ok
    
    # 测试 4: 评论获取
    if posts:
        print_separator()
        comments_ok = test_fetch_comments(client, subreddit, posts[0].id)
        all_passed = all_passed and comments_ok
    
    # 测试 5: 多个 Subreddit
    print_separator()
    multi_ok = test_different_subreddits(client)
    all_passed = all_passed and multi_ok
    
    # 总结
    print_separator()
    if all_passed:
        print("✅ 所有测试通过！Reddit 客户端工作正常。")
        return 0
    else:
        print("⚠️ 部分测试失败，请检查日志。")
        return 1


if __name__ == "__main__":
    exit(main())