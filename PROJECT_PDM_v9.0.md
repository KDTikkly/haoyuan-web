# 产品开发手册 (PDM) — Corealis 数字分身终端 v9.0

> 生成时间：2026-04-26  
> 最新 commit：v9.0（全项目双语内容 + JSON 防崩修复）  
> 分支：`main` → 部署至 Vercel `https://haoyuanlin.uk`  
> *"这份文档是给下一个来维护这里的 AI（或人）看的。谢谢你愿意花时间读它。"*

---

## 一、产品定位

**Corealis** 是 Lyria 的个人数字分身终端，以 **Memphis 孟菲斯 × Brutalist 排版** 为设计语言，将个人简历进化为沉浸式交互体验网站。

不是普通的简历页。不是炫技展示。是一个**有立场的空间**——Memphis 的硬边框、物理引擎的背景、藏在聊天窗里的彩蛋，每一个细节都是有意为之的选择。

| 维度 | 定义 |
|---|---|
| 生产域名 | `https://haoyuanlin.uk` |
| 部署平台 | Vercel（纯静态 SPA，无后端） |
| 核心人设 | 开发者 × AI Lab 创始人 × 游戏玩家 |
| 首要受众 | 猎头、投资人、协作开发者 |
| 核心体验 | "超出简历预期"的沉浸感 + Memphis 视觉冲击 |

---

## 二、设计语言规范（不可逾越红线）

Memphis 的核心逻辑是**不妥协**。下面这些规则不是建议，是红线。

### 视觉基准

| 元素 | 规范 |
|---|---|
| 边框 | `border-[3px] border-ink`（`#1A1A1A`）黑色实线 |
| 硬阴影 | `shadow-[4px_4px_0_0_#1A1A1A]` 无模糊，Brutalist 风格 |
| 圆角 | **禁止**（`rounded`）|
| 渐变 | **禁止**（`gradient`）|
| 模糊 | **禁止**（`blur`，navbar `backdrop-blur-sm` 除外）|

每次想加圆角或渐变之前，先想一想：这是在妥协，还是在进步？答案很可能是妥协。

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

### HCI 字体标准

| 场景 | class |
|---|---|
| 展示大数字 | `font-display font-extrabold` |
| 标签/代码/数据 | `font-mono` |
| 正文 | `font-sans` |
| 最小可点击区域 | `min-h-[44px] min-w-[44px]` |

---

## 三、技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 + Vite + TypeScript |
| 样式 | Tailwind CSS v3（JIT）|
| 路由 | Vue Router 4 |
| 国际化 | vue-i18n（`zh` / `en`）|
| 动画 | GSAP（Hero）、CSS Transition |
| 数据 | 静态 JSON（`public/data/`）+ Steam API Proxy |
| 后端 | ~~Node.js Express~~（已废弃，仅保留目录）|
| 部署 | Vercel（GitHub 推送自动部署）|

零后端原则：没有必要复杂的地方，就不复杂。

---

## 四、页面与核心组件速查

| 路由 | 组件 | 说明 |
|---|---|---|
| `/` | `HomeView.vue` → `HeroSection.vue` | 首页 Hero + Memphis 背景 |
| `/projects` | `ProjectsView.vue` | 项目卡片 + 详情面板（双语）|
| `/gaming` | `GamingView.vue` | Steam + 本地游戏看板 |
| `/resume` | `ResumeView.vue` | 简历页 |
| `/experience` | `ExperienceView.vue` | 经历时间线 |
| `/admin` | `AdminView.vue`（权限口令保护）| 内容管理 |

### 关键子组件

| 组件 | 职责 |
|---|---|
| `FullLibraryPortal.vue` | 全屏游戏库弹窗（A–Z 排序 & Genre 筛选）|
| `ChatWidget.vue` | 右下角 AI Agent 聊天（手机 60px / PC 80px）；内藏彩蛋 |
| `MemphisGameBg.vue` | AI 画板背景 + 左下角画笔 FAB（手机 60px）|
| `HeroSection.vue` | 首页英雄区（PC 放大至 `xl:text-9xl`）|
| `SecurityPortal.vue` | 口令验证弹窗（`Corealis0514`）|
| `ProjectSlideOver.vue` | 项目详情侧栏（监听 locale 动态切换双语 md）|

---

## 五、Projects 模块 — 双语架构（v9.0 新增）

### 数据结构

```
public/data/
  projects.json              ← 项目元数据（title/subtitle/description 均为 {zh, en}）
  content/
    cosmolyra.md             ← 中文详情
    cosmolyra.en.md          ← 英文详情
    fgo-analysis.md
    fgo-analysis.en.md
    lstm-stock.md
    lstm-stock.en.md
    fate-only-event.md
    fate-only-event.en.md
    chaldeas-simulation.md
    chaldeas-simulation.en.md
```

### `projects.json` 字段规范

