# 产品开发手册 (PDM) — Corealis 数字分身终端 v8.2

> 生成时间：2026-04-25  
> 最新 commit：`86e3862`（模型选择器下拉 + 物理挂饰修复）  
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
| 圆角 | **禁止**（`rounded`，手机 FAB 除外）|
| 渐变 | **禁止**（`gradient`）|
| 模糊 | **仅涂鸦模式背景模糊允许**（`blur-[8px] brightness-[0.55]`），navbar `backdrop-blur-sm` 除外 |

### 设计 Token

| Token | 色值 | 用途 |
|---|---|---|
| `warm-white` | `#FAF8F5` | 页面底色 / 画板背景 |
| `warm-beige` | `#F5F0E8` | 卡片底色 |
| `ink` | `#1A1A1A` | 主文字 / 边框 / 阴影 |
| `memphis-yellow` | `#FFD600` | 主强调（CTA、AI Lab 徽标）|
| `memphis-blue` | `#2979FF` | 次强调色（DeepSeek 标识）|
| `memphis-coral` | `#FF6B6B` | 警告 / UPLOADING 状态 |
| `memphis-mint` | `#00E5A0` | DONE 状态色 |

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
| 动画 | CSS Transition + RAF 弹簧物理 |
| 数据 | 静态 JSON（`public/data/`）+ Steam API Proxy |
| SSH 部署 | fly.io（Go 后端）|

---

## 四、页面与核心组件速查

| 路由 | 组件 | 说明 |
|---|---|---|
| `/` | `HomeView.vue` → `HeroSection.vue` | 首页 Hero + Memphis 背景 |
| `/projects` | `ProjectsView.vue` | 项目卡片 + 详情 |
| `/gaming` | `GamingView.vue` | Steam + 本地游戏看板 |
| `/resume` | `ResumeView.vue` | 简历页 |
| `/experience` | `ExperienceView.vue` | 经历时间线 |
| `/admin` | `AdminView.vue`（权限口令保护） | 内容管理 |

### 关键子组件

| 组件 | 职责 |
|---|---|
| `MemphisGameBg.vue` | AI 涂鸦板容器 — 集成 CanvasBoard + PhysicsCharm + Tool Terminal + RECOGNITION STREAM |
| `CanvasBoard.vue` | Apple 级画笔引擎（Pencil / Marker / Highlighter / Eraser）|
| `PhysicsCharm.vue` | ZZZ 弹力绳物理挂饰（AI LAB 徽标，弹簧模拟）|
| `ChatWidget.vue` | 右下角 AI Agent 聊天（PRO 解锁后含 Vision 模型选择）|
| `FullLibraryPortal.vue` | 全屏游戏库弹窗（Genre 筛选 + A-Z 排序）|
| `HeroSection.vue` | 首页英雄区 |
| `SecurityPortal.vue` | 口令验证弹窗（`Corealis0514`）|

---

## 五、v8.2 新增功能详解

### 5.1 CanvasBoard — Apple 级画笔引擎

| 工具 | 图标 | 渲染机制 |
|---|---|---|
| **PENCIL** | ✏ | 细线 + 随机噪声溅射（`Math.random` 模拟石墨纹理） |
| **MARKER** | 🖊 | 半透明纯色叠加（`globalAlpha = 0.65`） |
| **HIGHLIGHT** | ✦ | 宽笔触 + `globalCompositeOperation = 'multiply'` 正片叠底 |
| **ERASER** | ⌫ | `destination-out` 擦除，笔触宽度 2x |

**滑块：**
- Stroke Width: `1 ~ 24` px（`range` input）
- Stroke Opacity: `0.05 ~ 1.0`

### 5.2 TOOL TERMINAL（左侧工具栏）

- 4 个画笔按钮（Brutalist 标签风格，选中反色）
- 粗细滑块：黑底填充带 + 方块拖拽点
- 透明度滑块：斜纹填充带
- 画板激活时出现，CSS Transition 滑入

### 5.3 RECOGNITION STREAM（右侧 AI 终端）

- STROKES / STATUS / AI GUESS 三行数据
- MODEL 下拉选择器（Gemini Vision / DeepSeek V4 Pro）
- 分析完成时黄色闪烁动画

### 5.4 PhysicsCharm — 弹力绳物理挂饰

- 替换旧静态 AI LAB 标牌
- RAF 弹簧模拟：`stiffness=0.008, damping=0.88`
- 跟随鼠标指针摆动，角度弹簧独立
- 手机端 `MOBILE_IMPULSE=0.6` 降频

### 5.5 多模型 AI 枢纽 (`aiService.ts`)

