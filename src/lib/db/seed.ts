import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import * as schema from './schema';

// 加载环境变量
config({ path: '.env.local' });

// 从环境变量获取数据库配置
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

/**
 * 行业分类初始数据 - 中文名称
 */
const industriesData: schema.NewIndustry[] = [
  { code: 'DEV_TOOLS', name: '开发者工具', description: '面向开发者的工具和服务', sortOrder: 1 },
  { code: 'DEVOPS', name: 'DevOps', description: '开发运维相关工具', sortOrder: 2 },
  { code: 'DATA', name: '数据与分析', description: '数据处理、分析和可视化', sortOrder: 3 },
  { code: 'SAAS', name: 'SaaS 通用', description: '通用 SaaS 软件服务', sortOrder: 4 },
  { code: 'MARKETING', name: '营销', description: '营销自动化和工具', sortOrder: 5 },
  { code: 'SALES', name: '销售', description: '销售管理和 CRM', sortOrder: 6 },
  { code: 'PRODUCTIVITY', name: '效率工具', description: '生产力和效率提升工具', sortOrder: 7 },
  { code: 'FINANCE', name: '财务', description: '财务管理和会计', sortOrder: 8 },
  { code: 'HR', name: '人力资源', description: '人力资源管理', sortOrder: 9 },
  { code: 'SECURITY', name: '安全', description: '网络安全和数据保护', sortOrder: 10 },
  { code: 'ECOMMERCE', name: '电商', description: '电子商务平台和工具', sortOrder: 11 },
  { code: 'COMMUNICATION', name: '通讯', description: '通讯和协作工具', sortOrder: 12 },
  { code: 'DESIGN', name: '设计', description: '设计工具和资源', sortOrder: 13 },
  { code: 'AI_ML', name: 'AI/ML', description: '人工智能和机器学习', sortOrder: 14 },
  { code: 'OTHER', name: '其他', description: '其他未分类行业', sortOrder: 99 },
];

/**
 * 痛点类型初始数据 - 中文名称
 */
const painPointTypesData: schema.NewPainPointType[] = [
  { code: 'MISSING_FEATURE', name: '功能缺失', description: '现有工具缺少必要的功能', sortOrder: 1 },
  { code: 'POOR_UX', name: '体验不佳', description: '用户体验差、界面不友好', sortOrder: 2 },
  { code: 'HIGH_COST', name: '成本过高', description: '价格昂贵、性价比低', sortOrder: 3 },
  { code: 'EFFICIENCY', name: '效率低下', description: '工作流程繁琐、效率不高', sortOrder: 4 },
  { code: 'INTEGRATION', name: '集成困难', description: '与其他工具集成困难', sortOrder: 5 },
  { code: 'RELIABILITY', name: '稳定性差', description: '系统不稳定、经常出错', sortOrder: 6 },
  { code: 'PERFORMANCE', name: '性能问题', description: '运行速度慢、响应时间长', sortOrder: 7 },
  { code: 'LEARNING_CURVE', name: '学习成本高', description: '上手困难、学习曲线陡峭', sortOrder: 8 },
  { code: 'NO_SOLUTION', name: '无解决方案', description: '市场上没有现成的解决方案', sortOrder: 9 },
  { code: 'OTHER', name: '其他', description: '其他未分类痛点类型', sortOrder: 99 },
];

/**
 * 初始 Subreddit 配置
 */
const subredditsData: schema.NewSubreddit[] = [
  {
    id: uuidv4(),
    name: 'SaaS',
    displayName: 'SaaS',
    description: 'SaaS 软件讨论社区',
    isActive: true,
    fetchFrequency: 'daily',
    postsLimit: 100,
  },
  {
    id: uuidv4(),
    name: 'webdev',
    displayName: 'Web Development',
    description: 'Web 开发讨论社区',
    isActive: true,
    fetchFrequency: 'daily',
    postsLimit: 100,
  },
  {
    id: uuidv4(),
    name: 'Entrepreneur',
    displayName: 'Entrepreneur',
    description: '创业者社区',
    isActive: true,
    fetchFrequency: 'daily',
    postsLimit: 100,
  },
  {
    id: uuidv4(),
    name: 'startups',
    displayName: 'Startups',
    description: '初创公司讨论社区',
    isActive: true,
    fetchFrequency: 'daily',
    postsLimit: 100,
  },
  {
    id: uuidv4(),
    name: 'smallbusiness',
    displayName: 'Small Business',
    description: '小型企业讨论社区',
    isActive: true,
    fetchFrequency: 'daily',
    postsLimit: 100,
  },
];

async function seed() {
  console.log('🌱 开始填充基础数据...');

  try {
    // 填充行业分类
    console.log('📦 填充行业分类数据...');
    for (const industry of industriesData) {
      await db.insert(schema.industries)
        .values(industry)
        .onConflictDoNothing();
    }
    console.log(`✅ 已填充 ${industriesData.length} 个行业分类`);

    // 填充痛点类型
    console.log('📦 填充痛点类型数据...');
    for (const type of painPointTypesData) {
      await db.insert(schema.painPointTypes)
        .values(type)
        .onConflictDoNothing();
    }
    console.log(`✅ 已填充 ${painPointTypesData.length} 个痛点类型`);

    // 填充 Subreddit 配置
    console.log('📦 填充 Subreddit 配置...');
    for (const subreddit of subredditsData) {
      await db.insert(schema.subreddits)
        .values(subreddit)
        .onConflictDoNothing();
    }
    console.log(`✅ 已填充 ${subredditsData.length} 个 Subreddit 配置`);

    console.log('🎉 基础数据填充完成！');
  } catch (error) {
    console.error('❌ 数据填充失败:', error);
    throw error;
  }
}

// 运行 seed
seed()
  .then(() => {
    console.log('✨ Seed 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed 脚本执行失败:', error);
    process.exit(1);
  });