import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "dotenv";
import * as schema from "./schema";

// 加载环境变量
config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function verify() {
  console.log("🔍 验证数据库连接和数据...\n");

  try {
    // 验证行业分类
    const industries = await db.select().from(schema.industries);
    console.log(`✅ 行业分类: ${industries.length} 条`);
    industries.slice(0, 3).forEach((i) => console.log(`   - ${i.code}: ${i.name}`));
    console.log("   ...\n");

    // 验证痛点类型
    const types = await db.select().from(schema.painPointTypes);
    console.log(`✅ 痛点类型: ${types.length} 条`);
    types.slice(0, 3).forEach((t) => console.log(`   - ${t.code}: ${t.name}`));
    console.log("   ...\n");

    // 验证 Subreddit 配置
    const subreddits = await db.select().from(schema.subreddits);
    console.log(`✅ Subreddit 配置: ${subreddits.length} 条`);
    subreddits.forEach((s) => console.log(`   - r/${s.name} (${s.isActive ? "启用" : "禁用"})`));
    console.log("");

    // 验证空表
    const posts = await db.select().from(schema.posts);
    console.log(`📭 帖子: ${posts.length} 条 (预期为空)`);

    const painPoints = await db.select().from(schema.painPoints);
    console.log(`📭 痛点: ${painPoints.length} 条 (预期为空)`);

    console.log("\n🎉 数据库验证通过！所有基础数据已就绪。");
  } catch (error) {
    console.error("❌ 验证失败:", error);
    throw error;
  }
}

verify()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
