# AGENT HANDOVER — Corealis v8.5

> 读完此文件即可直接接管项目，无需阅读其他文档。  
> 更新时间：2026-04-25 | 最新版本：v8.5（游戏库 Genre 筛选 + 默认 A–Z 排序）

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

## 当前项目状态（v8.5）

### 已完成功能

- [x] Memphis + Brutalist 全站设计语言
- [x] B站三段式 Navbar（双行，共 100px）
  - 第一行：Logo | 搜索栏（PC） | 语言切换
  - 第二行：导航分类（可横滑，`min-h-[44px]`）
- [x] Hero 区 16:9 PC 优化（`md:max-w-none`，`xl:text-9xl`）
- [x] AI 画板背景（`MemphisGameBg.vue`）+ 右上角计分板
- [x] 左下角画笔 FAB（手机 60px 圆形，bottom/left 16px；PC 宽条带动）
- [x] 右下角 AI Agent 聊天（`ChatWidget.vue`，手机 60px，PC 80px）
- [x] Steam 游戏库（全量，`GamingView.vue` + `FullLibraryPortal.vue`）
- [x] **v8.5** 游戏库 Genre 类型筛选（动态提取 tags，支持多 tab 联动）
- [x] **v8.5** 游戏库默认排序改为 A–Z（原为时长降序）
- [x] 中英双语（`vue-i18n`，`locales/zh.ts` & `en.ts`）
- [x] 权限系统（`SecurityPortal.vue` + 口令 `Corealis0514`）
- [x] 全静态数据（`public/data/projects.json` + Markdown）

### 待完成 / 已知问题

- [ ] Navbar 搜索栏仅 UI，无实际搜索逻辑
- [ ] 手机端无搜索入口 icon（搜索栏在手机端隐藏）
- [ ] Steam 游戏无 tags，Genre 筛选仅对本地游戏（米哈游/库洛等）有效

---

## 文件结构速查

```
portfolio-frontend/src/
├── App.vue                        ← Navbar（双行）+ 全局布局
├── views/
│   ├── HomeView.vue               ← 首页（MemphisGameBg + HeroSection）
│   ├── ProjectsView.vue           ← /projects
│   ├── GamingView.vue             ← /gaming，Steam + 本地游戏看板
│   ├── ResumeView.vue             ← /resume
│   ├── ExperienceView.vue         ← /experience
│   └── AdminView.vue              ← /admin（口令保护）
├── components/
│   ├── HeroSection.vue            ← 首页 Hero（v8.4 PC 放大）
│   ├── FullLibraryPortal.vue      ← 全屏游戏库弹窗（v8.5 Genre 筛选）
│   ├── ChatWidget.vue             ← AI Agent 聊天（手机 60px / PC 80px）
│   ├── MemphisGameBg.vue          ← AI 画板背景 + 画笔 FAB（手机 60px）
│   ├── SecurityPortal.vue         ← 口令验证弹窗
│   ├── GameDetailPanel.vue        ← 游戏详情侧滑面板
│   └── GamingProfile.vue          ← 游戏个人名片
├── locales/
│   ├── zh.ts                      ← 中文 i18n
│   └── en.ts                      ← 英文 i18n
└── public/data/
    ├── projects.json              ← 项目数据（静态）
    └── games/                     ← 本地游戏数据 + Markdown 拆解报告
```

---

## FullLibraryPortal 筛选架构（v8.5）

```
平台 Tab（全部 / Steam / 手游 / 其他）
  └─ Genre 类型筛选行（ALL + 动态 tags，点击切换，再次点击取消）
       └─ 搜索框（名称 / 平台 / tags 全文匹配）

排序（默认 A–Z）：A–Z | 时长 | 平台
分页：5/10 = 翻页制；15/20 = 滚动制；手机始终滚动制
```

**关键 ref**：`activeGenre = ref('all')`，值为 `'all'` 或具体 tag 字符串。

---

## 设计红线（新 Agent 必读）

| 禁止操作 | 说明 |
|---|---|
| 添加圆角 | `rounded-*` 不可用（navbar 输入框除外）|
| 添加渐变 | `gradient` 系列不可用 |
| 添加模糊 | `blur` 系列不可用（navbar `backdrop-blur-sm` 除外）|
| 改变硬阴影 | `shadow-[Xpx_Xpx_0_0_#1A1A1A]` 格式不可变为 `shadow-lg` |
| 手机 FAB > 60px | 画笔和 AI Agent 按钮手机端必须 ≤ 60px |
| Navbar 高度 | 双行共 100px，`pt-20` 配合，不可随意改动 |

---

## Git 历史（近期）

```
v8.5  docs+feat: game library A-Z sort default + genre filter
v8.4  fix: mobile FAB 80→60px + docs: PROJECT_PDM_v8.4, AGENT_HANDOVER, README
v8.3  docs: PROJECT_PDM_v8.3
v8.4  design: PC hero section enlarged for 16:9 fill, mobile unchanged
```

---

## 常见问题

**Q: 如何添加新游戏？**  
A: 在 `public/data/games/` 目录下添加 JSON 文件，字段见 `GamingView.vue` 的 `LocalGame` 接口。添加 `tags` 字段即可在 Genre 筛选中出现。

**Q: Genre 筛选为何 Steam 游戏不受影响？**  
A: Steam 游戏通过 `/api/steam-owned` 获取，无 tags 字段，Genre 筛选只对 `localGames`（有 tags）有效。后续可接 Steam Spy API 补充 tags。

**Q: 如何修改 AI Agent 聊天逻辑？**  
A: 编辑 `ChatWidget.vue`，聊天 API 在 `sendMessage()` 方法中。

**Q: 如何切换语言？**  
A: Navbar 右上角语言按钮（`zh`/`en`），通过 `vue-i18n` 的 `locale.value` 控制。
