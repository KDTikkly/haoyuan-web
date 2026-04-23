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
      style="touch-action: none;"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend.prevent="onTouchEnd"
    />

    <!-- ═══ 右侧 AI 视觉终端（复用计分板 UI）═══ -->
    <div class="scoreboard" :class="{ 'scoreboard--active': isDrawMode, 'scoreboard--flash': guessFlash }">
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

  <!-- ═══ 左上角 AI LAB 标志（画布激活时显示）═══ -->
  <Transition name="ailab-badge">
    <div v-if="isDrawMode" class="ailab-badge" aria-label="AI Lab">
      <!-- 像素风几何装饰 -->
      <svg class="ailab-deco" width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <!-- 左上散落方块 -->
        <rect x="0" y="0" width="8" height="8" fill="#FF6B6B" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="10" y="3" width="5" height="5" fill="#2979FF" stroke="#1A1A1A" stroke-width="1.5"/>
        <!-- 右下三角 -->
        <polygon points="44,46 54,46 54,54" fill="#FFD600" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/>
        <!-- 右上小圆 -->
        <circle cx="50" cy="6" r="4" fill="#00E5A0" stroke="#1A1A1A" stroke-width="2"/>
        <!-- 对角虚线轨迹 -->
        <line x1="14" y1="6" x2="42" y2="44" stroke="#1A1A1A" stroke-width="1.5" stroke-dasharray="3 4" stroke-opacity="0.35"/>
      </svg>
      <!-- 主标志文字卡片 -->
      <div class="ailab-card">
        <span class="ailab-tag">◈ GEMINI VISION</span>
        <span class="ailab-title">AI LAB</span>
        <span class="ailab-sub">DRAW · ANALYZE · GUESS</span>
      </div>
    </div>
  </Transition>

</div>

<!-- ═══ 左下角统一操作区：DRAW 入口 / ANALYZE+CLEAR — Teleport 到 body ═══ -->
<Teleport to="body">
  <!-- 未进入画图模式：DRAW 入口 -->
  <Transition name="ctrl-swap">
    <div v-if="!isDrawMode" class="draw-entry-wrap">
      <span class="draw-hint" aria-hidden="true">
        {{ t('draw.hint') }}
      </span>
      <button class="draw-entry-btn" @click="enterDrawMode" :aria-label="t('draw.entry_aria')">
        <span class="btn-marquee" aria-hidden="true">
          ✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;✎ DRAW&nbsp;&nbsp;◈&nbsp;&nbsp;
        </span>
        <span class="btn-label">{{ t('draw.entry_label') }}</span>
        <!-- 手机端圆形 FAB 专用画笔图标 -->
        <span class="btn-icon-mobile" aria-hidden="true">✎</span>
      </button>
    </div>
  </Transition>

  <!-- 进入画图模式：AI ANALYZE + CLEAR，锚点同左下角 -->
  <Transition name="ctrl-swap">
    <div v-if="isDrawMode" class="draw-entry-wrap draw-entry-wrap--active">
      <!-- 笔迹状态提示行 -->
      <span class="draw-hint draw-hint--strokes" aria-live="polite">
        <span
          class="hint-dot"
          :style="{ background: stripeColor }"
          aria-hidden="true"
        ></span>
        {{ isUploading ? t('draw.analyzing') : strokesCount > 0 ? t('draw.strokes', { n: strokesCount }) : t('draw.canvas_ready') }}
      </span>
      <!-- 按钮组 -->
      <div class="ctrl-btn-group">
        <button
          class="ctrl-btn ctrl-btn--analyze"
          :disabled="isUploading || strokesCount === 0"
          @click="requireAdmin(analyzeDrawing)"
          :aria-label="t('draw.analyze_aria')"
        >
          <span class="ctrl-btn-icon" :class="{ 'icon--spin': isUploading }" aria-hidden="true">
            {{ isUploading ? '⌛' : '✦' }}
          </span>
          <span class="ctrl-btn-text">{{ isUploading ? t('draw.analyzing') : 'AI ANALYZE' }}</span>
        </button>
        <button
          class="ctrl-btn ctrl-btn--clear"
          @click="clearCanvas"
          :aria-label="t('draw.clear_aria')"
        >
          <span class="ctrl-btn-text">✖</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SecurityPortal from '@/components/SecurityPortal.vue'
