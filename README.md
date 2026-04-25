# Corealis — 数字分身终端
## Corealis — Digital Avatar Terminal

> **Memphis × Brutalist** 设计语言 · 沉浸式交互终端  
> **Memphis × Brutalist** Design Language · Immersive Interactive Terminal  
> 生产地址 / Live: **https://haoyuanlin.uk**  
> *"把简历做成这样，是因为我实在不想把自己装进一个 PDF 里。"*  
> *"I built this because I refuse to squeeze myself into a PDF."*

---

## ▸ 关于这个项目 / About This Project

```
╔══════════════════════════════════════════════════════════════════╗
║  这是 Lyria 的数字分身 — 不是普通的个人简历，而是一个              ║
║  沉浸式交互终端。                                                ║
║                                                                  ║
║  This is Lyria's digital avatar — not a typical résumé, but      ║
║  an immersive interactive terminal.                               ║
╚══════════════════════════════════════════════════════════════════╝
```

我花了很长时间想明白一件事：简历能写的东西都太薄了。所以我决定把它做成一个网站，一个能让你自己去**感受**的地方，而不只是**阅读**的地方。

Corealis 里藏了一些小彩蛋。如果你足够有耐心，或许会找到它们。♪

I've spent a long time realizing one thing: what a résumé can express is too shallow. So I decided to build a website — a place where you can **feel** things yourself, not just **read** them.

There are some Easter eggs hidden in Corealis. If you're patient enough, maybe you'll find them. ♪

---

## ▸ 技术骨架 / Tech Stack

| 模块 / Module | 技术 / Tech | 说明 / Note |
|--------------|------------|-------------|
| 框架 / Framework | Vue 3 + `<script setup>` + TypeScript | Composition API 全家桶 |
| 构建 / Build | Vite | 快得离谱 / Ridiculously fast |
| 样式 / Styling | Tailwind CSS v3 + Memphis Token | 3px 硬边框，纯黑硬阴影 / 3px hard borders, brutal shadows |
| 路由 / Router | Vue Router 4 | HTML5 History 模式 |
| 国际化 / i18n | vue-i18n | 中英双语一键切换 / One-tap zh/en switch |
| 动画 / Animation | GSAP + CSS Transition | Hero 区专用 / Hero section only |
| 物理背景 / Physics BG | matter-js | MemphisGameBg 画板背景 |
| Markdown | marked | 项目详情渲染 / Project detail rendering |
| 部署 / Deploy | Vercel | 纯静态，SPA，零后端 / Pure static, SPA, zero backend |

---

## ▸ 特色功能 / Features

### 🟡 Memphis 视觉系统
```
    ■■■■  3px 纯黑边框  ■■■■
    ████  硬阴影无模糊  ████
    ■■■■  高饱和色板   ■■■■
```
- 禁止圆角 / 渐变 / 模糊（navbar backdrop-blur 除外）
- No border-radius / gradients / blur (except navbar backdrop-blur)
- 色板：`#FFD600` 黄 · `#2979FF` 蓝 · `#FF6B6B` 珊瑚 · `#00E5A0` 薄荷

### 🎨 AI 画板背景
左下角画笔 FAB 可在任意页面自由涂鸦，matter-js 物理引擎让笔迹自然散落。
The bottom-left drawing FAB lets you doodle anywhere — matter-js physics makes the strokes scatter naturally.

### 🎮 Steam 游戏库
127 款游戏数据终端，完整统计面板。
A terminal for 127 Steam games with full analytics dashboard. Yes, I play seriously.

### 💬 AI Agent 聊天窗
右下角聊天窗口，内藏彩蛋。*我不是在炫技，我是在设计体验。*
Bottom-right chat widget with hidden Easter eggs. *This isn't showing off — it's experience design.*

### 🌍 中英双语
全站 i18n，一键切换。语言设置持久化到 localStorage。
Full i18n across the site, one-tap toggle. Language preference persists via localStorage.

---

## ▸ 快速启动 / Quick Start

```bash
# 克隆仓库
# Clone the repo
git clone https://github.com/KDTikkly/haoyuan-web.git
cd haoyuan-web/portfolio-frontend

# 安装依赖
# Install deps
npm install

# 启动开发服务器
# Start dev server
npm run dev
# → http://localhost:5173
```

---

## ▸ 项目结构 / Project Structure