- `selectedVisionModel` 全局响应式 ref
- `analyzeImage()` 统一入口，根据选中模型分发
- Gemini Vision → 后端 `/api/vision` 代理
- DeepSeek V4 Pro → 直连 `api.deepseek.com`（Key: `sk-a548...`）
- 模型选择器分布于 RECOGNITION STREAM + ChatWidget PRO 模式

### 5.6 ChatWidget PRO 模式

- 解锁 PRO 后显示 VISION 模型下拉选择器
- 与画板模型选择器共享全局 `selectedVisionModel` 状态

---

## 六、文件结构（v8.2 关键文件）

```
portfolio-frontend/src/
├── api/
│   ├── aiService.ts               ← [NEW] 多模型 API 封装
│   └── http.ts
├── components/
│   ├── CanvasBoard.vue            ← [NEW] 画笔引擎
│   ├── PhysicsCharm.vue           ← [NEW] 弹力绳挂饰
│   ├── MemphisGameBg.vue          ← [REFACTOR] 画板容器
│   ├── ChatWidget.vue             ← [MODIFIED] +Vision 模型选择器
│   └── ...
├── composables/
│   ├── useAdmin.ts
│   └── useDeepOverlay.ts
├── locales/
│   ├── zh.ts
│   └── en.ts
├── types/
│   └── brush.ts                   ← [NEW] 画笔类型定义
└── ...
```

---

## 七 ⚠️ 已知 Bug（v8.2）

### BUG-1: 物理挂饰 PhysicsCharm 交互异常
**症状：** 鼠标/触摸滑动时，AI LAB 标牌不跟随/不摆动，或摆动幅度不正确。  
**原因推测：**
- CanvasBoard 的 `pointermove` 事件可能仍会消耗事件
- 手机端 `pointermove` 监听 `{passive:true}` 无效（需要主动 listener）
- `rafId` 判断逻辑可能过早停止弹簧动画
**相关文件：** `src/components/PhysicsCharm.vue:60-125`

### BUG-2: Tool Terminal 画笔按钮不显示
**症状：** 进入画板模式后，左侧 TOOL TERMINAL 画笔选择 UI 无显示，或只显示空白框。  
**原因推测：**
- `<Transition name="panel-slide">` 的 scoped CSS 过渡类可能不生效
- `v-if="isDrawMode"` 条件可能未触发
- 工具按钮的 i18n key 映射可能错误（`t('draw.tool_pencil')` 等）
- z-index 可能被 header 遮挡
**相关文件：** `src/components/MemphisGameBg.vue:32-95`

### BUG-3: 模型选择下拉菜单文字不显示
**症状：** RECOGNITION STREAM 和 ChatWidget 的 `<select>` 下拉框中 option 文字不可见。  
**原因推测：**
- Tailwind CSS 重置样式覆盖了 `<option>` 的文字颜色
- `appearance: none` 可能导致 option popup 继承 background/color
- `<select>` 的 `color` 属性未传递到 option 弹窗
- 需要为 `<select>` 和 `<option>` 分别设置前景色和背景色
**相关文件：** `src/components/MemphisGameBg.vue:105-119`, `src/components/ChatWidget.vue:112-125`

---

## 八、迭代历史

| 版本 | 日期 | 关键改动 |
|---|---|---|
| v8.2 | 2026-04-25 | CanvasBoard 画笔引擎(4 工具+2 滑块)，PhysicsCharm 弹力绳挂饰，DeepSeek V4 Pro 集成，多模型切换下拉 |
| v8.1 | 2026-04-25 | 画板全局化(所有页面)，AI Agent 全局化，三级菜单时隐藏，涂鸦模式高斯模糊背景 |
| v8.0 | 2026-04-24 | B站三段式 Navbar，AI 画板 v6.1，权限系统，中英双语 |

---

## 九、开发约束清单

1. **绝不添加圆角、渐变**（手机 FAB 圆形除外）
2. **所有新增卡片** 必须有 `border-[3px] border-ink` + 硬阴影
3. **手机端 FAB 限 60px**（画笔和 AI Agent）
4. **字体**：展示 = `font-display`，代码 = `font-mono`，正文 = `font-sans`
5. **导航高度 100px**（双行 navbar），画板所有浮层需 `top: 110px+`
6. **左侧 TOOL TERMINAL** 在 `top: 210px` 避免与 PhysicsCharm（anchor `110px`）重叠
7. **PhysicsCharm** 使用 CSS `transform` 驱动，避免 layout recalc
8. **CanvasBoard** 不要 `e.preventDefault()`，否则 PhysicsCharm 失去 pointer 事件
