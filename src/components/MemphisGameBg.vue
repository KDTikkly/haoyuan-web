<template>
  <!--
    MemphisGameBg.vue — 多模态 AI 涂鸦板背景层 (v6.1)
    - 彻底清除俄罗斯方块：无 RAF/setInterval/碰撞检测/board 矩阵
    - 自由画板：mousedown/mousemove/mouseup 笔迹捕捉
    - 三按钮控制流：[ ✎ DRAW ] → [ ✦ AI ANALYZE ] + [ ✖ CLEAR ]
    - 右侧 AI 视觉终端：STROKES / STATUS / AI GUESS
    - Memphis & Brutalist 风格全保留（3px黑边/硬阴影/高对比度）
  -->
  <div
    class="draw-bg-wrap"
    :class="{ 'draw-mode': isDrawMode }"
    aria-hidden="true"
  >
    <!-- ═══ 主画布 ═══ -->
    <canvas
      ref="canvasRef"
      class="draw-canvas"
      :class="{ 'draw-canvas--active': isDrawMode }"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    />

    <!-- ═══ 右侧 AI 视觉终端（复用计分板 UI）═══ -->
    <div class="scoreboard" :class="{ 'scoreboard--active': isDrawMode }">
      <div class="score-inner">
        <div class="score-stripe" :style="{ background: stripeColor }"></div>
        <div class="score-body">
          <div class="score-row">
            <span class="score-label">STROKES</span>
            <span class="score-val" :style="{ color: stripeColor }">{{ strokesCount }}</span>
          </div>
          <div class="score-divider"></div>
          <div class="score-row">
            <span class="score-label">STATUS</span>
            <span class="score-val score-val--status">{{ statusText }}</span>
          </div>
          <div class="score-divider"></div>
          <div class="score-row score-row--guess">
            <span class="score-label">AI GUESS</span>
            <span class="score-val score-val--guess">{{ aiGuess || '—' }}</span>
          </div>
        </div>
      </div>
    </div>

  <!-- AI ANALYZE + CLEAR（绘画模式滑出，在 wrap 内） -->
  <Transition name="slide-btns">
    <div v-if="isDrawMode" class="ctrl-btn-group">
      <button
        class="ctrl-btn ctrl-btn--analyze"
        :disabled="isUploading || strokesCount === 0"
        @click="requireAdmin(analyzeDrawing)"
      >
        {{ isUploading ? 'THINKING...' : '✦ AI ANALYZE' }}
      </button>
      <button
        class="ctrl-btn ctrl-btn--clear"
        @click="clearCanvas"
      >
        ✖ CLEAR
      </button>
    </div>
  </Transition>
</div>

<!-- ═══ DRAW 按钮 + 引导文案：Teleport 到 body ═══ -->
<Teleport to="body">
  <div v-if="!isDrawMode" class="draw-entry-wrap">
    <span class="draw-hint">
      ✦ 在这里留下你的轨迹...
    </span>
    <button class="draw-entry-btn" @click="enterDrawMode">
      <span class="btn-marquee" aria-hidden="true">
        ✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;
      </span>
      <span class="btn-label">✎ 展开涂鸦结界</span>
    </button>
  </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SecurityPortal from '@/components/SecurityPortal.vue'
import { useAdmin } from '@/composables/useAdmin'

// ── Admin / Portal ────────────────────────────────────────────────────────────
const { isAdmin } = useAdmin()
const portalVisible  = ref(false)
const pendingAction  = ref<(() => void) | null>(null)

function requireAdmin(action: () => void) {
  if (isAdmin.value) {
    action()
  } else {
    pendingAction.value = action
    portalVisible.value = true
  }
}

function onPortalUnlock() {
  portalVisible.value = false
  pendingAction.value?.()
  pendingAction.value = null
}

// ── Emits ─────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  /** 通知父组件是否进入绘画模式（用于隐藏 Hero 内容） */
  (e: 'drawMode', active: boolean): void
  /** 兼容旧事件名，保持父组件不需要改动 */
  (e: 'tetrisHover', active: boolean): void
}>()

// ── Memphis 配色 ──────────────────────────────────────────────────────────────
const COLORS = ['#FFD600', '#FF6B6B', '#2979FF', '#00E5A0', '#A78BFA', '#FF9800', '#FF4081']
const INK    = '#1A1A1A'
const BG     = '#FAF8F5'

