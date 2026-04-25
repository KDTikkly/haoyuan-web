# 昊元 · MEMPHIS PORTFOLIO
## haoyuan-web · 个人作品集

---

## ▌功能特性 · FEATURES

| 模块 | 说明 |
|------|------|
| **首页展示** | 精选项目轮播、实时粒子背景、动态呼吸动效 |
| **项目详情** | Markdown 渲染引擎、Memphis 视觉风格、沉浸式阅读 |
| **地球渲染** | WebGL 自研引擎、等距视角、光影系统、噪声地形 |
| **月球系统** | 动态轨道、陨石粒子、实时阴影投射 |
| **管理员后台** | GitHub API 集成、精选项目实时切换、发布管理 |
| **国际化** | 中英双语支持、一键切换、持久化记忆 |

---

## ▌技术架构 · ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                      昊元 Portfolio                          │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND (Static SPA)                                     │
│  ├── Vue 3 + TypeScript                                     │
│  │   ├── Vite 构建工具                                      │
│  │   ├── Vue Router 路由                                    │
│  │   ├── Pinia 状态管理                                     │
│  │   └── Vue I18n 国际化                                    │
│  ├── Three.js + WebGL                                       │
│  │   └── SuperResEngine 自研渲染引擎                        │
│  │       ├── 地球渲染（噪声地形 + 大气层）                   │
│  │       ├── 月球轨道系统                                    │
│  │       ├── 动态阴影计算                                    │
│  │       └── 粒子系统（陨石/星尘）                          │
│  └── CSS                                                     │
│      └── Memphis × Brutalist 混合风格                       │
├─────────────────────────────────────────────────────────────┤
│  BACKEND (Serverless)                                       │
│  ├── Vercel Functions                                       │
│  │   ├── /api/saveData — GitHub 文件写入                    │
│  │   └── /api/listRepos — 仓库列表查询                      │
│  └── GitHub API v3                                          │
│      └── 作品集数据持久化                                    │
├─────────────────────────────────────────────────────────────┤
│  DEPLOYMENT                                                 │
│  ├── Vercel (Frontend + Functions)                          │
│  ├── GitHub (数据 + CI/CD)                                  │
│  └── Cloudflare R2 (CDN 加速)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ▌目录结构 · STRUCTURE

```
portfolio-frontend/
├── public/
│   └── data/
│       └── projects.json          # 作品集数据源
├── src/
│   ├── api/
│   │   ├── http.ts               # HTTP 客户端封装
│   │   └── projectService.ts    # 作品数据服务
│   ├── assets/
│   │   ├── main.css             # 全局样式 + Memphis 变量
│   │   └── memes/               # Memphis 装饰图片
│   ├── components/
│   │   ├── AppNav.vue           # 导航栏
│   │   ├── ProjectCard.vue      # 项目卡片
│   │   ├── ParticleBg.vue       # 粒子背景
│   │   └── ScrollHint.vue      # 滚动提示
│   ├── router/
│   │   └── index.ts             # 路由配置
│   ├── stores/
│   │   └── app.ts               # 全局状态管理
│   ├── utils/
│   │   ├── SuperResEngine.js   # WebGL 地球渲染引擎
│   │   └── physics.ts          # 物理模拟工具
│   ├── views/
│   │   ├── HomeView.vue         # 首页
│   │   ├── ProjectsView.vue     # 作品列表
│   │   ├── ProjectDetail.vue    # 项目详情
│   │   └── AdminView.vue        # 管理后台
│   ├── i18n/
│   │   ├── index.ts             # 国际化配置
│   │   ├── zh.ts                # 中文语言包
│   │   └── en.ts                # 英文语言包
│   ├── App.vue
│   └── main.ts
├── vercel.json
├── package.json
└── vite.config.ts
```

---

## ▌运行开发 · DEVELOPMENT

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## ▌设计规范 · DESIGN SYSTEM

### 色彩系统 · COLOR PALETTE

| 名称 | 色值 | 用途 |
|------|------|------|
| Memphis Pink | `#FF3366` | 主强调色、CTA 按钮 |
| Memphis Yellow | `#FFE066` | 辅助强调、装饰元素 |
| Memphis Blue | `#3366FF` | 链接、次要操作 |
| Memphis Green | `#00D9A5` | 成功状态、在线指示 |
| Deep Space | `#0A0A0F` | 主背景 |
| Grid Line | `#1A1A2E` | 分割线、网格 |

### 字体系统 · TYPOGRAPHY

- **中文**：Noto Sans SC (400/700)
- **英文**：Space Grotesk (400/500/700)
- **代码**：JetBrains Mono

---

## 昊元 · 2026
*Memphis × Brutalist · 不妥协的设计*