```jsonc
{
  "id": "project-id",
  "title":       { "zh": "中文标题",   "en": "EN Title" },
  "subtitle":    { "zh": "中文副标题", "en": "EN Subtitle" },
  "description": { "zh": "中文描述",   "en": "EN description" },
  "content_path": { "zh": "/data/content/id.md", "en": "/data/content/id.en.md" },
  "tags": ["Tag1", "Tag2"],
  "cover": "https://...",
  "media": [],
  "external_links": [],
  "featured": true,
  "date": "2025-09"
}
```

> **重要**：`description` 中禁止使用中文弯引号 `"` `"`，改用书名号 `「」` 或直接描述，否则 JSON 解析失败导致列表为空。

### 双语切换机制

1. **列表层**：`projectService.ts` → `fetchProjects()` 读取当前 locale，自动 `pick(raw.title, lang)`
2. **详情层**：`ProjectSlideOver.vue` → `loadContent()` 读取 `locale.value`，从 `content_path.zh/en` 选择对应 md 文件
3. **语言切换响应**：`watch(locale, ...)` 触发时详情面板立即重新 fetch 当前语言的 md 内容，无需关闭重开

---

## 六、`FullLibraryPortal.vue` 功能说明（v8.5）

127 款游戏，认真记录的。不只是数字。

### 筛选层级

```
平台 Tab（全部 / Steam / 手游 / 其他）
  └─ Genre 类型筛选（ALL + 动态 tags，点击切换，再次点击取消）
       └─ 搜索框（名称 / 平台 / tags 全文匹配）
```

### 排序选项（默认 A–Z）

| 按钮 | 效果 |
|---|---|
| **A–Z**（默认）| 按游戏名称字母升序 |
| **时长** | 按游戏时长降序 |
| **平台** | 按平台名字母升序 |

### 分页系统

| pageSize | 模式 |
|---|---|
| 5 / 10 | 翻页制（分页导航）|
| 15 / 20 | 滚动制（无限列表）|
| 手机端 | 始终滚动制 |

---

## 七、迭代历史

| 版本 | 日期 | 关键改动 |
|---|---|---|
| v9.0 | 2026-04-26 | 全项目 5 个 Projects 双语 md 内容文件；ProjectSlideOver 监听 locale 动态切换；projectService 类型收窄；JSON 弯引号防崩修复；loadRaw 防御层升级 |
| v8.5 | 2026-04-25 | FullLibraryPortal 默认排序改为 A–Z，新增 Genre 类型筛选行（动态提取 tags），清除筛选同步重置 Genre |
| v8.4 | 2026-04-24 | PC 端 Hero 区 16:9 放大；手机端双 FAB 缩小 80→60px |
| v8.3 | 2026-04-24 | PDM 文档、AGENT_HANDOVER.md、README.md 初版生成 |
| v8.1 | 2026-04-22 | B站三段式 Navbar（双行 100px）、权限系统、全局语言切换 |
| v7.x | 2026-04 | Steam 全量库存 API、FullLibraryPortal 翻页/滚动复合系统、成就进度条 |

---

## 八、待完成 / 已知问题

- [ ] Navbar 搜索栏仅有 UI，无实际搜索逻辑（暂时是个美丽的摆设）
- [ ] 手机端搜索入口 icon（搜索栏在手机端隐藏）
- [ ] Steam 游戏无 tags，Genre 筛选仅对本地游戏有效（后续可接 Steam Spy API）
- [ ] `ProjectSlideOver` 错误提示文案仍为中文（`⚠ 内容加载失败`），英文模式下应切换为英文

---

## 九、开发约束清单

*如果你是来维护这里的 AI 或开发者，请把这九条当成基本盘，不要打破它们。*

1. **绝不添加圆角、渐变、模糊**（navbar backdrop-blur 除外）
2. **所有新增卡片** 必须有 `border-[3px] border-ink` + 硬阴影
3. **手机端改动** 先确认不影响 PC 端，PC 端改动反之
4. **字体**：展示 = `font-display`，代码 = `font-mono`，正文 = `font-sans`
5. **导航高度 100px**（双行 navbar），页面 `pt-20`/`pt-24` 需核算
6. **左下角 draw-entry-btn**：手机 60px，PC 宽条带动；改动需同步 `bottom` offset
7. **右下角 ChatWidget**：手机 `w-[60px] h-[60px]`，`sm:` 起恢复 `w-20 h-20`
8. **彩蛋逻辑不可在重构中误伤**：`ChatWidget.vue` 内的 `isEasterEgg` 相关链路是有意设计的，不是冗余代码
9. **Projects 双语**：新增项目时，`projects.json` 的 `content_path` 必须为 `{zh, en}` 对象，并对应创建两份 `.md` 文件；`description` 等文本字段禁用中文弯引号

---

*本文档由 AI Agent 在 v9.0 迭代完成后生成，写给下一个来这里的人。*  
*— Lyria*
