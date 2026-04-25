# Portfolio 项目上下文文档

> 更新时间：2026-04-23（架构迁移：前后端分离 → 纯静态）
> 用途：新 Agent 快速接管，读完即可直接执行后续任务

---

## 一、项目概览

这是一个**个人作品集网站**，纯静态架构，仅部署在 Vercel 上。

| 端 | 仓库目录 | 部署平台 | 生产域名 |
|----|---------|----------|---------|
| 前端（唯一） | `portfolio-frontend/` | Vercel | `https://haoyuanlin.uk` |

> **后端已废弃**：原 Fly.io Go 后端（`portfolio-backend/`）已停止使用。
> 所有数据改为静态文件，由 Vercel 全球边缘节点直接托管。

---

## 二、设计语言 (Design Language)

**Memphis 风格 + Brutalist 排版**

- **色板**（`tailwind.config.js` 中定义）：

  | Token | 颜色值 | 用途 |
  |-------|--------|------|
  | `warm-white` | `#FAF8F5` | 页面底色 |
  | `warm-beige` | `#F5F0E8` | 卡片底色 |
  | `ink` | `#1A1A1A` | 主文字 |
  | `ink-light` | `#3A3A3A` | 次要文字 |
  | `memphis-yellow` | `#FFD600` | 主强调色 |
  | `memphis-blue` | `#2979FF` | 次强调色 |
  | `memphis-coral` | `#FF6B6B` | 警告/热点色 |
  | `memphis-mint` | `#00E5A0` | 成功/亮点色 |
  | `memphis-pink` | `#FF4081` | 粉色点缀 |
  | `memphis-purple` | `#7C4DFF` | 紫色点缀 |

- **阴影系统**（Brutalist 硬阴影，无模糊）：

  | Class | 值 |
  |-------|----|
  | `shadow-hard-sm` | `3px 3px 0 0 #1A1A1A` |
  | `shadow-hard` | `5px 5px 0 0 #1A1A1A` |
  | `shadow-hard-lg` | `8px 8px 0 0 #1A1A1A` |
  | `shadow-hard-xl` | `12px 12px 0 0 #1A1A1A` |
  | `shadow-hard-yellow` | `5px 5px 0 0 #FFD600` |
  | `shadow-hard-blue` | `5px 5px 0 0 #2979FF` |
  | `shadow-hard-coral` | `5px 5px 0 0 #FF6B6B` |
  | `shadow-hard-mint` | `5px 5px 0 0 #00E5A0` |

- **字体栈**：

  | 用途 | 字体 |
  |------|------|
  | `font-sans`（正文） | Inter → system-ui |
  | `font-display`（标题） | Space Grotesk → Inter |
  | `font-mono`（代码） | JetBrains Mono |

- **边框**：3px 实线黑色（`border-3 border-ink`）是典型元素

---

## 三、技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | `^3.4.0` | Composition API，`<script setup>` 语法 |
| Vite | `^5.2.0` | 构建工具，配置文件 `vite.config.js` |
| Vue Router | `^4.3.0` | HTML5 History 模式 |
| vue-i18n | `^9.14.5` | 中英双语 |
| Axios | `^1.15.2` | HTTP 客户端，封装在 `src/api/http.ts` |
| Tailwind CSS | `^3.4.3` | 样式框架 |
| GSAP | `^3.12.5` | 动画库 |
| matter-js | `^0.20.0` | 物理引擎（用于背景动效） |
| marked | `^12.0.0` | Markdown 渲染 |
| @vueuse/core | `^10.9.0` | Vue 工具函数集 |

---

## 四、目录结构

```
portfolio-frontend/
├── public/
│   ├── data/
│   │   ├── projects.json          # 项目数据（双语 i18n 对象）
│   │   └── content/               # 项目 Markdown 正文
│   │       ├── cosmolyra.md
│   │       ├── fgo-analysis.md
│   │       ├── lstm-stock.md
│   │       └── fate-only-event.md
│   └── assets/
│       ├── covers/                # 项目封面图（.png）
│       └── media/                 # 项目媒体文件（.jpg 等）
├── src/
│   ├── main.js                    # 应用入口，路由注册，i18n 挂载
│   ├── App.vue                    # 根组件
│   ├── i18n.ts                    # 国际化配置
│   ├── api/
│   │   ├── http.ts                # axios 封装（无 baseURL，纯相对路径）
│   │   └── projectService.ts      # 读取 /data/projects.json，客户端 locale flatten
│   ├── assets/css/main.css        # 全局样式
│   ├── components/
│   │   ├── CustomCursor.vue
│   │   ├── GamingProfile.vue
│   │   ├── HeroSection.vue
│   │   ├── LangToggle.vue
│   │   ├── MemphisGameBg.vue
│   │   ├── MemphisPlaceholder.vue
│   │   ├── ProjectCard.vue
│   │   └── ProjectSlideOver.vue
│   ├── locales/
│   │   ├── en.ts
│   │   └── zh.ts
│   ├── types/project.ts           # TypeScript 类型定义
│   └── views/
│       ├── HomeView.vue           # /
│       ├── ExperienceView.vue     # /experience
│       ├── ProjectsView.vue       # /projects
│       ├── GamingView.vue         # /gaming
│       └── ResumeView.vue         # /resume
├── index.html
├── vite.config.js
├── tailwind.config.js
├── vercel.json
└── .env.production                # 空（纯静态无需环境变量）
```