// ── 状态 ──────────────────────────────────────────────────────────────────────
const canvasRef    = ref<HTMLCanvasElement | null>(null)
const isDrawMode   = ref(false)
const isDrawing    = ref(false)
const isUploading  = ref(false)
const strokesCount = ref(0)
const aiGuess      = ref('')
const statusPhase  = ref<'standby' | 'drawing' | 'uploading' | 'done'>('standby')

// ── 计算属性 ──────────────────────────────────────────────────────────────────
const stripeColor = computed(() => {
  if (statusPhase.value === 'uploading') return '#FF6B6B'
  if (statusPhase.value === 'done')      return '#00E5A0'
  if (statusPhase.value === 'drawing')   return '#FFD600'
  return COLORS[0]
})

const statusText = computed(() => {
  switch (statusPhase.value) {
    case 'drawing':   return 'DRAWING'
    case 'uploading': return 'UPLOADING...'
    case 'done':      return 'DONE'
    default:          return 'STANDBY'
  }
})

// ── 画板逻辑 ──────────────────────────────────────────────────────────────────
function getCtx() {
  return canvasRef.value?.getContext('2d') ?? null
}

function onMouseDown(e: MouseEvent) {
  if (!isDrawMode.value) return
  isDrawing.value = true
  strokesCount.value++
  statusPhase.value = 'drawing'

  const ctx = getCtx()
  if (!ctx) return
  const { x, y } = relPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function onMouseMove(e: MouseEvent) {
  if (!isDrawing.value || !isDrawMode.value) return
  const ctx = getCtx()
  if (!ctx) return
  const { x, y } = relPos(e)
  ctx.lineTo(x, y)
  ctx.strokeStyle = INK
  ctx.lineWidth   = 4
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.stroke()
}

function onMouseUp() {
  if (!isDrawing.value) return
  isDrawing.value = false
  const ctx = getCtx()
  ctx?.beginPath()
}

function relPos(e: MouseEvent): { x: number; y: number } {
  const rect = canvasRef.value!.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvasRef.value!.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvasRef.value!.height / rect.height),
  }
}

// ── 模式控制 ──────────────────────────────────────────────────────────────────
function enterDrawMode() {
  isDrawMode.value  = true
  statusPhase.value = 'standby'
  emit('drawMode', true)
  emit('tetrisHover', true)
}

function clearCanvas() {
  const ctx = getCtx()
  if (ctx && canvasRef.value) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    drawGrid()
  }
  strokesCount.value = 0
  aiGuess.value      = ''
  statusPhase.value  = 'standby'
  isDrawMode.value   = false
  emit('drawMode', false)
  emit('tetrisHover', false)
}

// ── AI 分析 ───────────────────────────────────────────────────────────────────
async function analyzeDrawing() {
  if (!canvasRef.value || strokesCount.value === 0 || isUploading.value) return

  isUploading.value  = true
  statusPhase.value  = 'uploading'
  aiGuess.value      = ''

  try {
    const imageData = canvasRef.value.toDataURL('image/jpeg', 0.85)

    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData }),
    })

    const data = await res.json()

    if (data.result) {
      aiGuess.value     = data.result
      statusPhase.value = 'done'
    } else {
      aiGuess.value     = data.error || '看不懂...'
      statusPhase.value = 'done'
    }
  } catch (err) {
    aiGuess.value     = '网络错误，请重试'
    statusPhase.value = 'done'
  } finally {
    isUploading.value = false
  }
}

// ── 背景网格（Memphis 点阵装饰）────────────────────────────────────────────────
function drawGrid() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 轻量网格点
  ctx.fillStyle = INK + '18'
  const gap = 32
  for (let x = gap; x < canvas.width; x += gap) {
    for (let y = gap; y < canvas.height; y += gap) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── Canvas 自适应 ─────────────────────────────────────────────────────────────
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  // 保存笔迹
  const imgData = canvas.toDataURL()
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  drawGrid()
  // 恢复笔迹
  if (strokesCount.value > 0) {
    const img = new Image()
    img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0)
    img.src = imgData
  }
}

// ── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
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

