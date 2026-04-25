# 🚀 项目接力手册：Corealis 数字分身终端 (v8.1 Milestone)

> 生成时间：2026-04-24
> 用途：新 Agent 快速接管，读完即可直接执行后续任务

---

## 📍 核心任务概览

本项目已从 PDM（产品开发手册）构建起步，经历了从 v7.0 到 v8.1 的深度迭代。目前已将原本的"个人简历页"进化为一个具备 **Memphis（孟菲斯）风格**、支持 **Steam 全量数据同步**、具备 **i18n 国际化能力** 的沉浸式数字分身终端。

---

## 🛠️ 第一部分：项目现状与真值来源 (PDM v8.1)

### 1. 核心权限与安全逻辑

- **秘密口令**：`Corealis0514`
- **全局权限状态**：通过 `isAdmin`（Pinia / LocalStorage）锁定 Pro 级功能（如 AI 分析）
- **收款/捐赠地址**：`0xb492cefe694f31628bac0305aa5445486618f797`
- **交互约束**：所有涉及支付或权限的操作，必须先行弹出 `SecurityPortal.vue` 声明，确认后再进行校验

### 2. 设计语言规范 (Memphis / Brutalist)

**视觉红线（禁止逾越）：**
- 必须维持 **3px 黑色硬边框** (`border-[3px] border-ink`) 与 **4~6px 纯黑硬阴影** (`shadow-[4px_4px_0_0_#1A1A1A]`)
- **禁止**使用圆角（`rounded`）、渐变（`gradient`）、模糊（`blur`）、细线图标

**HCI 字体标准：**
| 场景 | 规范 |
|---|---|
| 中文正文 | `text-[15px]` + `leading-relaxed` (1.6) |
| 英文/技术参数 | `font-mono text-[14px]` |
| 移动端标题 | `text-3xl`（从 PC `text-5xl` 降级） |
| 移动端正文 | `text-[15px]` + `tracking-wide` |

**设计 Token：**
| 元素 | 值 |
|---|---|
| 背景色 | `#FAF8F5` Warm White |
| 墨色 | `#1A1A1A` (`ink`) |
| 孟菲斯黄 | `#FFD600` |
| 孟菲斯蓝 | `#2979FF` |
| 孟菲斯珊瑚 | `#FF6B6B` |
| 孟菲斯薄荷 | `#00E5A0` |
| 标题字体 | Space Grotesk |
| 正文字体 | Inter |
| 等宽字体 | JetBrains Mono |

### 3. 数据与交互层级

- **游戏库逻辑**：全量库（127 个 Steam 游戏详情）被提级为一级功能入口，独立于子块存在
- **统计交互**：顶部 4 个 Stats 卡片已激活点击事件，支持展示三级明细数据（`max-h-[80vh] overflow-y-auto`）
- **容错处理**：所有游戏封面必须具备 `@error` 加载失败逻辑，自动随机替换为孟菲斯几何色块

---

## 📄 第二部分：关键迭代路径复盘

| 阶段 | 版本 | 核心交付 |
|---|---|---|
| PDM 启动期 | v1.0 | 确立数字分身人设，构建口令验证与安全门户雏形 |
| 视觉对齐期 | v7.x | 完成全站图标 3px 重绘，简化 Canvas 交互逻辑，确立 AI Lab 视觉标志 |
| 功能爆发期 | v8.0 | 实现 127 个 Steam 游戏数据终端，完成全站中英双语 (i18n) 覆盖 |
| 体验定稿期 | v8.1 | Navbar 左右分区重构，移动端横向滑动导航 + 44px 触控热区适配 |

---

## 🛠️ 第三部分：v8.1 具体改动清单

### `App.vue` — Navbar 手机端横向滚动重构
| 改动点 | 之前 | 之后 |
|---|---|---|
| 右区容器 | `overflow-hidden`，链接被压缩 | `overflow-x-auto scrollbar-none`，可横滑 |
| 链接宽度 | `flex-1` 被压缩 | `flex-shrink-0 px-3`，内容不折行 |
| 触控热区 | 无保障 | `min-h-[44px]`（Apple HIG 标准） |
| 文字换行 | `truncate` 截断 | `whitespace-nowrap` 完整显示 |
| 渐变遮罩 | 无 | 右侧 40px `nav-fade-mask`，仅手机端可见 |
| 语言切换 | 参与横滚 | 固定最右侧，带左侧分隔线 |

### `GamingView.vue` — Stats 明细面板手机端修复
- Stats 卡片已是 `grid-cols-2 md:grid-cols-4`
- 明细展开面板：添加 `max-h-[80vh] overflow-y-auto`，移除 `hidden md:block`（手机端现在可见）

### `ExperienceView.vue` — 时间戳位置调整
- 教育/实习卡片顶行：手机端 `flex-col`，时间戳换行到类型 badge 下方（标题上方）
- `sm:` 以上恢复 `flex-row justify-between` 原始横排布局

### `assets/css/main.css` — HCI v8.1 触控规则
- `button:active { transform: scale(0.96) }` — 全局按钮物理点击缩放反馈
- `min-height: 44px` — 手机端所有按钮最小触控高度
- `letter-spacing: 0.02em` — 手机端中文字间距微增

---

## 🔧 第四部分：开发环境与技术栈

### 前端（主体）
```
portfolio-frontend/
├── src/
│   ├── App.vue                  # 全局布局 + Navbar
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── ProjectsView.vue
│   │   ├── GamingView.vue       # Steam 游戏库 + Stats
│   │   ├── ExperienceView.vue   # 教育/实习经历
│   │   └── ResumeView.vue
│   ├── components/
│   │   ├── SecurityPortal.vue   # 权限验证弹窗（必经）
│   │   ├── LangToggle.vue       # i18n 切换
│   │   └── ...
│   ├── locales/                 # i18n zh/en JSON
│   └── assets/css/main.css      # Memphis 全局样式
└── tailwind.config.js
```

技术栈：**Vue 3 + Vite + Tailwind CSS + Pinia + vue-i18n**

### 快速启动
```bash
cd portfolio-frontend
npm install
npm run dev    # http://localhost:5173
```

---

## ⚠️ 给下一位接力 Agent 的注意事项

1. **在进行任何 UI 修改前**，先核对 CSS 类名是否遵循 `border-ink` / `shadow-hard` 规范
2. **布局改动**：先确认是否符合 F-Pattern 扫描路径及左右分区的 HCI 逻辑
3. **权限相关功能**：所有支付/解锁操作必须经过 `SecurityPortal.vue`，禁止绕过
4. **移动端红线**：`border-[3px]` 和硬阴影在手机端同样不得妥协，只优化布局和触控
5. **i18n 同步**：新增任何文案，必须同步写入 `src/locales/zh.json` 和 `en.json`
6. **Git 提交规范**：`design: `、`feat: `、`fix: `、`docs: ` 前缀区分类型

---

*本文档由 AI Agent 在 v8.1 迭代完成后自动生成，commit `d934c57`*
