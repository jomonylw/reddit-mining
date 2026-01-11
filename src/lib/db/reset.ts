import { createClient } from "@libsql/client";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// 加载环境变量
config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 本项目需要的表
const projectTables = [
  "pain_point_tags",
  "pain_points",
  "posts",
  "subreddits",
  "tags",
  "industries",
  "pain_point_types",
];

async function reset() {
  console.log("🧹 开始重置数据库表...");

  // 按外键依赖顺序删除表
  for (const table of projectTables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`  ✓ 删除表: ${table}`);
    } catch (error) {
      console.log(`  ⚠ 删除表 ${table} 失败:`, error);
    }
  }

  console.log("");
  console.log("🚀 开始创建新表...");

  // 读取迁移文件
  const migrationsDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`📄 执行迁移: ${file}`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    // 分割语句
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log("  ✓ 执行成功");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("already exists")) {
          console.log(`  ⚠ 已存在，跳过`);
        } else {
          console.error(`  ✗ 执行失败:`, errorMessage);
        }
      }
    }
  }

  console.log("");
  console.log("✅ 数据库重置完成！");
}

reset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 重置失败:", error);
    process.exit(1);
  });