/* 绘画模式：开启交互 */
.draw-bg-wrap.draw-mode {
  pointer-events: auto;
  z-index: 5;
}

/* Canvas */
.draw-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
}
.draw-canvas--active {
  cursor: crosshair;
}

/* ─── 右侧 AI 视觉终端（复用计分板样式）─── */
.scoreboard {
  position: fixed;
  top: 80px;
  right: 20px;
  opacity: 0.45;
  transition: opacity 0.25s;
  z-index: 20;
  pointer-events: auto;
}
.scoreboard--active {
  opacity: 1;
}

.score-inner {
  border: 3px solid #1A1A1A;
  background: #FAF8F5;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  width: 110px;
  overflow: hidden;
}

.score-stripe {
  height: 6px;
  width: 100%;
  transition: background 0.4s;
}

.score-body {
  padding: 8px;
}

.score-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.score-row--guess {
  margin-top: 2px;
}

.score-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: #1A1A1A80;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.score-val {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1A1A1A;
  line-height: 1;
  transition: color 0.3s;
}

.score-val--status {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.06em;
}

.score-val--guess {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.02em;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  color: #1A1A1A;
  max-width: 94px;
}

.score-divider {
  height: 2px;
  background: #1A1A1A;
  margin: 6px 0;
}

/* ─── 按钮公共基类 ─── */
.ctrl-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 7px 12px;
  border: 3px solid #1A1A1A;
  cursor: pointer;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transition: transform 0.1s, box-shadow 0.1s, background 0.15s;
  pointer-events: auto;
  position: relative;
  z-index: 20;
}
.ctrl-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #1A1A1A;
}
.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: 4px 4px 0 0 #1A1A1A;
}

/* DRAW 按钮容器 + 引导文案（Teleport 到 body） */
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

/* 浮动引导文案 */
.draw-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A1A80;
  letter-spacing: 0.1em;
  animation: float-hint 2.4s ease-in-out infinite;
  pointer-events: none;
  padding-left: 2px;
}
@keyframes float-hint {
  0%, 100% { transform: translateY(0);   opacity: 0.55; }
  50%       { transform: translateY(-4px); opacity: 1; }
}

/* DRAW 按钮（流动斜纹 Marquee 效果） */
.draw-entry-btn {
  position: relative;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 7px 14px;
  border: 3px solid #1A1A1A;
  cursor: pointer;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transition: transform 0.1s, box-shadow 0.1s, opacity 0.15s;
  background: #FAF8F5;
  color: #1A1A1A;
  opacity: 0.75;
  min-width: 130px;
  white-space: nowrap;
}
.draw-entry-btn:hover {
  opacity: 1;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}
.draw-entry-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #1A1A1A;
}

/* 流动斜纹背景层（hover 时显现） */
.btn-marquee {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  white-space: nowrap;
  font-size: 9px;
  color: #1A1A1A30;
  background: repeating-linear-gradient(
    -45deg,
    #FFD600 0px,
    #FFD600 4px,
    transparent 4px,
    transparent 12px
  );
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  animation: marquee-scroll 3s linear infinite paused;
}
.draw-entry-btn:hover .btn-marquee {
  opacity: 1;
  animation-play-state: running;
}
@keyframes marquee-scroll {
  from { background-position: 0 0; }
  to   { background-position: 48px 0; }
}

/* 按钮实际文字（覆盖在流动层上方） */
.btn-label {
  position: relative;
  z-index: 1;
}

/* AI ANALYZE + CLEAR 按钮组 */
.ctrl-btn-group {
  position: fixed;
  bottom: 24px;
  left: 24px;
  display: flex;
  gap: 10px;
  z-index: 20;
  pointer-events: auto;
}

.ctrl-btn--analyze {
  background: #FFD600;
  color: #1A1A1A;
}
.ctrl-btn--analyze:hover:not(:disabled) {
  background: #FFC400;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}

.ctrl-btn--clear {
  background: #FAF8F5;
  color: #1A1A1A;
}
.ctrl-btn--clear:hover {
  background: #FF6B6B;
  color: #fff;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}

/* 按钮组滑出动画 */
.slide-btns-enter-active {
  animation: slide-up-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-btns-leave-active {
  animation: slide-up-in 0.15s ease-in reverse;
}
@keyframes slide-up-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
