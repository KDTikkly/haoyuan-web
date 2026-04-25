<template>
  <!--
    MemphisGameBg.vue — AI LAB 涂鸦板容器 (v8.2)
    - 纯净浅色画板背景，无黑色混色
    - 集成 CanvasBoard（Apple 级画笔引擎）
    - 集成 PhysicsCharm（ZZZ 弹力绳挂饰）
    - 左侧 TOOL TERMINAL：画笔选择 + 粗细/透明度滑块
    - 右侧 RECOGNITION STREAM：AI 视觉终端 + 模型切换
    - 左下角浮动控制区：DRAW 入口 / ANALYZE + CLEAR
    - Memphis & Brutalist 风格：3px 黑边 + 4px 硬阴影
  -->
  <div
    class="draw-bg-wrap"
    :class="{ 'draw-mode': isDrawMode }"
    aria-hidden="true"
  >
    <!-- ═══ CanvasBoard 画板引擎 ═══ -->
    <CanvasBoard
      ref="boardRef"
      :is-active="isDrawMode"
      :tool="currentTool"
      :stroke-width="strokeWidth"
      :stroke-opacity="strokeOpacity"
      :stroke-color="strokeColor"
      @stroke="onStroke"
    />

    <!-- ═══ PhysicsCharm — ZZZ 弹力绳挂饰（仅画板打开时显示）═══ -->
    <PhysicsCharm :is-active="isDrawMode" :is-drawing="isDrawMode" />

    <!-- ═══ 左侧 TOOL TERMINAL — 画笔工具栏 ═══ -->
    <Transition name="panel-slide">
      <div v-if="isDrawMode" class="tool-terminal" aria-label="Tool Terminal">
        <!-- 终端标题 -->
        <div class="terminal-header">
          <span class="terminal-chip" aria-hidden="true">⌘</span>
          <span class="font-mono text-[8px] font-bold text-ink/40 uppercase tracking-[0.2em]">{{ t('draw.tool_terminal') }}</span>
        </div>

        <!-- 画笔工具按钮组 -->
        <div class="tool-grid">
          <button
            v-for="tool in tools"
            :key="tool.id"
            class="tool-btn"
            :class="{ 'tool-btn--active': currentTool === tool.id }"
            @click="currentTool = tool.id"
            :aria-label="t(tool.nameKey)"
            :title="t(tool.nameKey)"
          >
            <span class="tool-icon" aria-hidden="true">{{ tool.icon }}</span>
            <span class="tool-label">{{ t(tool.nameKey) }}</span>
          </button>
        </div>

        <!-- ── 调色板 ── -->
        <div class="palette-section">
          <div class="palette-header">
            <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest">COLOR</span>
            <!-- 当前色预览 -->
            <span
              class="color-preview"
              :style="{ background: strokeColor, border: strokeColor === '#FAF8F5' ? '2px solid #1A1A1A' : '2px solid ' + strokeColor }"
              :title="strokeColor"
            ></span>
          </div>

          <!-- 设计行业常用色快捷选项 -->
          <div class="color-swatches">
            <button
              v-for="c in DESIGN_COLORS"
              :key="c.hex"
              class="swatch-btn"
              :class="{ 'swatch-btn--active': strokeColor === c.hex }"
              :style="{ background: c.hex, borderColor: c.hex === '#FAF8F5' ? '#1A1A1A' : c.hex }"
              :title="c.name"
              :aria-label="c.name"
              @click="strokeColor = c.hex"
            ></button>
          </div>

          <!-- 自由取色器 -->
          <div class="free-color-row">
            <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest">CUSTOM</span>
            <label class="color-picker-label" title="自由取色" aria-label="自定义颜色">
              <input
                type="color"
                :value="strokeColor"
                @input="onFreeColorInput"
                class="color-picker-input"
                aria-label="Custom Color"
              />
              <span class="color-picker-icon" :style="{ background: strokeColor }">✦</span>
            </label>
          </div>
        </div>

        <!-- 粗细滑块 -->
        <div class="slider-group">
          <div class="slider-label">
            <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest">{{ t('draw.stroke_width') }}</span>
            <span class="slider-val">{{ strokeWidth }}</span>
          </div>
          <div class="slider-track-wrap">
            <input
              v-model.number="strokeWidth"
              type="range"
              min="1"
              max="24"
              step="0.5"
              class="slider-input"
              aria-label="Stroke Width"
            />
            <div class="slider-fill" :style="{ width: ((strokeWidth - 1) / 23 * 100) + '%', background: strokeColor === '#FAF8F5' ? '#1A1A1A' : strokeColor }"></div>
          </div>
        </div>

        <!-- 透明度滑块 -->
        <div class="slider-group">
          <div class="slider-label">
            <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest">{{ t('draw.stroke_opacity') }}</span>
            <span class="slider-val">{{ Math.round(strokeOpacity * 100) }}%</span>
          </div>
          <div class="slider-track-wrap">
            <input
              v-model.number="strokeOpacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              class="slider-input"
              aria-label="Stroke Opacity"
            />
            <div class="slider-fill slider-fill--opacity" :style="{ width: (strokeOpacity * 100) + '%' }"></div>
          </div>
        </div>

        <!-- STROKES 计分板（移至画笔选择下方）-->
        <div class="strokes-board">
          <span class="strokes-label">STROKES</span>
          <span class="strokes-val" :style="{ color: stripeColor }">{{ strokesCount }}</span>
        </div>

        <!-- CLEAR CANVAS 按钮（仅清空画布，不退出画图模式）-->
        <button
          class="tool-clear-btn"
          :disabled="strokesCount === 0"
          @click="clearCanvasOnly"
          aria-label="Clear Canvas"
          title="Clear Canvas"
        >
          <span aria-hidden="true">⌫</span>
          <span class="font-mono text-[8px] tracking-[0.1em] uppercase">CLEAR</span>
        </button>
      </div>
    </Transition>

    <!-- ═══ 右侧 RECOGNITION STREAM（AI 终端 + 模型选择器）═══ -->
    <Transition name="panel-slide">
      <div v-if="isDrawMode" class="recognition-stream" ref="recognitionStreamRef" :class="{ 'recognition--flash': guessFlash }">
        <div class="stream-inner">
          <!-- 顶部色条 -->
          <div class="stream-stripe" :style="{ background: stripeColor }"></div>

          <!-- Model Switcher -->
          <div class="model-switch-row">
            <span class="stream-label">MODEL</span>
            <select
              class="model-select"
              :value="selectedVisionModel"
              @change="switchVisionModel(($event.target as HTMLSelectElement).value as AiModel)"
              aria-label="AI Model Selector"
            >
              <option
                v-for="m in modelOptions"
                :key="m.id"
                :value="m.id"
              >{{ m.label }}</option>
            </select>
          </div>
          <!-- 当前模型完整名称展示 -->
          <div class="model-name-row">
            <span class="model-name-full" :style="{ color: currentModelColor }">
              {{ currentModelLabel }}
            </span>
          </div>

          <div class="stream-divider"></div>

          <!-- STATUS -->
          <div class="stream-row">
            <span class="stream-label">STATUS</span>
            <span class="stream-val stream-val--status">{{ statusText }}</span>
          </div>

          <div class="stream-divider"></div>

          <!-- AI GUESS -->
          <div class="stream-row stream-row--guess">
            <span class="stream-label">AI GUESS</span>
            <span class="stream-val stream-val--guess">{{ aiGuess || '—' }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <!-- ═══ 左下角统一操作区（Teleport 到 body）═══ -->
  <Teleport to="body">
    <!-- 未进入画图模式：DRAW 入口 -->
    <Transition name="ctrl-swap">
      <div v-if="!isDrawMode && !isDeepOverlayOpen" class="draw-entry-wrap">
        <span class="draw-hint" aria-hidden="true">{{ t('draw.hint') }}</span>
        <button class="draw-entry-btn" @click="enterDrawMode" :aria-label="t('draw.entry_aria')">
          <span class="btn-marquee" aria-hidden="true">
            ✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;
          </span>
          <span class="btn-label">{{ t('draw.entry_label') }}</span>
          <span class="btn-icon-mobile" aria-hidden="true">✎</span>
        </button>
      </div>
    </Transition>

    <!-- 进入画图模式：AI ANALYZE + CLEAR -->
    <Transition name="ctrl-swap">
      <div v-if="isDrawMode && !isDeepOverlayOpen" class="draw-entry-wrap draw-entry-wrap--active">
        <span class="draw-hint draw-hint--strokes" aria-live="polite">
          <span class="hint-dot" :style="{ background: stripeColor }" aria-hidden="true"></span>
          {{ isUploading ? t('draw.analyzing') : strokesCount > 0 ? t('draw.strokes', { n: strokesCount }) : t('draw.canvas_ready') }}
        </span>
        <div class="ctrl-btn-group">
          <button
            class="ctrl-btn ctrl-btn--analyze"
            :disabled="isUploading || strokesCount === 0"
            @click="requireAdmin(analyzeDrawing)"
            :aria-label="t('draw.analyze_aria')"
          >
            <span class="ctrl-btn-icon" :class="{ 'icon--spin': isUploading }" aria-hidden="true">{{ isUploading ? '⌛' : '✦' }}</span>
            <span class="ctrl-btn-text">{{ isUploading ? t('draw.analyzing') : 'AI ANALYZE' }}</span>
          </button>
          <button class="ctrl-btn ctrl-btn--clear" @click="clearCanvas" :aria-label="t('draw.clear_aria')">
            <span class="ctrl-btn-icon" aria-hidden="true">✕</span>
            <span class="ctrl-btn-text">EXIT</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══ SecurityPortal ═══ -->
  <SecurityPortal
    :visible="portalVisible"
    :pending-action="pendingAction ?? undefined"
    @unlock="onPortalUnlock"
    @cancel="portalVisible = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import CanvasBoard from '@/components/CanvasBoard.vue'
import type { BrushTool } from '@/types/brush'
import { BRUSH_META } from '@/types/brush'
import PhysicsCharm from '@/components/PhysicsCharm.vue'
import SecurityPortal from '@/components/SecurityPortal.vue'
import { useAdmin } from '@/composables/useAdmin'
import { useDeepOverlay } from '@/composables/useDeepOverlay'
import {
  analyzeImage,
  selectedVisionModel,
  switchVisionModel,
  type AiModel,
  MODEL_META,
} from '@/api/aiService'

const { t } = useI18n()

// ── Admin / Portal ────────────────────────────────────────────────────────────
const { isAdmin } = useAdmin()
const { isDeepOverlayOpen } = useDeepOverlay()
const portalVisible = ref(false)
const pendingAction = ref<(() => void) | null>(null)

function requireAdmin(action: () => void) {
  if (isAdmin.value) { action() }
  else { pendingAction.value = action; portalVisible.value = true }
}
function onPortalUnlock() {
  portalVisible.value = false
  pendingAction.value?.()
  pendingAction.value = null
}

// ── Emits ─────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  (e: 'drawMode', active: boolean): void
  (e: 'tetrisHover', active: boolean): void
}>()

