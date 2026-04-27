# COREALIS · 数字分身终端

> *"不是简历替代品。是一个可以被感受的空间。"*

**Lyria 的个人作品集网站** — Memphis × Brutalist 设计语言，自定义 WebGL 渲染管线，沉浸式交互体验。

🌐 **生产地址**：[haoyuanlin.uk](https://haoyuanlin.uk)

---

## 目录

- [产品定位](#产品定位)
- [功能模块](#功能模块)
- [技术架构](#技术架构)
- [渲染引擎](#渲染引擎)
- [Serverless API](#serverless-api)
- [目录结构](#目录结构)
- [设计规范](#设计规范)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [部署](#部署)

---

## 产品定位

| 维度 | 定义 |
|---|---|
| 生产域名 | `https://haoyuanlin.uk` |
| 部署平台 | Vercel（纯静态 SPA，零后端） |
| 核心人设 | 开发者 × AI Lab 创始人 × 游戏玩家 |
| 首要受众 | 猎头、投资人、协作开发者 |
| 核心体验 | "超出简历预期"的沉浸感 + Memphis 视觉冲击 |

Memphis 的硬边框、物理引擎的背景、藏在聊天窗里的光锥彩蛋——每一个细节都是有意为之的选择。

---

## 功能模块

### 页面路由

| 路由 | 模块 | 说明 |
|---|---|---|
| `/` | **首页 HomeView** | Memphis 物理引擎画板背景 + Hero 区 + 拖拽重排专业领域卡片 |
| `/projects` | **项目集 ProjectsView** | 项目卡片 + Markdown 侧滑详情面板 |
| `/experience` | **经历 ExperienceView** | 时间轴展示俱乐部/学术/项目经历 |
| `/gaming` | **游戏库 GamingView** | Steam 全量游戏库 + 本地游戏 + Genre 筛选 + A-Z 排序 |
| `/resume` | **简历 ResumeView** | 在线简历浏览 + PDF 下载 |
| `/admin` | **后台 AdminView** | 口令保护的数据管理后台 |

### 核心组件

| 组件 | 功能 |
|---|---|
| `ChatWidget.vue` | 右下角 AI Agent 聊天悬浮窗（Gemini 2.5 Flash 流式对话，含两个隐藏彩蛋） |
| `MemphisGameBg.vue` | 全屏 AI 物理画板背景（matter-js 刚体 + 手绘涂鸦 + Gemini Vision 识图） |
| `HeroSection.vue` | Hero 区（PC `xl:text-9xl` 大字排版 + 动态标语） |
| `FullLibraryPortal.vue` | 全屏游戏库弹窗（平台 Tab × Genre 筛选 × 搜索 × 分页/滚动双模式） |
| `LightConeCard.vue` | 崩铁风格光锥卡片（OpticsEngine 驱动，多层视差 + 彩虹边缘色散） |
| `PhysicsCharm.vue` | matter-js 物理交互小挂件 |
| `SecurityPortal.vue` | 口令验证弹窗（保护后台入口） |

### 隐藏彩蛋

在 AI 聊天窗口中触发特定对话，可解锁两个彩蛋：

- **浪漫明信片** — 粉色信笺风格卡片，OpticsEngine 全息箔光效
- **Genesis Log（光锥）** — 崩铁风格起源档案卡，多维视差 + 物理级薄膜干涉 + 彩虹棱镜边缘色散

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│              Frontend  (SPA · Vercel)            │
│                                                  │
│  Vue 3 · Vite · Tailwind CSS · vue-i18n          │
│  GSAP · matter-js · Three.js · WebGL2            │
│                                                  │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │OpticsEngine│  │SuperRes   │  │Volumetric   │  │
│  │(光学渲染) │  │Engine     │  │Engine       │  │
│  └───────────┘  └───────────┘  └─────────────┘  │
└────────────────────────┬────────────────────────┘
                         │ /api/*
┌────────────────────────▼────────────────────────┐
│         Serverless Functions  (Vercel)           │
│                                                  │
│  chat.js · vision.js · steam.js · saveData.js    │
│  geo.js · verifyAdmin.js · steam-*.js            │
└─────────────────────────────────────────────────┘
```

**依赖版本**

| 技术 | 版本 |
|---|---|
| Vue 3 (Composition API) | ^3.4.0 |
| Vite | ^5.2.0 |
| Vue Router | ^4.3.0 |
| vue-i18n（中英双语） | ^9.14.5 |
| Tailwind CSS | ^3.4.3 |
| GSAP | ^3.12.5 |
| matter-js | ^0.20.0 |
| Three.js | ^0.184.0 |
| @google/generative-ai | ^0.21.0 |
| @vueuse/core | ^10.9.0 |
| marked | ^12.0.0 |

---

## 渲染引擎

项目内置三套自研 WebGL 渲染引擎：

### OpticsEngine.js — AI 级物理光学渲染器 v2.0

专为光锥彩蛋卡片设计，实现崩铁级视觉质感：

- **双腔薄膜干涉**：200nm 薄层 + 500nm 厚层，不同视角产生不同频率彩虹条带
- **5 层全息箔**：粗 / 中 / 细 / 对角线 / 散射，色彩丰富不重复
- **双 GGX 高光 lobe**：锐利高光 + 宽散光，增加层次感
- **棱镜边缘色散**：`edgeDispersion()` — edge proximity × UV gradient → 物理级 R/G/B 三通道独立偏移
- **4 层 Z 轴深度视差**：
  ```
  BG  扫描线装饰  ×0.15  Z=-8px  ← 最底层
  MID 书信正文    ×0.42  Z=-4px
  FG  角色立绘    ×1.00  Z= 0px  ← 参考层
  HUD 标签/角标  ×1.65  Z=+10px ← 最凸出
  ```
- **4-Pass 渲染管线**：Primary → NDS（神经去噪模拟）→ TSGI（时域稳定全局光照）→ Composite

### SuperResEngine.js — 双轨超分辨率渲染管线

- Three.js / WebGL2 实现
- 程序化地球着色器（大陆 / 海洋 / 大气层）
- FBM 分形噪声大陆生成
- 月球系统（月面阴影 + 月相计算）

### VolumetricEngine.js — 体积光学引擎 v8.9

- WebGL2 渲染器
- FPS 看门狗（< 30fps 自动降级保护）
- Ray Marching 体积雾 + 水晶色散

---

## Serverless API

所有函数部署在 Vercel，路径 `/api/*`：

| 接口 | 文件 | 说明 |
|---|---|---|
| `POST /api/chat` | `chat.js` | Gemini 2.5 Flash 流式对话（IP 频率限制：1 分钟 5 次） |
| `POST /api/vision` | `vision.js` | Gemini Vision 涂鸦识图 |
| `GET /api/steam` | `steam.js` | Steam 近期游戏 / 总时长 / 总游戏数 |
| `GET /api/steam-owned` | `steam-owned.js` | Steam 拥有游戏列表 |
| `GET /api/steam-achievements` | `steam-achievements.js` | Steam 成就数据 |
| `POST /api/saveData` | `saveData.js` | GitHub 文件写入（后台数据持久化） |
| `GET /api/geo` | `geo.js` | 访客地理位置查询 |
| `POST /api/verifyAdmin` | `verifyAdmin.js` | 后台口令验证 |

---

## 目录结构

```
project-root/
├── api/                        # Vercel Serverless Functions
│   ├── chat.js                 # Gemini AI 流式聊天代理
│   ├── vision.js               # Gemini Vision 识图
│   ├── steam.js                # Steam 综合数据
│   ├── steam-owned.js          # Steam 游戏列表
│   ├── steam-achievements.js   # Steam 成就
│   ├── saveData.js             # GitHub 文件写入
│   ├── geo.js                  # 地理位置
│   └── verifyAdmin.js          # 管理员鉴权
├── portfolio-frontend/
│   ├── public/
│   │   ├── data/
│   │   │   └── projects.json   # 项目数据（中英双语）
│   │   └── textures/           # 地球 / 月球贴图
│   └── src/
│       ├── views/
│       │   ├── HomeView.vue
│       │   ├── ProjectsView.vue
│       │   ├── GamingView.vue
│       │   ├── ExperienceView.vue
│       │   ├── ResumeView.vue
│       │   └── AdminView.vue
│       ├── components/
│       │   ├── ChatWidget.vue          # AI 聊天悬浮窗（含彩蛋）
│       │   ├── MemphisGameBg.vue       # 物理画板背景
│       │   ├── HeroSection.vue
│       │   ├── LightConeCard.vue       # 光锥卡片
│       │   ├── FullLibraryPortal.vue   # 全屏游戏库
│       │   ├── PhysicsCharm.vue
│       │   └── ...（共 25 个组件）
│       └── utils/
│           ├── OpticsEngine.js         # 物理光学渲染器
│           ├── SuperResEngine.js       # 超分辨率渲染管线
│           ├── VolumetricEngine.js     # 体积光学引擎
│           └── cloudinaryFallbackPool.ts
├── vercel.json
└── README.md
```

---

## 设计规范

### 不可逾越的红线

| 元素 | 规范 |
|---|---|
| 边框 | `border-[3px] border-ink`（`#1A1A1A`）黑色实线 |
| 硬阴影 | `shadow-[4px_4px_0_0_#1A1A1A]`，无模糊，Brutalist 风格 |
| 圆角 | **禁止**（`rounded`）|
| 渐变 | **禁止**（`gradient`）|
| 模糊 | **禁止**（`blur`，navbar `backdrop-blur-sm` 除外）|

### 设计 Token

| Token | 色值 | 用途 |
|---|---|---|
| `warm-white` | `#FAF8F5` | 页面底色 |
| `warm-beige` | `#F5F0E8` | 卡片底色 |
| `ink` | `#1A1A1A` | 主文字 / 边框 / 阴影 |
| `memphis-yellow` | `#FFD600` | 主强调（CTA、AI Lab 徽标）|
| `memphis-blue` | `#2979FF` | 次强调色 |
| `memphis-coral` | `#FF6B6B` | 警告 / 热点色 |
| `memphis-mint` | `#00E5A0` | 成功 / 亮点色 |
| `memphis-pink` | `#FF4081` | 点缀色 |
| `memphis-purple` | `#7C4DFF` | 点缀色 |

### 字体

| 用途 | 字体 |
|---|---|
| 中文内容 | Noto Sans SC |
| 主标题 / 展示字 | Space Grotesk |
| 代码 / 等宽 | JetBrains Mono |
| 数字展示 | Inter Extrabold |

---

## 快速开始

**前置要求**：Node.js ≥ 18，npm ≥ 9

```bash
# 1. 克隆仓库
git clone https://github.com/KDTikkly/haoyuan-web.git
cd haoyuan-web/portfolio-frontend

# 2. 安装依赖
npm install

# 3. 创建环境变量文件（见下方"环境变量"章节）
cp .env.example .env.local

# 4. 启动开发服务器（含 Vercel API 代理）
npm run dev
# → http://localhost:5173

# 5. 构建生产包
npm run build

# 6. 本地预览构建结果
npm run preview
```

如需在本地调试 Serverless API，需安装 Vercel CLI：

```bash
npm i -g vercel
vercel dev   # 同时启动前端(5173) + API(3000)
```

---

## 环境变量

在 Vercel 项目设置的 **Environment Variables** 中配置：

| 变量名 | 必填 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | AI 聊天 + Vision 涂鸦识别（Google AI Studio 获取）|
| `STEAM_API_KEY` | ✅ | Steam 游戏数据展示（[Steam Dev](https://steamcommunity.com/dev/apikey) 获取）|
| `STEAM_ID` | ✅ | Steam 64-bit 账号 ID |
| `ADMIN_PASSWORD` | ✅ | 后台管理登录口令 |

本地开发时在 `portfolio-frontend/.env.local` 中配置（此文件已加入 `.gitignore`）：

```
VITE_GEMINI_API_KEY=your_key_here
```

---

## 部署

项目通过 **GitHub → Vercel** 自动部署：

1. Push 到 `main` 分支 → Vercel 自动触发构建
2. 构建命令：`cd portfolio-frontend && npm install && npm run build`
3. 输出目录：`portfolio-frontend/dist`
4. SPA 路由重写由 `vercel.json` 处理

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

---

## 版本历史

| 版本 | 日期 | 核心变更 |
|---|---|---|
| v9.0 | 2026-04-26 | 全项目双语内容 + JSON 防崩修复 |
| v8.5 | 2026-04-25 | 游戏库 Genre 筛选 + A-Z 默认排序 |
| v8.4 | 2026-04-23 | 手机 FAB 80→60px + PC Hero 区放大 |
| v8.3 | 2026-04-22 | 文档更新 + 光锥彩蛋光学大手术（多层视差 + 薄膜干涉 + 棱镜色散）|
| v8.2 | — | Earth Renderer + Moon System |
| v0.6 | — | 项目初版上线 |

---

## 已知限制

- Navbar 搜索栏仅 UI，无实际搜索逻辑
- 手机端无搜索入口图标
- Steam 游戏无 tags，Genre 筛选仅对本地游戏有效

---

*COREALIS · 2026 — Memphis × Brutalist · No Compromises*