import { useAdmin } from '@/composables/useAdmin'

const { t } = useI18n()

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
const guessFlash   = ref(false)  // AI 结果返回时触发 scoreboard 闪烁提醒

/** 触发 scoreboard 孟菲斯黄闪烁，引导注意力到 AI GUESS 区域 */
function triggerGuessFlash() {
  guessFlash.value = true
  setTimeout(() => { guessFlash.value = false }, 700)
}

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

function relPosTouch(t: Touch): { x: number; y: number } {
  const rect = canvasRef.value!.getBoundingClientRect()
  return {
    x: (t.clientX - rect.left) * (canvasRef.value!.width  / rect.width),
    y: (t.clientY - rect.top)  * (canvasRef.value!.height / rect.height),
  }
}

function onTouchStart(e: TouchEvent) {
  if (!isDrawMode.value) return
  const t = e.touches[0]
  isDrawing.value = true
  strokesCount.value++
  statusPhase.value = 'drawing'
  const ctx = getCtx()
  if (!ctx) return
  const { x, y } = relPosTouch(t)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function onTouchMove(e: TouchEvent) {
  if (!isDrawing.value || !isDrawMode.value) return
  const t = e.touches[0]
  const ctx = getCtx()
  if (!ctx) return
  const { x, y } = relPosTouch(t)
  ctx.lineTo(x, y)
  ctx.strokeStyle = INK
  ctx.lineWidth   = 4
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.stroke()
}

function onTouchEnd() {
  if (!isDrawing.value) return
  isDrawing.value = false
  const ctx = getCtx()
  ctx?.beginPath()
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
      triggerGuessFlash()
    } else {
      aiGuess.value     = data.error || '看不懂...'
      statusPhase.value = 'done'
      triggerGuessFlash()
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

/* ─── 左上角 AI LAB 标志 ─── */
.ailab-badge {
  position: fixed;
  top: 72px;   /* 导航栏下方 */
  left: 20px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  pointer-events: none;
}

/* 几何装饰层 */
.ailab-deco {
  position: absolute;
  top: -10px;
  left: -8px;
  z-index: 0;
  pointer-events: none;
  filter: drop-shadow(1px 1px 0px #1A1A1A);
}

/* 主卡片 */
.ailab-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #FFD600;
  border: 3px solid #1A1A1A;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  padding: 8px 14px 10px;
  min-width: 130px;
}

/* 顶部小标签 */
.ailab-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #1A1A1A80;
  text-transform: uppercase;
}

/* 主标题 */
.ailab-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 30px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

/* 底部副标题 */
.ailab-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #1A1A1A;
  text-transform: uppercase;
  border-top: 2px solid #1A1A1A;
  padding-top: 4px;
  margin-top: 2px;
}

/* 进出动画 */
.ailab-badge-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ailab-badge-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.ailab-badge-enter-from {
  opacity: 0;
  transform: translateX(-20px) scale(0.88);
}
.ailab-badge-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.92);
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