// ── Board 引用 ────────────────────────────────────────────────────────────────
const boardRef = ref<InstanceType<typeof CanvasBoard> | null>(null)

// ── Recognition Stream 锚点（provide 给 PhysicsCharm）─────────────────────────
const recognitionStreamRef = ref<HTMLElement | null>(null)
// 初始锚点：导航栏底边（约 52px），x 对齐 recognition-stream 面板中心
// 面板展开后：right:20px, width:200px → center x = innerWidth - 120
// 未展开时锚在导航底，标牌挂在右上角导航栏下方，不遮挡主内容
const streamAnchor = ref({ x: window.innerWidth - 120, y: 52 })

function updateStreamAnchor() {
  const el = recognitionStreamRef.value
  if (!el) {
    // 面板未挂载：锚点贴在导航底边，标牌在右上角不侵入内容区
    streamAnchor.value = { x: window.innerWidth - 120, y: 52 }
    return
  }
  const rect = el.getBoundingClientRect()
  streamAnchor.value = { x: rect.left + rect.width / 2, y: rect.bottom }
}

provide('streamAnchor', streamAnchor)

// ── 画笔工具状态 ──────────────────────────────────────────────────────────────
const tools = Object.entries(BRUSH_META).map(([id, meta]) => ({ id: id as BrushTool, icon: meta.icon, nameKey: `draw.tool_${id}` }))
const currentTool = ref<BrushTool>('pencil')
const strokeWidth = ref(4)
const strokeOpacity = ref(1)
const strokeColor = ref('#1A1A1A')

