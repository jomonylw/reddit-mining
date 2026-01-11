import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// 创建 LibSQL 客户端
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 创建 Drizzle ORM 实例
export const db = drizzle(client, { schema });

// 导出客户端以便需要时使用原生查询
export { client };