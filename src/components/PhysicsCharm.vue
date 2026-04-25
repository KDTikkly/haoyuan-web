<template>
  <!--
    PhysicsCharm.vue — 弹力绳挂饰 v8.7
    - 弹力绳一端锚定 Navbar 右侧，另一端是可拖动的 AI LAB 标牌
    - SVG 贝塞尔曲线可视化弹力绳
    - 松手后弹簧物理回弹
  -->
  <template v-if="isActive">
    <!-- SVG 弹力绳（全屏覆盖层，pointer-events:none） -->
    <svg class="rope-svg" aria-hidden="true">
      <defs>
        <filter id="rope-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="1.2" flood-color="#1A1A1A" flood-opacity="0.28"/>
        </filter>
      </defs>
      <!-- 弹力绳主体（黑粗线） -->
      <path :d="ropePath" fill="none" stroke="#1A1A1A" stroke-width="2.5"
        stroke-linecap="round" filter="url(#rope-shadow)"/>
      <!-- 弹力绳装饰线（黄色虚线高光） -->
      <path :d="ropePath" fill="none" stroke="#FFD600" stroke-width="1"
        stroke-linecap="round" stroke-dasharray="5 9" opacity="0.7"/>
      <!-- 锚点（Navbar 侧） -->
      <circle :cx="anchorX" :cy="anchorY" r="5.5" fill="#FFD600" stroke="#1A1A1A" stroke-width="2.5"/>
      <circle :cx="anchorX" :cy="anchorY" r="2" fill="#1A1A1A"/>
      <!-- 标牌连接点 -->
      <circle :cx="px" :cy="py" r="4" fill="#1A1A1A" stroke="#FFD600" stroke-width="2"/>
    </svg>

    <!-- AI LAB 标牌（可拖动） -->
    <div
      ref="charmEl"
      class="physics-charm"
      :class="{ 'charm--dragging': isDragging }"
      :style="charmDragStyle"
      role="banner"
      aria-label="AI Lab — 可拖动"
      @pointerdown="startDrag"
    >
      <!-- 几何装饰 -->
      <svg class="charm-deco" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <rect x="0" y="0" width="8" height="8" fill="#FF6B6B" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="10" y="3" width="5" height="5" fill="#2979FF" stroke="#1A1A1A" stroke-width="1.5"/>
        <polygon points="36,38 44,38 44,44" fill="#FFD600" stroke="#1A1A1A" stroke-width="1.5"/>
        <circle cx="40" cy="5" r="4" fill="#00E5A0" stroke="#1A1A1A" stroke-width="2"/>
        <line x1="12" y1="6" x2="36" y2="40" stroke="#1A1A1A" stroke-width="1.5" stroke-dasharray="3 4" stroke-opacity="0.3"/>
      </svg>

      <div class="charm-card">
        <span class="charm-tag">{{ modelTag }}</span>
        <span class="charm-title">AI LAB</span>
        <span class="charm-sub">DRAW · ANALYZE · GUESS</span>
      </div>

      <!-- 拖动抓手提示 -->
      <div class="drag-handle" aria-hidden="true" title="拖动">
        <span>⠿</span>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { selectedVisionModel, MODEL_META } from '@/api/aiService'

const props = defineProps<{ isActive: boolean }>()

const charmEl = ref<HTMLElement | null>(null)
const modelTag = computed(() => MODEL_META[selectedVisionModel.value].tag)

// ── 锚点：Navbar 底部右侧区域 ─────────────────────────────────────────────
// Navbar = header 高度约 100px（两行 56+44），锚点设在右侧
const NAVBAR_HEIGHT = 100
const ANCHOR_RIGHT_OFFSET = 100 // 距右边缘距离

const anchorX = ref(0)
const anchorY = ref(NAVBAR_HEIGHT)

// ── 标牌静止位置（相对锚点） ───────────────────────────────────────────────
const REST_OFFSET_X = -140
const REST_OFFSET_Y = 90

function getRestX() { return anchorX.value + REST_OFFSET_X }
function getRestY() { return anchorY.value + REST_OFFSET_Y }

// ── 标牌当前位置（ref 保证响应性） ─────────────────────────────────────────
const px = ref(0)
const py = ref(0)
const pAngle = ref(-8)

// ── 弹簧物理（速度用普通变量） ─────────────────────────────────────────────
let vx = 0, vy = 0, vAngle = 0
let rafId: number | null = null

const SPRING_K = 0.055
const SPRING_K_A = 0.055
const DAMPING = 0.76
const DAMPING_A = 0.73
const REST_ANGLE = -8

