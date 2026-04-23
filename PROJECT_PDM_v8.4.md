# 产品开发手册 (PDM) — Corealis 数字分身终端 v8.4

> 生成时间：2026-04-24  
> 最新 commit：`d89ae48`（UI fix 之后将更新）  
> 分支：`main` → 部署至 Vercel `https://haoyuanlin.uk`

---

## 一、产品定位

**Corealis** 是以 **Memphis 孟菲斯 × Brutalist 排版** 为设计语言的个人数字分身终端，将个人简历进化为沉浸式交互体验网站。

| 维度 | 定义 |
|---|---|
| 生产域名 | `https://haoyuanlin.uk` |
| 部署平台 | Vercel（纯静态 SPA，无后端） |
| 核心人设 | 开发者 × AI Lab 创始人 × 游戏玩家 |
| 首要受众 | 猎头、投资人、协作开发者 |
| 核心体验 | "超出简历预期"的沉浸感 + Memphis 视觉冲击 |

---

## 二、设计语言规范（不可逾越红线）

### 视觉基准

| 元素 | 规范 |
|---|---|
| 边框 | `border-[3px] border-ink`（`#1A1A1A`）黑色实线 |
| 硬阴影 | `shadow-[4px_4px_0_0_#1A1A1A]` 无模糊，Brutalist 风格 |
| 圆角 | **禁止**（`rounded`）|
| 渐变 | **禁止**（`gradient`）|
| 模糊 | **禁止**（`blur`，navbar `backdrop-blur-sm` 除外）|

### 设计 Token

| Token | 色值 | 用途 |
|---|---|---|
| `warm-white` | `#FAF8F5` | 页面底色 |
| `warm-beige` | `#F5F0E8` | 卡片底色 |
| `ink` | `#1A1A1A` | 主文字 / 边框 / 阴影 |
| `memphis-yellow` | `#FFD600` | 主强调（CTA、AI Lab 徽标） |
| `memphis-blue` | `#2979FF` | 次强调色 |
| `memphis-coral` | `#FF6B6B` | 警告 / 热点色 |
| `memphis-mint` | `#00E5A0` | 成功 / 亮点色 |
| `memphis-pink` | `#FF4081` | 点缀色 |
| `memphis-purple` | `#7C4DFF` | 点缀色 |

### HCI 字体标准

| 场景 | 规范 |
|---|---|
| 中文正文 | `text-[15px]` + `leading-relaxed` (1.6) |
| 英文 / 技术参数 | `font-mono text-[14px]` |
| 移动端标题 | `text-3xl`（从 PC `text-5xl` 降级）|
| 移动端正文 | `text-[15px]` + `tracking-wide` |
| 移动端按钮最小触控 | `min-h-[44px]` |

---

## 三、迭代历史总览

| 版本 | commit | 核心交付 |
|---|---|---|
| v1.0 | — | 数字分身人设，口令验证与安全门户雏形 |
| v7.x | — | 全站图标 3px 重绘，Canvas 交互简化，AI Lab 视觉标志确立 |
| v8.0 | `ce1abd2` | 127 个 Steam 游戏数据终端，全站中英双语 i18n |
| v8.1 | `d934c57` | Navbar 左右分区重构，移动端横向滑动 + 44px 触控热区 |
| v8.2 | `36d9806` | 头像 / 画笔按钮 / AI Agent 按钮统一放大，下划线位置调整 |
| v8.3 | `6ec8940` | B站三段式 Navbar（Logo+搜索+语言切换 / 分类栏），计分板&AI Lab 扩大 |
| v8.3.1 | `c7968b6` | 手机端画笔 FAB 从 56px 修正为 80px（与 AI agent 一致）|
| **v8.4** | `d89ae48` | Hero 区 PC 端全面放大（16:9 填充），手机端双 FAB 缩小 80→60px |

---

## 四、v8.4 具体改动清单

### `HeroSection.vue` — PC Hero 区扩充（仅 `md:` 以上）