// ── 设计行业常用色板 ──────────────────────────────────────────────────────────
const DESIGN_COLORS = [
  { hex: '#1A1A1A', name: 'Ink Black' },
  { hex: '#FAF8F5', name: 'Paper White' },
  { hex: '#FFD600', name: 'Memphis Yellow' },
  { hex: '#FF6B6B', name: 'Coral Red' },
  { hex: '#2979FF', name: 'Electric Blue' },
  { hex: '#00E5A0', name: 'Mint Green' },
  { hex: '#FF9800', name: 'Amber' },
  { hex: '#9C27B0', name: 'Purple' },
  { hex: '#F06292', name: 'Pink' },
  { hex: '#26C6DA', name: 'Cyan' },
  { hex: '#795548', name: 'Brown' },
  { hex: '#607D8B', name: 'Blue Grey' },
]

function onFreeColorInput(e: Event) {
  strokeColor.value = (e.target as HTMLInputElement).value
}

// ── 模型选择器选项 ────────────────────────────────────────────────────────────
const modelOptions = (Object.entries(MODEL_META) as [AiModel, typeof MODEL_META[AiModel]][]).map(([id, meta]) => ({
  id,
  label: meta.label,
  short: meta.tag,
  color: meta.color,
}))

const currentModelLabel = computed(() => MODEL_META[selectedVisionModel.value].label)
const currentModelColor = computed(() => MODEL_META[selectedVisionModel.value].color)