/* 手机端：scoreboard 移到右上角导航栏下方，默认几乎不可见，仅画图模式显示 */
@media (max-width: 767px) {
  .scoreboard {
    top: 72px;
    bottom: auto;
    right: 12px;
    opacity: 0.15;
    transform: translateX(8px) scale(0.93);
    transition: opacity 0.25s, transform 0.3s;
  }
  .scoreboard--active {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  .score-inner {
    width: 96px;
  }
  .score-val {
    font-size: 14px;
  }
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

/* ══════════════════════════════════════════════════════════
   左下角统一操作区 — DRAW 入口 / ANALYZE+CLEAR
   两种状态共用同一锚点，切换时原地淡出淡入（无位移跳变）
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

/* 画图模式时微亮提升层级 */
.draw-entry-wrap--active {
  z-index: 60;
}

/* ── 浮动引导文案 ── */
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

/* 画图模式下的 hint — 带状态色点 */
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
  border-radius: 0;        /* Brutalist 方形点 */
  flex-shrink: 0;
  transition: background 0.3s;
}

@keyframes float-hint {
  0%, 100% { transform: translateY(0);    opacity: 0.55; }
  50%       { transform: translateY(-4px); opacity: 1;   }
}

/* ── DRAW 按钮（流动斜纹边框）── */
.draw-entry-btn {
  position: relative;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;          /* PC 端字号提升 */
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 14px 28px;       /* PC 端内边距扩大 */
  cursor: pointer;
  background: #FAF8F5;
  color: #1A1A1A;
  opacity: 0.92;
  min-width: 200px;         /* PC 端宽度扩大 */
  white-space: nowrap;
  border: none;
  outline: 3px solid #1A1A1A;
  outline-offset: 0px;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.15s;
  overflow: hidden;
  /* 最小触控面积 HCI */
  min-height: 52px;
}

/* 流动斜纹边框伪元素 */
.draw-entry-btn::before {
  content: '';
  position: absolute;
  inset: -3px;
  background: repeating-linear-gradient(
    -45deg,
    #FFD600 0px, #FFD600 5px,
    #1A1A1A 5px, #1A1A1A 10px
  );
  background-size: 28px 28px;
  animation: border-march 0.6s linear infinite;
  z-index: 0;
}

/* 内容遮罩 */
.draw-entry-btn::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: #FAF8F5;
  z-index: 1;
}

.draw-entry-btn:hover {
  opacity: 1;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}
.draw-entry-btn:hover::before { animation-duration: 0.28s; }
.draw-entry-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #1A1A1A;
}

@keyframes border-march {
  from { background-position: 0 0; }
  to   { background-position: 28px 0; }
}

/* 跑马灯背景（hover 时浮现） */
.btn-marquee {
  position: absolute;
  inset: 3px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  font-size: 9px;
  color: #1A1A1A50;
  background: repeating-linear-gradient(
    -45deg,
    #FFD600aa 0px, #FFD600aa 4px,
    transparent 4px, transparent 12px
  );
  background-size: 48px 48px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  animation: marquee-scroll 2s linear infinite paused;
  z-index: 2;
}
.draw-entry-btn:hover .btn-marquee {
  opacity: 0.5;
  animation-play-state: running;
}
@keyframes marquee-scroll {
  from { background-position: 0 0; }
  to   { background-position: 48px 0; }
}

/* 按钮实际文字（最顶层） */
.btn-label {
  position: relative;
  z-index: 3;
}

/* 手机端圆形 FAB 专用画笔图标（PC 端默认隐藏） */
.btn-icon-mobile {
  display: none;
}

/* ── ANALYZE + CLEAR 按钮组 ── */
/* 在 draw-entry-wrap 内部 flex 排列，不再 fixed 居中 */
.ctrl-btn-group {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

/* ── 通用控制按钮 ── */
.ctrl-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;          /* ↑ 从 10px 提升，手机可读性 */
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
  /* 最小触控面积 */
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  white-space: nowrap;
}
.ctrl-btn:active {
  transform: translate(4px, 4px) !important;
  box-shadow: 0 0 0 0 #1A1A1A !important;
}
.ctrl-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
  box-shadow: 4px 4px 0 0 #1A1A1A;
}

