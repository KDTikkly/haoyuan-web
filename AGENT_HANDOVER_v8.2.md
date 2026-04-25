# AGENT HANDOVER — Corealis v8.2

> 读完此文件即可直接接管项目，无需阅读其他文档。  
> 更新时间：2026-04-25 | 最新版本：v8.2（Apple 画笔引擎 + ZZZ 物理挂饰 + DeepSeek V4 Pro）

---

## 快速定位

| 项目 | 值 |
|---|---|
| 仓库根目录 | `c:/Users/KDVON/CodeBuddy/20260422231627/` |
| 前端目录 | `portfolio-frontend/` |
| 后端目录 | `portfolio-backend/` |
| 生产地址 | `https://haoyuanlin.uk` |
| 部署平台 | Vercel（前端 auto-deploy）|

### 立即启动本地开发

```bash
cd portfolio-frontend
npm install
npm run dev          # http://localhost:5173
```

---

## 当前项目状态（v8.2）

### 已完成功能

- [x] Memphis + Brutalist 全站设计语言
- [x] B站三段式 Navbar（双行，共 100px）
- [x] 画板全局化 — 所有页面均可打开涂鸦模式（三级菜单除外）
- [x] 涂鸦模式高斯模糊背景（`blur-[8px] brightness-[0.55]`）
- [x] **v8.2** CanvasBoard — Apple 级画笔引擎（Pencil / Marker / Highlighter / Eraser）
- [x] **v8.2** PhysicsCharm — ZZZ 风格弹力绳物理挂饰（AI LAB 标牌）
- [x] **v8.2** 多模型 AI 枢纽（Gemini Vision + DeepSeek V4 Pro）
- [x] 模型选择下拉菜单（RECOGNITION STREAM + ChatWidget PRO）
- [x] 粗细/透明度滑块（Brutalist 风格）
- [x] AI Agent 聊天（ChatWidget，含 PRO 权限）
- [x] Steam 游戏库（FullLibraryPortal + Genre 筛选）
- [x] 中英双语 + 权限系统

---

## 🚨 已知 Bug（需要立即修复）

### BUG-1: PhysicsCharm 物理拖动无效
**文件：** `src/components/PhysicsCharm.vue`

**症状：** 进入画板模式后，AI LAB 标牌不跟随鼠标摆动。

**排查方向：**
1. CanvasBoard 的 `pointermove` 可能拦截事件 — 检查 canvas 元素事件处理是否阻止冒泡
2. `window.addEventListener('pointermove', ...)` 在手机端 `{passive:true}` 可能失效 — 尝试改为 `{passive:false}` 或 `mousemove`
3. `requestAnimationFrame` 的 `rafId` 判断逻辑可能提前停止弹簧循环 — 在 `onPointerDown` 中重新启动 RAF
4. 对于手机触摸，`pointermove` 仅在手指按下时触发 — 考虑额外监听 `touchmove`

**修复建议：**
```ts
// 在 onPointerDown 中强制启动弹簧循环
if (rafId == null || rafId <= 0) {
  rafId = requestAnimationFrame(springTick)
}

// 将 pointermove 改为非 passive（手机需要）
window.addEventListener('pointermove', onPointerMove, { passive: false })
```

---

### BUG-2: TOOL TERMINAL 画笔按钮 UI 不显示
**文件：** `src/components/MemphisGameBg.vue` (行 32-95)

**症状：** 进入画板模式后，左侧工具栏区域为空白，画笔按钮不可见。

**排查方向：**
1. `<Transition name="panel-slide">` 的 scoped CSS 过渡类可能不生效 — scoped styles 的 `.panel-slide-enter-from` 选择器可能匹配失败
2. 尝试用 `v-show="isDrawMode"` 替代 `v-if` + `<Transition>`，或移除 Transition 包装
3. 检查 `tools` 数组是否正确生成（来自 `BRUSH_META`）— `nameKey` 格式为 `draw.tool_pencil`
4. 检查 i18n key `draw.tool_pencil` 等在 `locales/zh.ts` 和 `en.ts` 中存在
5. z-index 检查：`.tool-terminal` 的 `z-index: 22` 是否被其他元素遮挡

**修复建议：**
```html
<!-- 临时方案：去掉 Transition，用 v-show -->
<div v-show="isDrawMode" class="tool-terminal" ...>

<!-- 或改用 CSS animation 替代 Vue Transition -->
```

---

### BUG-3: 模型选择下拉菜单文字不显示
**文件：** `src/components/MemphisGameBg.vue` (行 105-119), `src/components/ChatWidget.vue` (行 112-125)

**症状：** `<select>` 下拉框和 `<option>` 文字不可见（看起来是空白的）。

**原因：** `appearance: none` 移除原生下拉样式后，`<option>` 可能继承 scoped CSS 的 `color` 但不继承 `background`，导致白字白底。

