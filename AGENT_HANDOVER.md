# AGENT HANDOVER — Corealis v8.4

> 读完此文件即可直接接管项目，无需阅读其他文档。  
> 更新时间：2026-04-24 | 最新 commit：见下方 Git 历史

---

## 快速定位

| 项目 | 值 |
|---|---|
| 仓库根目录 | `c:/Users/KDVON/CodeBuddy/20260422231627/` |
| 前端目录 | `portfolio-frontend/` |
| 生产地址 | `https://haoyuanlin.uk` |
| 部署平台 | Vercel（auto-deploy on push to `main`）|
| 后端 | **已废弃**（`portfolio-backend/` 目录保留但不运行）|

### 立即启动本地开发

```bash
cd portfolio-frontend
npm install          # 首次
npm run dev          # http://localhost:5173
```

---

## 当前项目状态（v8.4）

### 完成的功能

- [x] Memphis + Brutalist 全站设计语言
- [x] B站三段式 Navbar（双行，共 100px）
  - 第一行：Logo | 搜索栏（PC） | 语言切换
  - 第二行：导航分类（可横滑，`min-h-[44px]`）
- [x] Hero 区 16:9 PC 优化（`md:max-w-none`，`xl:text-9xl`）
- [x] AI 画板背景（`MemphisGameBg.vue`）+ 右上角计分板
- [x] 左上角 AI Lab 黄色徽标（画图模式激活时出现）
- [x] 左下角画笔 FAB（手机 60px 圆形，PC 宽条带动边框）
- [x] 右下角 AI Agent 聊天（`ChatWidget.vue`，手机 60px，PC 80px）
- [x] Steam 游戏库（127 款，`GamingView.vue`）
- [x] 中英双语（`vue-i18n`，`locales/zh.ts` & `en.ts`）
- [x] 权限系统（`SecurityPortal.vue` + 口令 `Corealis0514`）
- [x] 全静态数据（`public/data/projects.json` + Markdown）

### 待完成 / 已知问题

- [ ] 搜索栏目前只有 UI，无实际搜索逻辑（`@keydown.enter.prevent` 未实现）
- [ ] 手机端搜索栏隐藏，需要时可加搜索入口 icon

---

## 文件结构速查

```
portfolio-frontend/src/
├── App.vue                  ← Navbar（双行）+ 全局布局
├── views/
│   ├── HomeView.vue         ← 首页（MemphisGameBg + HeroSection）
│   ├── ProjectsView.vue     ← /projects
│   ├── GamingView.vue       ← /gaming（Steam 库）
│   ├── ExperienceView.vue   ← /experience
│   └── ResumeView.vue       ← /resume
├── components/
│   ├── HeroSection.vue      ← Hero 区（两栏，左标题+CTA，右 info panel）
│   ├── MemphisGameBg.vue    ← 全屏画板背景层 + 左下画笔 FAB
│   ├── ChatWidget.vue       ← 右下角 AI Agent 悬浮窗
│   ├── SecurityPortal.vue   ← 权限弹窗
│   └── LangToggle.vue       ← ZH/EN 切换
├── locales/
│   ├── zh.ts                ← 中文文案
│   └── en.ts                ← 英文文案
└── composables/
    └── useAdmin.ts          ← isAdmin 状态（Pinia + LocalStorage）
```

---

## 设计约束（必须遵守）

```
✅ border-[3px] border-ink（#1A1A1A）
✅ shadow-[4~8px_*_0_0_#1A1A1A] 硬阴影无模糊
✅ 字体三件套：Space Grotesk（标题）/ Inter（正文）/ JetBrains Mono（代码）
✅ 色板：warm-white #FAF8F5 / memphis-yellow #FFD600 / memphis-blue #2979FF
✅ 手机端按钮 min-h-[44px]（Apple HIG）
❌ 禁止 rounded（圆角）
❌ 禁止 gradient（渐变）
❌ 禁止 blur（模糊，navbar backdrop-blur-sm 是唯一例外）
```

---

## Navbar 高度说明

`App.vue` 的 `main` 有 `pt-[100px]`，对应：

```
第一行 56px (h-14) + 第二行 44px (h-[44px]) = 100px
```

改 navbar 高度时，必须同步更新 `pt-[100px]` 和 `MemphisGameBg.vue` 中的：
- `.scoreboard { top: 108px }` （100 + 8px gap）
- `.ailab-badge { top: 108px }`
- 手机端 `@media (max-width: 767px)` 中的对应 `top` 值

---

## 关键数据文件

| 文件 | 内容 |
|---|---|
| `public/data/projects.json` | 所有项目（双语 `{zh,en}` 字段）|
| `public/data/content/*.md` | 项目详情 Markdown |
| `public/assets/covers/` | 项目封面图 |
| `public/assets/images/avatar.jpg` | 头像 |

---

## Git Commit 规范

```
design:  视觉 / 布局 / 样式改动
feat:    新功能
fix:     Bug 修复
docs:    仅文档改动
refactor: 重构（无功能变化）
```

---

## 接管后第一步建议

1. `cd portfolio-frontend && npm run dev` 确认本地能跑
2. 打开 `http://localhost:5173` 验证当前效果
3. 阅读 `PROJECT_PDM_v8.4.md` 了解产品决策背景
4. 需要新功能时，先确认设计约束再动手

---

*此文档由 AI Agent 在完成 v8.4 迭代后自动生成，下次迭代完成后请更新版本号与改动清单。*