/* ANALYZE */
.ctrl-btn--analyze {
  background: #FFD600;
  color: #1A1A1A;
}
.ctrl-btn--analyze:hover:not(:disabled) {
  background: #FFC400;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}

/* CLEAR */
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

/* ── 图标 ── */
.ctrl-btn-icon {
  display: inline-block;
  margin-right: 5px;
  transition: transform 0.25s ease;
}
.icon--spin {
  animation: spin-icon 1s linear infinite;
}
@keyframes spin-icon {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── scoreboard 闪烁提示 ── */
.scoreboard--flash {
  animation: scoreboard-flash 0.7s ease-out;
}
@keyframes scoreboard-flash {
  0%   { box-shadow: 5px 5px 0 0 #1A1A1A; outline: none; }
  25%  { box-shadow: 0 0 0 6px #FFD60080, 5px 5px 0 0 #FFD600; outline: 3px solid #FFD600; }
  65%  { box-shadow: 0 0 0 2px #FFD60030, 5px 5px 0 0 #1A1A1A; }
  100% { box-shadow: 5px 5px 0 0 #1A1A1A; outline: none; }
}

/* ══════════════════════════════════════════════════════════
   切换动画：ctrl-swap — 左下角原位淡入/淡出
   两个 Transition 共用同一锚点，key 不同故不互相干扰
   ══════════════════════════════════════════════════════════ */
.ctrl-swap-enter-active {
  transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ctrl-swap-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  /* leave 时设置 absolute 防止影响布局 */
  position: absolute;
}
.ctrl-swap-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.94);
}
.ctrl-swap-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

/* ══════════════════════════════════════════════════════════
   手机端适配 (≤ 640px)
   ══════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  /* 圆形 FAB，固定左下角，与右下角 AI agent 对称 */
  .draw-entry-wrap {
    left: 24px;
    bottom: 24px;
    transform: none;
    width: auto;
    max-width: none;
    align-items: center;
    flex-direction: column;
  }

  /* 手机端不显示引导提示文案 */
  .draw-hint {
    display: none;
  }

  /* 圆形按钮，尺寸与 AI agent 一致 (w-14 h-14 = 56px) */
  .draw-entry-btn {
    width: 56px !important;
    height: 56px !important;
    min-width: 0 !important;
    min-height: 56px !important;
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

  /* 隐藏跑马灯文字 */
  .draw-entry-btn .btn-marquee {
    display: none;
  }

  /* 隐藏完整文字标签 */
  .draw-entry-btn .btn-label {
    display: none;
  }

  /* 显示画笔图标，居中显示 */
  .draw-entry-btn .btn-icon-mobile {
    display: block;
    position: relative;
    z-index: 3;
    font-size: 22px;
    line-height: 1;
  }

  /* 圆形伪元素也改为圆形 */
  .draw-entry-btn::before {
    border-radius: 50%;
    inset: -3px;
  }
  .draw-entry-btn::after {
    border-radius: 50%;
    inset: 3px;
  }

  /* 画图模式下按钮组改为竖向堆叠 */
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

  /* analyze 按钮在手机端隐藏文字，只显示图标 */
  .ctrl-btn--analyze .ctrl-btn-text {
    display: none;
  }

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

  /* scoreboard 手机端：仅画图模式下显示，避免压住 hero 文字 */
  .scoreboard {
    bottom: auto;
    top: 72px;   /* 导航栏下方 */
    right: 10px;
    opacity: 0;           /* 默认隐藏 */
    pointer-events: none;
    transform: translateX(12px) scale(0.95);
    transition: opacity 0.25s, transform 0.3s;
  }
  .scoreboard--active {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0) scale(1);
  }

  .score-inner {
    width: 88px;
  }

  .score-val {
    font-size: 13px;
  }

  /* AI LAB badge 手机端贴导航栏下方 */
  .ailab-badge {
    top: 64px;
    left: 12px;
  }

  .ailab-card {
    min-width: 110px;
    padding: 6px 10px 8px;
  }

  .ailab-title {
    font-size: 24px;
  }
}
</style>