// ── 画板状态 ──────────────────────────────────────────────────────────────────
const isDrawMode = ref(false)
const isUploading = ref(false)
const strokesCount = ref(0)
const aiGuess = ref('')
const statusPhase = ref<'standby' | 'drawing' | 'uploading' | 'done'>('standby')
const guessFlash = ref(false)

const COLORS = ['#FFD600', '#FF6B6B', '#2979FF', '#00E5A0']
const stripeColor = computed(() => {
  if (statusPhase.value === 'uploading') return '#FF6B6B'
  if (statusPhase.value === 'done') return '#00E5A0'
  if (statusPhase.value === 'drawing') return '#FFD600'
  return COLORS[0]
})

const statusText = computed(() => {
  switch (statusPhase.value) {
    case 'drawing': return 'DRAWING'
    case 'uploading': return 'UPLOADING...'
    case 'done': return 'DONE'
    default: return 'STANDBY'
  }
})

function triggerGuessFlash() {
  guessFlash.value = true
  setTimeout(() => { guessFlash.value = false }, 700)
}

// ── Canvas 事件代理 ───────────────────────────────────────────────────────────
function onStroke() {
  strokesCount.value = boardRef.value?.getStrokeCount() ?? 0
  statusPhase.value = 'drawing'
}

// ── 模式控制 ──────────────────────────────────────────────────────────────────
function enterDrawMode() {
  isDrawMode.value = true
  statusPhase.value = 'standby'
  emit('drawMode', true)
  emit('tetrisHover', true)
  nextTick(() => updateStreamAnchor())
}

function clearCanvasOnly() {
  boardRef.value?.clearBoard()
  strokesCount.value = 0
  aiGuess.value = ''
  statusPhase.value = 'standby'
  // 不退出画图模式
}

function clearCanvas() {
  boardRef.value?.clearBoard()
  strokesCount.value = 0
  aiGuess.value = ''
  statusPhase.value = 'standby'
  isDrawMode.value = false
  emit('drawMode', false)
  emit('tetrisHover', false)
}

// ── AI 分析（多模型）───────────────────────────────────────────────────────────
async function analyzeDrawing() {
  if (!boardRef.value || strokesCount.value === 0 || isUploading.value) return

  isUploading.value = true
  statusPhase.value = 'uploading'
  aiGuess.value = ''

  try {
    const imageData = boardRef.value.getImageData()
    const result = await analyzeImage(imageData)
    aiGuess.value = result.text
    statusPhase.value = 'done'
    triggerGuessFlash()
  } catch (err: any) {
    aiGuess.value = err?.message || '分析失败，请重试'
    statusPhase.value = 'done'
  } finally {
    isUploading.value = false
  }
}

// ── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  updateStreamAnchor()
  window.addEventListener('resize', updateStreamAnchor)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateStreamAnchor)
})
</script>

<style scoped>
/* ── 容器：固定底层，默认穿透 ── */
.draw-bg-wrap {
  position: fixed;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  overflow: hidden;
}
.draw-bg-wrap.draw-mode {
  pointer-events: auto;
  z-index: 5;
}

