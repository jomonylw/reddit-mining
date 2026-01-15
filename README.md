# Reddit 痛点挖掘系统

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

一个面向独立开发者的智能工具，通过 AI 分析 Reddit 社区讨论，自动挖掘用户痛点和产品需求，为开发者提供有价值的产品创意来源。

## ✨ 功能特性

- 🔍 **自动抓取** - 自动化抓取 Reddit 帖子，支持配置多个 Subreddit
- 🤖 **AI 智能分析** - 利用 LLM 智能识别真实痛点，过滤噪音
- 📊 **多维度评分** - 从紧迫性、频率、市场规模、变现能力等多维度评估痛点价值
- 🏷️ **分类标签** - 按行业和痛点类型进行分类，便于筛选
- 🌓 **暗色模式** - 支持明暗主题切换
- 📱 **响应式设计** - 适配桌面端和移动端

## 🛠️ 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) + [React 19](https://react.dev/)
- **语言**: [TypeScript 5](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI 组件**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **状态管理**: [TanStack Query](https://tanstack.com/query)
- **图表**: [Recharts](https://recharts.org/)
- **数据库**: [Turso](https://turso.tech/) (SQLite)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)

## 📁 项目结构

```
reddit-mining/
├── src/                    # Next.js 应用
│   ├── app/               # App Router 页面
│   │   ├── api/           # API 路由
│   │   ├── pain-points/   # 痛点详情页
│   │   └── subreddits/    # Subreddit 管理页
│   ├── components/        # React 组件
│   │   ├── business/      # 业务组件
│   │   ├── layout/        # 布局组件
│   │   ├── providers/     # Context Providers
│   │   └── ui/            # UI 基础组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具库
│   │   ├── api/           # API 客户端
│   │   └── db/            # 数据库相关
│   └── types/             # TypeScript 类型定义
├── docs/                   # 项目文档
│   └── plans/             # 设计文档
├── drizzle/                # 数据库迁移文件
└── public/                 # 静态资源
```

## 🚀 快速开始

### 环境要求

- Node.js 20+
- pnpm 9+
- Turso 账户 (或本地 SQLite)

### 安装依赖

```bash
pnpm install
```

### 环境配置

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 配置必要的环境变量：

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

### 数据库初始化

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 初始化种子数据
pnpm db:seed
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📜 可用脚本

| 命令               | 描述                       |
| ------------------ | -------------------------- |
| `pnpm dev`         | 启动开发服务器 (Turbopack) |
| `pnpm build`       | 构建生产版本               |
| `pnpm start`       | 启动生产服务器             |
| `pnpm lint`        | 运行 ESLint 检查           |
| `pnpm format`      | 格式化代码                 |
| `pnpm db:generate` | 生成数据库迁移             |
| `pnpm db:migrate`  | 执行数据库迁移             |
| `pnpm db:studio`   | 打开 Drizzle Studio        |
| `pnpm db:seed`     | 初始化种子数据             |

## 🗃️ 数据模型

系统包含以下核心数据表：

- **subreddits** - Subreddit 配置信息
- **posts** - Reddit 帖子原始数据
- **pain_points** - LLM 分析提取的痛点信息
- **industries** - 行业分类
- **pain_point_types** - 痛点类型分类
- **tags** - 标签系统

## 📖 文档

详细文档请参阅 [`docs/`](./docs/) 目录：

- [产品概述](./docs/plans/product-design/01-产品概述.md)
- [功能模块设计](./docs/plans/product-design/02-功能模块设计.md)
- [数据模型设计](./docs/plans/product-design/03-数据模型设计.md)
- [LLM 处理流程](./docs/plans/product-design/04-LLM处理流程.md)
- [前端界面设计](./docs/plans/product-design/05-前端界面设计.md)
- [API 接口规范](./docs/plans/product-design/06-API接口规范.md)
- [系统架构](./docs/plans/product-design/07-系统架构.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。
