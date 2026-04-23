# Corealis — 数字分身终端

> Memphis × Brutalist 设计语言的个人作品集网站  
> 生产地址：**https://haoyuanlin.uk**

---

## 项目简介

Corealis 不是普通的个人简历，而是一个沉浸式数字分身终端：

- **Memphis 孟菲斯**风格：3px 硬边框、纯黑硬阴影、高饱和色板
- **AI 画板背景**：可在任意页面自由涂鸦，AI 实时识别笔迹
- **Steam 游戏库**：127 款游戏数据终端，完整统计面板
- **B站三段式 Navbar**：Logo + 搜索栏 + 语言切换 / 导航分类双行布局
- **中英双语**：全站 i18n，一键切换
- **纯静态**：零后端，部署在 Vercel 全球 CDN

---

## 快速启动

```bash
# 进入前端目录
cd portfolio-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → http://localhost:5173
```

---

## 项目结构

```
.
├── portfolio-frontend/          # Vue 3 + Vite 前端（唯一活跃服务）
│   ├── public/
│   │   ├── data/
│   │   │   ├── projects.json    # 项目数据（双语）
│   │   │   └── content/         # 项目详情 Markdown
│   │   └── assets/
│   │       ├── covers/          # 项目封面图
│   │       └── images/          # 头像等静态图片
│   ├── src/
│   │   ├── App.vue              # 全局布局 + Navbar
│   │   ├── views/               # 5 个页面路由
│   │   ├── components/          # 核心组件
│   │   ├── locales/             # i18n 文案（zh/en）
│   │   └── composables/         # useAdmin 权限状态
│   ├── tailwind.config.js       # Memphis 设计 Token
│   └── vite.config.js
│
├── portfolio-backend/           # ⚠️ 已废弃，仅存档
│
├── PROJECT_PDM_v8.4.md          # 产品开发手册（最新）
├── AGENT_HANDOVER.md            # AI Agent 接管文档
└── README.md                    # 本文件
```

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + `<script setup>` | 主框架 |
| Vite | 构建工具 |
| Tailwind CSS | 样式（含自定义 Memphis Token）|
| Pinia | 全局状态（isAdmin）|
| vue-i18n | 中英双语 |
| GSAP + ScrollTrigger | 动画 |
| matter-js | 物理背景动效 |
| marked | Markdown 渲染 |
| @vueuse/core | 工具函数 |

---

## 设计语言速查

```css
/* 必须使用 */
border: 3px solid #1A1A1A;
box-shadow: 5px 5px 0 0 #1A1A1A;   /* 硬阴影，无模糊 */

/* 禁止使用 */
border-radius: ...;    /* 无圆角 */
filter: blur(...);     /* 无模糊 */
background: linear-gradient(...);  /* 无渐变 */
```

**色板**：`#FAF8F5`（底色）`#FFD600`（黄）`#2979FF`（蓝）`#FF6B6B`（珊瑚）`#00E5A0`（薄荷）

---

## 部署

推送到 `main` 分支后 Vercel 自动构建：

```
Build Command : vite build
Output Dir    : dist
Node Version  : 18.x
```

`vercel.json` 已配置 SPA fallback rewrite，无需额外设置。

---

## AI Agent 接管

请直接阅读 **[AGENT_HANDOVER.md](./AGENT_HANDOVER.md)**，包含：
- 当前功能完成度
- 文件结构速查
- 设计约束清单
- Navbar 高度联动说明
- Git commit 规范

---

*v8.4 — 2026-04-24*