**修复建议：**
```css
/* 为 select 和 option 分别设置样式 */
.model-select {
  color: #1A1A1A;
  background: #FAF8F5;
}
.model-select option {
  color: #1A1A1A;
  background: #FAF8F5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  padding: 6px;
}

/* ChatWidget 暗色主题 */
.chat-model-select {
  color: #FFD600;
  background: #1A1A1A;
}
.chat-model-select option {
  color: #FFD600;
  background: #1A1A1A;
}
```

---

## 📋 TODO List（给下个 Agent）

### 优先级 P0（阻塞体验）
- [ ] **修复 PhysicsCharm 物理拖动** — 详见 BUG-1
- [ ] **修复 TOOL TERMINAL 画笔按钮不显示** — 详见 BUG-2
- [ ] **修复模型选择下拉文字不显示** — 详见 BUG-3

### 优先级 P1（功能完善）
- [ ] 高亮笔 `multiply` 混合模式在部分浏览器不支持 — 降级为 `source-over` + alpha
- [ ] 铅笔噪声溅射太密集 — 减少粒子数（3→1 每帧）
- [ ] 手机端 TOOL TERMINAL 位置（`bottom:100px`）可能与控制按钮重叠
- [ ] DeepSeek API Key 迁移至 `.env` / 后端代理（当前硬编码在 `aiService.ts`）

### 优先级 P2（优化增强）
- [ ] PhysicsCharm 弹力绳可视化（画一根虚线连接挂饰和锚点）
- [ ] 画笔工具增加快捷键（P=铅笔, M=马克笔, H=荧光笔, E=橡皮擦）
- [ ] 画板保存/导出为图片按钮
- [ ] 撤销 (Undo) 功能 — 保存笔迹历史数组
- [ ] RECOGNITION STREAM 增加模型响应时间显示

---

## 文件结构速查

```
portfolio-frontend/src/
├── api/
│   ├── aiService.ts               ← [v8.2] 多模型 API 封装（DeepSeek Key 在此）
│   ├── http.ts
│   └── projectService.ts
├── components/
│   ├── CanvasBoard.vue            ← [v8.2] 画笔引擎（4工具+2滑块）
│   ├── PhysicsCharm.vue           ← [v8.2] ZZZ弹力绳挂饰（弹簧物理）
│   ├── MemphisGameBg.vue          ← [v8.2] 画板容器（集成以上两组件）
│   ├── ChatWidget.vue             ← [v8.2] AI聊天 + Vision模型选择
│   ├── FullLibraryPortal.vue      ← 全屏游戏库（Genre筛选）
│   ├── HeroSection.vue
│   ├── SecurityPortal.vue
│   └── ...
├── composables/
│   ├── useDeepOverlay.ts          ← 深层菜单追踪（三级菜单隐藏FAB）
│   └── useAdmin.ts
├── types/
│   └── brush.ts                   ← [v8.2] BrushTool 类型 + BRUSH_META
├── locales/
│   ├── zh.ts
│   └── en.ts
└── ...
```

---

## 设计红线（新 Agent 必读）

| 禁止操作 | 说明 |
|---|---|
| 添加圆角 | `rounded-*` 不可用（手机 FAB 除外）|
| 添加渐变 | `gradient` 系列不可用 |
| 添加模糊 | `blur` 系列不可用（画板背景模糊除外）|
| 改变硬阴影 | `shadow-[Xpx_Xpx_0_0_#1A1A1A]` 格式不可变 |
| 手机 FAB > 60px | 画笔和 AI Agent 按钮手机端必须 ≤ 60px |
| Navbar 高度 | 双行共 100px |
| 画板浮层位置 | TOOL TERMINAL `top:210px`，RECOGNITION STREAM `top:110px` |
| CanvasBoard | 不要 `e.preventDefault()`，否则 PhysicsCharm 失效 |

---

## Git 操作流程

```bash
# 前端
cd portfolio-frontend
git pull                  # 同步最新
npm run build             # 验证修改
git add . && git commit -m "描述" && git push

# 后端（如需）
cd portfolio-backend
git pull && git push
```

---

## 常见问题

**Q: 如何切换 Vision 模型？**  
A: 模型选择器在画板右侧 RECOGNITION STREAM 顶部（画板激活后可见），以及 ChatWidget 的 PRO 模式中。全局状态在 `aiService.ts` 的 `selectedVisionModel` ref 中。

**Q: 画板画笔如何工作？**  
A: `CanvasBoard.vue` 根据 `tool` prop 分发到 `brushDraw` 对象的不同函数。Tool 选择在 `MemphisGameBg.vue` 的 TOOL TERMINAL 中，通过 `currentTool` ref 控制。

**Q: PhysicsCharm 的物理参数在哪里？**  
A: `PhysicsCharm.vue:62-69`，`SPRING_K`、`DAMPING`、`IMPULSE_SCALE` 等。