```
.
├── public/
│   ├── data/
│   │   ├── projects.json          # 项目数据（双语 i18n）
│   │   └── content/               # 项目 Markdown 正文
│   │       ├── cosmolyra.md
│   │       ├── cosmolyra.en.md
│   │       └── ...
│   └── assets/covers/             # 项目封面图
│
├── src/
│   ├── api/
│   │   ├── http.ts               # axios 封装（相对路径）
│   │   └── projectService.ts     # 项目数据服务（含 featured 实时覆盖）
│   ├── components/
│   │   ├── HeroSection.vue        # 首页英雄区
│   │   ├── ProjectCard.vue        # 项目卡片
│   │   ├── ProjectSlideOver.vue   # 项目详情滑出面板
│   │   ├── ChatWidget.vue         # AI Agent 聊天窗
│   │   ├── MemphisGameBg.vue      # 物理画板背景
│   │   ├── FullLibraryPortal.vue  # 完整游戏库弹窗
│   │   └── ...
│   ├── views/
│   │   ├── HomeView.vue           # /
│   │   ├── ProjectsView.vue      # /projects
│   │   ├── ExperienceView.vue     # /experience
│   │   ├── GamingView.vue         # /gaming
│   │   ├── ResumeView.vue         # /resume
│   │   └── AdminView.vue          # /admin（鉴权保护）
│   ├── locales/
│   │   ├── zh.ts                  # 中文翻译
│   │   └── en.ts                  # 英文翻译
│   └── utils/
│       ├── OpticsEngine.js        # WebGL 光学引擎（聊天窗）
│       └── SuperResEngine.js      # WebGL 超分辨率引擎（项目页）
│
├── tailwind.config.js             # Memphis 设计 Token
├── vite.config.js
└── vercel.json                    # SPA fallback rewrite
```

---

## ▸ 设计规范 / Design Rules

*Memphis 的核心逻辑是 **不妥协**。下面这些规则不是建议，是红线。*

*The core principle of Memphis is **no compromise**. These rules are not suggestions — they are red lines.*

```css
/* 必须使用 / MUST USE */
border: 3px solid #1A1A1A;
box-shadow: 5px 5px 0 0 #1A1A1A;

/* 禁止使用 / FORBIDDEN */
border-radius: 9999px;   /* 圆角 / Rounded corners */
filter: blur(4px);       /* 模糊 / Blur */
background: linear-gradient(...);  /* 渐变 / Gradients */
```

| 场景 / Scenario | 字体 / Font |
|----------------|-------------|
| 展示大标题 / Display titles | `font-display font-extrabold` |
| 标签/代码/数据 / Labels/Code/Data | `font-mono` |
| 正文 / Body | `font-sans` |
| 最小可点击区域 / Min touch target | `min-h-[44px] min-w-[44px]` |

---

## ▸ 部署 / Deployment

推送到 `main` 分支后 Vercel 自动构建：

Push to `main` branch and Vercel builds automatically:

```
Build Command : npm run build
Output Dir    : dist
Node Version  : 18.x
Framework     : Vite
```

---

## ▸ AI Agent 维护 / For AI Agents

如果你是来维护这个项目的 AI，请阅读 **AGENT_HANDOVER.md**：

If you're an AI taking over this project, read **AGENT_HANDOVER.md**:

- 项目结构速查 / Project structure quick reference
- 设计约束清单 / Design constraint checklist (Memphis red lines)
- WebGL 引擎状态 / WebGL engine status
- Git commit 规范 / Git commit conventions
- 已知问题列表 / Known issues list

---

## ▸ 彩蛋提示 / Easter Egg Hints

```
    ┌─────────────────────────────────────┐
    │                                     │
    │   画板上画一个 "corealis" 试试？    │
    │   Draw "corealis" on the canvas     │
    │                                     │
    │   右下角聊天窗口输入 "help" 试试？  │
    │   Type "help" in the chat widget    │
    │                                     │
    │   连续点击 Logo 5次？               │
    │   Click the Logo 5 times?           │
    │                                     │
    └─────────────────────────────────────┘
```

---

<div align="center">

```
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   MEMPHIS × BRUTALIST × NO COMPROMISE    ║
    ║                                           ║
    ║   v9.0 — Lyria — 2026-04-26             ║
    ║   https://haoyuanlin.uk                  ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
```

</div>