/* ══════════════════════════════════════════════════════════
   左侧 TOOL TERMINAL
   ══════════════════════════════════════════════════════════ */
.tool-terminal {
  position: fixed;
  top: 108px;
  left: 20px;
  z-index: 22;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #FAF8F5;
  border: 3px solid #1A1A1A;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  padding: 14px 12px;
  min-width: 148px;
  max-width: 162px;
  pointer-events: auto;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 5px;
  border-bottom: 2px solid #1A1A1A15;
  padding-bottom: 8px;
}

.terminal-chip {
  font-size: 12px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1A1A1A;
  color: #FFD600;
  font-weight: 900;
}

.tool-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 2px solid #1A1A1A20;
  background: #FAF8F5;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A1A60;
  transition: all 0.1s;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tool-btn:hover {
  border-color: #1A1A1A;
  color: #1A1A1A;
  background: #FFD60010;
}

.tool-btn--active {
  border-color: #1A1A1A;
  background: #1A1A1A;
  color: #FFD600;
  box-shadow: 2px 2px 0 0 #FFD60080;
}

.tool-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.tool-label {
  white-space: nowrap;
}

/* 滑块 */
.slider-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slider-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A1A;
  tabular-nums: true;
}

.slider-track-wrap {
  position: relative;
  height: 8px;
  background: #1A1A1A10;
  border: 2px solid #1A1A1A;
  overflow: hidden;
}

.slider-input {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.slider-fill {
  height: 100%;
  background: #1A1A1A;
  transition: width 0.05s linear;
}

.slider-fill--opacity {
  background: repeating-linear-gradient(
    -45deg,
    #1A1A1A 0px, #1A1A1A 3px,
    #FFD600 3px, #FFD600 5px
  );
}

/* ══════════════════════════════════════════════════════════
   调色板
   ══════════════════════════════════════════════════════════ */
.palette-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 2px solid #1A1A1A15;
  padding-top: 8px;
}

.palette-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.color-preview {
  display: inline-block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.color-swatches {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.swatch-btn {
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  padding: 0;
}

.swatch-btn:hover {
  transform: scale(1.18);
  box-shadow: 2px 2px 0 0 #1A1A1A;
  z-index: 1;
}

.swatch-btn--active {
  border-color: #1A1A1A !important;
  box-shadow: 2px 2px 0 0 #1A1A1A;
  transform: scale(1.12);
}

.free-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.color-picker-label {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.color-picker-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  padding: 0;
  border: none;
}

.color-picker-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 2px solid #1A1A1A;
  font-size: 9px;
  color: rgba(255,255,255,0.8);
  text-shadow: 0 0 2px #1A1A1A;
  transition: box-shadow 0.1s;
  mix-blend-mode: normal;
}

.color-picker-label:hover .color-picker-icon {
  box-shadow: 2px 2px 0 0 #1A1A1A;
}

/* ── STROKES 计分板（画笔工具区底部）── */
.strokes-board {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 0;
  border-top: 2px solid #1A1A1A15;
}

.strokes-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 700;
  color: #1A1A1A60;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.strokes-val {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  transition: color 0.3s;
}

/* ── CLEAR CANVAS 按钮（工具栏内，仅清空不退出）─────────────────────────── */
.tool-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  margin-top: 6px;
  background: transparent;
  border: 2px solid #1A1A1A30;
  color: #1A1A1A60;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.tool-clear-btn:not(:disabled):hover {
  border-color: #FF6B6B;
  color: #FF6B6B;
  background: #FF6B6B08;
}
.tool-clear-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 面板滑入动画 */
.panel-slide-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-slide-enter-from {
  opacity: 0;
  transform: translateX(-16px) scale(0.92);
}
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.95);
}

/* ══════════════════════════════════════════════════════════
   右侧 RECOGNITION STREAM（AI 终端 + 模型选择器）
   ══════════════════════════════════════════════════════════ */
.recognition-stream {
  position: fixed;
  top: 108px;
  right: 20px;
  z-index: 22;
  pointer-events: auto;
  transition: opacity 0.2s;
}

.stream-inner {
  border: 3px solid #1A1A1A;
  background: #FAF8F5;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  width: 200px;
  overflow: hidden;
}

.stream-stripe {
  height: 8px;
  width: 100%;
  transition: background 0.4s;
}

