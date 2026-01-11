import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('🚀 开始执行数据库迁移...');

  // 读取迁移文件
  const migrationsDir = path.join(process.cwd(), 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`📄 执行迁移: ${file}`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    // 分割语句 (使用 --> statement-breakpoint 作为分隔符)
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log('  ✓ 执行成功');
      } catch (error: any) {
        // 忽略 "table already exists" 错误
        if (error.message?.includes('already exists')) {
          console.log(`  ⚠ 表已存在，跳过`);
        } else {
          console.error(`  ✗ 执行失败:`, error.message);
        }
      }
    }
  }

  console.log('✅ 数据库迁移完成！');
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  });