function springTick() {
  const dx = getRestX() - px.value
  const dy = getRestY() - py.value
  vx = (vx + dx * SPRING_K) * DAMPING
  vy = (vy + dy * SPRING_K) * DAMPING
  px.value += vx
  py.value += vy

  const da = REST_ANGLE - pAngle.value
  vAngle = (vAngle + da * SPRING_K_A) * DAMPING_A
  pAngle.value += vAngle

  const settled =
    Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05 &&
    Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3 &&
    Math.abs(vAngle) < 0.03 && Math.abs(da) < 0.2

  if (settled) {
    px.value = getRestX(); py.value = getRestY()
    pAngle.value = REST_ANGLE
    vx = 0; vy = 0; vAngle = 0
    rafId = null
    return
  }
  rafId = requestAnimationFrame(springTick)
}

function startSpring() {
  if (!rafId) rafId = requestAnimationFrame(springTick)
}

// ── SVG 弹力绳路径（贝塞尔曲线） ──────────────────────────────────────────
const ropePath = computed(() => {
  const ax = anchorX.value, ay = anchorY.value
  const bx = px.value, by = py.value
  // 弛度控制点：绳子中点下垂
  const slack = Math.max(30, Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) * 0.35)
  const cx1 = ax + (bx - ax) * 0.25
  const cy1 = ay + slack
  const cx2 = ax + (bx - ax) * 0.75
  const cy2 = by - slack * 0.3
  return `M ${ax} ${ay} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${bx} ${by}`
})

// ── 标牌 CSS 样式 ──────────────────────────────────────────────────────────
const charmDragStyle = computed(() => ({
  left: `${px.value - 10}px`,
  top: `${py.value - 6}px`,
  transform: `rotate(${pAngle.value}deg)`,
  transformOrigin: 'top center',
}))

// ── 拖动逻辑 ───────────────────────────────────────────────────────────────
let isDragging = ref(false)
let dragStartX = 0, dragStartY = 0
let dragStartPX = 0, dragStartPY = 0

function startDrag(e: PointerEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  vx = 0; vy = 0; vAngle = 0

  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartPX = px.value
  dragStartPY = py.value

  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onDragMove, { passive: false })
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  px.value = dragStartPX + (e.clientX - dragStartX)
  py.value = dragStartPY + (e.clientY - dragStartY)
  // 拖动时角度跟随移动方向
  const velX = e.clientX - dragStartX - (px.value - dragStartPX - (e.clientX - dragStartX))
  pAngle.value = Math.max(-25, Math.min(25, (px.value - getRestX()) * 0.12))
}

function stopDrag(e: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  // 松手时给一个基于拖动速度的初始冲量
  vx = (px.value - dragStartPX) * 0.04
  vy = (py.value - dragStartPY) * 0.04
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
  startSpring()
}

// ── 窗口 resize：更新锚点 ──────────────────────────────────────────────────
function updateAnchor() {
  anchorX.value = window.innerWidth - ANCHOR_RIGHT_OFFSET
  anchorY.value = NAVBAR_HEIGHT
  if (!isDragging.value && !rafId) {
    px.value = getRestX()
    py.value = getRestY()
  }
}

// ── 生命周期 ───────────────────────────────────────────────────────────────
onMounted(() => {
  updateAnchor()
  px.value = getRestX()
  py.value = getRestY()
  window.addEventListener('resize', updateAnchor)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', updateAnchor)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
})
</script>

<style scoped>
/* 全屏 SVG 绳子层 */
.rope-svg {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 21;
  pointer-events: none;
  overflow: visible;
}

/* 标牌容器 */
.physics-charm {
  position: fixed;
  z-index: 22;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  cursor: grab;
  will-change: transform, left, top;
  user-select: none;
}

.physics-charm.charm--dragging {
  cursor: grabbing;
}

/* 几何装饰层 */
.charm-deco {
  position: absolute;
  top: -10px;
  left: -8px;
  z-index: 0;
  pointer-events: none;
  filter: drop-shadow(1px 1px 0px #1A1A1A);
}

/* 主卡片 */
.charm-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: #FFD600;
  border: 3px solid #1A1A1A;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  padding: 12px 20px 14px;
  min-width: 170px;
  transition: box-shadow 0.1s, transform 0.1s;
}

.physics-charm:hover .charm-card {
  box-shadow: 7px 7px 0 0 #1A1A1A;
}

.physics-charm.charm--dragging .charm-card {
  box-shadow: 3px 3px 0 0 #1A1A1A;
}

/* 顶部 model 标签 */
.charm-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #1A1A1A80;
  text-transform: uppercase;
}

/* 主标题 */
.charm-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 40px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

/* 底部副标题 */
.charm-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #1A1A1A;
  text-transform: uppercase;
  border-top: 2px solid #1A1A1A;
  padding-top: 5px;
  margin-top: 3px;
}

/* 拖动抓手 */
.drag-handle {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #1A1A1A40;
  letter-spacing: -1px;
  pointer-events: none;
}

/* 手机端缩小 */
@media (max-width: 640px) {
  .charm-card {
    min-width: 120px;
    padding: 8px 12px 10px;
  }
  .charm-title {
    font-size: 28px;
  }
  .charm-sub {
    font-size: 7px;
  }
}
</style>