.stream-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #1A1A1A60;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stream-val {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #1A1A1A;
  line-height: 1;
  transition: color 0.3s;
}

.stream-val--status {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
}

.stream-val--guess {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.02em;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  max-width: 150px;
}

.stream-divider {
  height: 2px;
  background: #1A1A1A10;
  margin: 8px 0;
}

.stream-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 0 14px;
}

.stream-row--guess {
  margin-top: 4px;
  padding-bottom: 14px;
}

/* Model Switcher Row */
.model-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
}

.model-select {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 4px 6px;
  border: 2px solid #1A1A1A;
  background: #FAF8F5;
  color: #1A1A1A;
  cursor: pointer;
  outline: none;
  text-transform: uppercase;
  max-width: 140px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='8' height='6' viewBox='0 0 8 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%231A1A1A' stroke-width='2' stroke-linecap='square'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  padding-right: 20px;
}

/* 当前模型完整名称展示 */
.model-name-row {
  padding: 0 14px 10px;
}

.model-name-full {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  line-height: 1.2;
  display: block;
}

.model-select option {
  color: #1A1A1A;
  background: #FAF8F5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 4px;
}

.model-select:focus {
  box-shadow: 2px 2px 0 0 #FFD600;
}

/* Flash 闪烁 */
.recognition--flash {
  animation: stream-flash 0.7s ease-out;
}
@keyframes stream-flash {
  0%   { box-shadow: 5px 5px 0 0 #1A1A1A; }
  25%  { box-shadow: 0 0 0 6px #FFD60080, 5px 5px 0 0 #FFD600; }
  65%  { box-shadow: 0 0 0 2px #FFD60020, 5px 5px 0 0 #1A1A1A; }
  100% { box-shadow: 5px 5px 0 0 #1A1A1A; }
}

/* ══════════════════════════════════════════════════════════
   左下角控制区 — 复用已有样式
   ══════════════════════════════════════════════════════════ */
.draw-entry-wrap {
  position: fixed;
  bottom: 24px;
  left: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  z-index: 50;
}
.draw-entry-wrap--active { z-index: 60; }

.draw-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A1A80;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  animation: float-hint 2.4s ease-in-out infinite;
  pointer-events: none;
  padding-left: 2px;
  user-select: none;
}
.draw-hint--strokes {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #1A1A1A99;
  animation: none;
}
.hint-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border: 2px solid #1A1A1A;
  flex-shrink: 0;
  transition: background 0.3s;
}

@keyframes float-hint {
  0%, 100% { transform: translateY(0); opacity: 0.55; }
  50%      { transform: translateY(-4px); opacity: 1; }
}

/* DRAW 按钮 */
.draw-entry-btn {
  position: relative;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 14px 28px;
  cursor: pointer;
  background: #FAF8F5;
  color: #1A1A1A;
  opacity: 0.92;
  min-width: 200px;
  white-space: nowrap;
  border: none;
  outline: 3px solid #1A1A1A;
  outline-offset: 0px;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.15s;
  overflow: hidden;
  min-height: 52px;
}
.draw-entry-btn::before {
  content: '';
  position: absolute;
  inset: -3px;
  background: repeating-linear-gradient(-45deg, #FFD600 0px, #FFD600 5px, #1A1A1A 5px, #1A1A1A 10px);
  background-size: 28px 28px;
  animation: border-march 0.6s linear infinite;
  z-index: 0;
}
.draw-entry-btn::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: #FAF8F5;
  z-index: 1;
}
.draw-entry-btn:hover { opacity: 1; box-shadow: 6px 6px 0 0 #1A1A1A; transform: translate(-1px, -1px); }
.draw-entry-btn:hover::before { animation-duration: 0.28s; }
.draw-entry-btn:active { transform: translate(4px, 4px); box-shadow: 0 0 0 0 #1A1A1A; }

@keyframes border-march {
  from { background-position: 0 0; }
  to   { background-position: 28px 0; }
}

.btn-marquee {
  position: absolute;
  inset: 3px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  font-size: 9px;
  color: #1A1A1A50;
  background: repeating-linear-gradient(-45deg, #FFD600aa 0px, #FFD600aa 4px, transparent 4px, transparent 12px);
  background-size: 48px 48px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  animation: marquee-scroll 2s linear infinite paused;
  z-index: 2;
}
.draw-entry-btn:hover .btn-marquee { opacity: 0.5; animation-play-state: running; }

@keyframes marquee-scroll {
  from { background-position: 0 0; }
  to   { background-position: 48px 0; }
}

.btn-label { position: relative; z-index: 3; }
.btn-icon-mobile { display: none; }

/* ANALYZE + CLEAR 按钮组 */
.ctrl-btn-group {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.ctrl-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 9px 14px;
  border: 3px solid #1A1A1A;
  cursor: pointer;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s;
  pointer-events: auto;
  position: relative;
  z-index: 20;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  white-space: nowrap;
}
.ctrl-btn:active { transform: translate(4px, 4px) !important; box-shadow: 0 0 0 0 #1A1A1A !important; }
.ctrl-btn:disabled { opacity: 0.38; cursor: not-allowed; transform: none; box-shadow: 4px 4px 0 0 #1A1A1A; }

.ctrl-btn--analyze { background: #FFD600; color: #1A1A1A; }
.ctrl-btn--analyze:hover:not(:disabled) { background: #FFC400; box-shadow: 6px 6px 0 0 #1A1A1A; transform: translate(-1px, -1px); }

.ctrl-btn--clear { background: #FAF8F5; color: #1A1A1A; }
.ctrl-btn--clear:hover { background: #FF6B6B; color: #fff; box-shadow: 6px 6px 0 0 #1A1A1A; transform: translate(-1px, -1px); }

.ctrl-btn-icon { display: inline-block; margin-right: 5px; transition: transform 0.25s ease; }
.icon--spin { animation: spin-icon 1s linear infinite; }
@keyframes spin-icon { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ctrl-swap 动画 */
.ctrl-swap-enter-active {
  transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ctrl-swap-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  position: absolute;
}
.ctrl-swap-enter-from { opacity: 0; transform: translateY(12px) scale(0.94); }
.ctrl-swap-leave-to   { opacity: 0; transform: translateY(6px) scale(0.96); }

/* ══════════════════════════════════════════════════════════
   手机端适配 (≤ 640px)
   ══════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .draw-entry-wrap {
    left: 16px;
    bottom: 16px;
    transform: none;
    width: auto;
    max-width: none;
    align-items: center;
    flex-direction: column;
  }
  .draw-hint { display: none; }

  .draw-entry-btn {
    width: 60px !important;
    height: 60px !important;
    min-width: 0 !important;
    min-height: 60px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid #1A1A1A !important;
    outline: none !important;
    box-shadow: 4px 4px 0 0 #1A1A1A;
    overflow: visible !important;
    white-space: normal !important;
  }
  .draw-entry-btn .btn-marquee { display: none; }
  .draw-entry-btn .btn-label { display: none; }
  .draw-entry-btn .btn-icon-mobile {
    display: block;
    position: relative;
    z-index: 3;
    font-size: 22px;
    line-height: 1;
  }
  .draw-entry-btn::before { border-radius: 50%; inset: -3px; }
  .draw-entry-btn::after { border-radius: 50%; inset: 3px; }

  .ctrl-btn-group {
    flex-direction: column;
    width: auto;
    gap: 8px;
  }
  .ctrl-btn--analyze {
    width: 56px;
    height: 56px;
    min-height: 56px;
    padding: 0;
    border-radius: 50%;
    font-size: 18px;
    justify-content: center;
    flex: none;
  }
  .ctrl-btn--analyze .ctrl-btn-text { display: none; }
  .ctrl-btn--clear {
    width: 56px;
    height: 56px;
    min-height: 56px;
    padding: 0;
    border-radius: 50%;
    font-size: 18px;
    justify-content: center;
    flex: none;
  }

  /* 手机端 TOOL TERMINAL 缩小并移到下方 */
  .tool-terminal {
    top: auto;
    bottom: 100px;
    left: 10px;
    padding: 8px 10px;
    min-width: 100px;
    max-width: 130px;
    gap: 6px;
  }
  .tool-grid { gap: 2px; }
  .tool-btn { padding: 4px 6px; font-size: 8px; }
  .tool-icon { font-size: 12px; width: 16px; }

  /* 手机端 RECOGNITION STREAM 缩小 */
  .recognition-stream {
    top: 108px;
    right: 8px;
  }
  .stream-inner { width: 130px; }
  .stream-val { font-size: 18px; }
  .model-select { font-size: 8px; max-width: 100px; }
}
</style>