---

## 五、数据架构

### projects.json 结构

`public/data/projects.json` 是一个数组，每项字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，与文件名对应 |
| `title` | `{zh, en}` | 双语标题，前端按当前 locale 取值 |
| `subtitle` | `{zh, en}` | 双语副标题 |
| `description` | `{zh, en}` | 双语描述 |
| `tags` | string[] | 标签，用于前端筛选 |
| `cover` | string | 封面路径，如 `/assets/covers/cosmolyra.png` |
| `content_type` | `"markdown"` | 内容类型 |
| `content_path` | string | Markdown 文件路径，如 `/data/content/cosmolyra.md` |
| `media` | MediaItem[] | 额外媒体（image / bilibili） |
| `external_links` | ExternalLink[] | 外部链接 |
| `featured` | boolean | 是否精选 |
| `date` | string | 日期（YYYY-MM） |

### 数据流

```
浏览器请求
  │
  ├─ axios GET /data/projects.json   → Vercel CDN → public/data/projects.json
  ├─ axios GET /data/content/*.md    → Vercel CDN → public/data/content/
  └─ <img src="/assets/covers/...">  → Vercel CDN → public/assets/covers/
```

客户端在 `projectService.ts` 中完成：
- 语言 flatten（`{zh, en}` → `string`）
- tag 过滤
- id 查找

---

## 六、API 层实现

### `src/api/http.ts`

```ts
// 无 baseURL，所有请求使用相对路径（指向 public/）
const http = axios.create({ timeout: 10_000, headers: { Accept: 'application/json' } })
```

### `src/api/projectService.ts`

| 函数 | 实现方式 |
|------|---------|
| `fetchProjects(tag?)` | GET `/data/projects.json` → 客户端 filter + flatten |
| `fetchProjectById(id)` | 复用缓存 JSON → `Array.find` |
| `fetchProjectContent(id)` | GET `project.content_path`（如 `/data/content/cosmolyra.md`） |

内部有简单的内存缓存（`_cache`），避免重复请求 JSON 文件。

---

## 七、部署配置

### Vercel

- **`vercel.json`**：
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
  只做 SPA fallback，无 Serverless Function。

- **Build**：Framework = Vite，Build = `vite build`，Output = `dist`
- **环境变量**：无需任何环境变量

### DNS（Cloudflare，`haoyuanlin.uk`）

| 类型 | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `58229ec17e18cace.vercel-dns-017.com` | DNS only（灰色） |
| CNAME | `www` | `58229ec17e18cace.vercel-dns-017.com` | DNS only（灰色） |

> `api` 子域名的 CNAME 已不再需要（Fly.io 后端已废弃）。

---

## 八、本地开发快速启动

```bash
cd portfolio-frontend
npm install
npm run dev
# 浏览器打开 http://localhost:5173
# /data/* 和 /assets/* 直接由 Vite 从 public/ 目录提供，无需后端
```

---

## 九、新增内容注意事项

### 添加新项目

1. 在 `public/data/content/` 新建 `<id>.md`
2. 在 `public/assets/covers/` 放封面图 `<id>.png`
3. 在 `public/data/projects.json` 追加一条记录

### 添加新页面

1. 在 `src/views/` 新建 `XxxView.vue`
2. 在 `src/main.js` 的 `routes` 数组添加路由
3. 在 `src/locales/zh.ts` 和 `en.ts` 添加翻译

---

## 十、下次 Prompt 使用方式

提交本文件时附加需求即可直接执行，例如：

```
[附上 PROJECT_CONTEXT.md]

需求：在 ProjectsView 新增「筛选标签」功能，
支持按技术栈（Web3/AI/Operations）过滤项目卡片，
筛选条件以 Memphis 风格的彩色 tag 按钮展示。
```