| 改动点 | 之前 | 之后 |
|---|---|---|
| 容器宽度 | `max-w-7xl` 固定 | `md:max-w-none` + `px-12/20/28` 自适应 |
| 主标题 | `sm:6xl / lg:7xl / xl:8xl` | `md:7xl / lg:8xl / xl:9xl` |
| 副标题 | `lg:text-lg` | `md:text-lg / lg:text-xl` + `max-w-lg` |
| 头像 | `md:w-20` | `md:w-24 / lg:w-28` |
| 左区 pr | `md:pr-10 / lg:pr-16` | `md:pr-12 / lg:pr-20 / xl:pr-28` |
| 右侧 panel 宽 | `w-72 / lg:w-80 / xl:w-88` | `w-80 / lg:w-96 / xl:w-[26rem]` |
| Stats 数值 | `text-xl` | `lg:text-2xl` |
| Tech tags | `text-[10px]` | `lg:text-[11px] + px-3 py-1.5` |
| Currently 内容 | `text-[11px]` | `lg:text-[12px]` |
| CTA 按钮 | `px-5 py-2.5 text-sm` | `md:px-7 py-3 / lg:px-8 py-3.5 text-base` |

### `MemphisGameBg.vue` + `ChatWidget.vue` — 手机端 FAB 缩小

| 元素 | 之前 | 之后 |
|---|---|---|
| 左下角画笔 FAB（手机） | 80px | **60px** |
| 画笔 emoji 字号（手机） | 28px | 22px |
| 左下角 `bottom/left` offset | 24px | 16px |
| 右下角 AI Agent FAB（手机） | `w-20 h-20`（80px） | `w-[60px] h-[60px]` |
| 右下角容器 offset（手机） | `bottom-6 right-6` | `bottom-4 right-4` |

---

## 五、关键技术架构

```
portfolio-frontend/
├── src/
│   ├── App.vue                  # 全局布局 + B站三段式 Navbar（双行）
│   ├── views/
│   │   ├── HomeView.vue         # 首页（背景层 + HeroSection）
│   │   ├── ProjectsView.vue     # 项目
│   │   ├── GamingView.vue       # Steam 游戏库 + Stats
│   │   ├── ExperienceView.vue   # 教育 / 实习经历
│   │   └── ResumeView.vue       # 简历
│   ├── components/
│   │   ├── HeroSection.vue      # Hero（16:9 优化版）
│   │   ├── MemphisGameBg.vue    # 画板背景 + AI 视觉终端 + 计分板
│   │   ├── ChatWidget.vue       # AI Agent 悬浮窗（右下角）
│   │   ├── SecurityPortal.vue   # 权限验证（必经）
│   │   └── LangToggle.vue       # i18n 切换
│   └── locales/en.ts / zh.ts    # 双语文案
└── public/data/                 # 静态数据（projects.json + Markdown）
```

**技术栈**：Vue 3 + Vite + Tailwind CSS + Pinia + vue-i18n + GSAP + matter-js

---

## 六、权限与安全

- **秘密口令**：`Corealis0514`
- **全局权限**：`isAdmin`（Pinia / LocalStorage）
- **收款地址**：`0xb492cefe694f31628bac0305aa5445486618f797`
- **规则**：所有支付 / 解锁操作必须先弹出 `SecurityPortal.vue`，禁止绕过

---

## 七、Navbar 结构（v8.3+）

双行布局，`header` 总高度 **100px**（`pt-[100px]`）：

| 行 | 内容 | 高度 |
|---|---|---|
| 第一行 | Logo（左）+ 搜索栏（中，`sm:` 以上）+ 语言切换（右） | 56px |
| 第二行 | 导航分类链接（可横向滚动）| 44px |

---

## 八、给下一位 Agent 的注意事项

1. **Memphis 红线**：`border-[3px] border-ink` + 硬阴影在任何端都不可妥协
2. **手机端触控底线**：任何交互元素 `min-h-[44px]`（Apple HIG）
3. **i18n 同步**：新增文案必须同时写入 `src/locales/zh.ts` 和 `en.ts`
4. **PC/Mobile 分离**：UI 放大只加 `md:` / `lg:` 前缀；缩小只改媒体查询内
5. **权限**：`SecurityPortal.vue` 不可绕过
6. **Commit 前缀**：`design:` `feat:` `fix:` `docs:`
7. **`pt-[100px]`**：`App.vue` 的 `main` padding-top 对应双行 navbar 总高度，改 navbar 时同步更新

---

*本文档由 AI Agent 在 v8.4 迭代完成后自动生成*
