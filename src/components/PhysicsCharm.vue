<template>
  <!--
    PhysicsCharm.vue — 真实 2D 弹簧物理挂饰 v8.3
    锚点：inject('streamAnchor') → recognition-stream 底边中心
    物理：重力 + 胡克定律 + 阻尼，rAF 演算
  -->
  <template v-if="isActive">
    <svg class="rope-svg" aria-hidden="true">
      <defs>
        <filter id="rope-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#1A1A1A" flood-opacity="0.3"/>
        </filter>
      </defs>
      <line
        :x1="anchorX" :y1="anchorY"
        :x2="px" :y2="py"
        stroke="#1A1A1A" stroke-width="3"
        stroke-linecap="round"
        filter="url(#rope-shadow)"
      />
      <circle :cx="anchorX" :cy="anchorY" r="5" fill="#FFD600" stroke="#1A1A1A" stroke-width="2.5"/>
      <circle :cx="anchorX" :cy="anchorY" r="2" fill="#1A1A1A"/>
      <circle :cx="px" :cy="py" r="3.5" fill="#1A1A1A" stroke="#FFD600" stroke-width="2"/>
    </svg>

    <div
      ref="charmEl"
      class="physics-charm"
      :class="{ 'charm--dragging': isDragging }"
      :style="charmStyle"
      role="banner"
      aria-label="AI Lab 可拖动挂饰"
      @pointerdown="startDrag"
    >
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

      <div class="drag-handle" aria-hidden="true" title="拖动"><span>⠿</span></div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted } from 'vue'
import { selectedVisionModel, MODEL_META } from '@/api/aiService'

const props = defineProps<{ isActive: boolean }>()
const modelTag = computed(() => MODEL_META[selectedVisionModel.value].tag)

// ── 从父组件 inject 锚点（recognition-stream 底边中心） ────────────────────
const streamAnchor = inject<ReturnType<typeof ref<{ x: number; y: number }>>>('streamAnchor')

const anchorX = ref(0)
const anchorY = ref(0)

function syncAnchor() {
  if (streamAnchor?.value) {
    anchorX.value = streamAnchor.value.x
    anchorY.value = streamAnchor.value.y
  }
}

watch(streamAnchor!, (val) => {
  if (val) {
    anchorX.value = val.x
    anchorY.value = val.y
    if (!isDragging.value) scheduleWindGust()
  }
}, { deep: true })

// ── 标牌宽度估算（用于居中） ────────────────────────────────────────────────
const CHARM_W = 170

// ── 物理状态 ─────────────────────────────────────────────────────────────────
// 标牌质心坐标
const px = ref(0)
const py = ref(0)
// 速度
let vx = 0
let vy = 0
// 旋转角（度）
const pAngle = ref(0)
let vAngle = 0

// ── 物理常数 ─────────────────────────────────────────────────────────────────
const GRAVITY = 0.35        // 每帧重力加速度 px/frame²
const SPRING_K = 0.045      // 胡克系数（弹簧张力）
const DAMPING = 0.78        // 速度阻尼（0~1，越小衰减越快）
const ANGLE_K = 0.04        // 旋转回正弹簧
const ANGLE_DAMPING = 0.75  // 旋转阻尼
const REST_ANGLE = 0        // 静止角度
const MAX_RADIUS = 420      // 最大拉伸半径，防止飞出屏幕
const ROPE_LEN = 90         // 绳子自然长度（锚点到标牌中心）

let rafId: number | null = null
let windTimer: ReturnType<typeof setTimeout> | null = null

// ── 计算自然悬挂位置（锚点正下方 ROPE_LEN 处） ──────────────────────────────
function getRestPos() {
  return { x: anchorX.value, y: anchorY.value + ROPE_LEN }
}

// ── 启动物理循环 ──────────────────────────────────────────────────────────────
function startPhysics() {
  if (!rafId) rafId = requestAnimationFrame(physicsTick)
}

function stopPhysics() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

function physicsTick() {
  const rest = getRestPos()

  // 1. 胡克定律：弹力指向 rest 点
  const dx = rest.x - px.value
  const dy = rest.y - py.value

  // 弹簧力（F = -kx）
  const fx = dx * SPRING_K
  const fy = dy * SPRING_K

  // 2. 重力（只作用于 y 轴，让标牌在松开时先下坠再被弹回）
  const gravY = GRAVITY

  // 3. 更新速度（弹力 + 重力 + 阻尼）
  vx = (vx + fx) * DAMPING
  vy = (vy + fy + gravY) * DAMPING

  // 4. 更新位置
  px.value += vx
  py.value += vy

  // 5. 边界约束（最大拉伸限制）
  const totalDx = px.value - anchorX.value
  const totalDy = py.value - anchorY.value
  const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy)
  if (totalDist > MAX_RADIUS) {
    const scale = MAX_RADIUS / totalDist
    px.value = anchorX.value + totalDx * scale
    py.value = anchorY.value + totalDy * scale
    // 碰壁时截断速度
    vx *= 0.3
    vy *= 0.3
  }

  // 6. 屏幕边界
  const margin = 20
  if (px.value < margin) { px.value = margin; vx = Math.abs(vx) * 0.5 }
  if (px.value > window.innerWidth - margin) { px.value = window.innerWidth - margin; vx = -Math.abs(vx) * 0.5 }
  if (py.value < margin) { py.value = margin; vy = Math.abs(vy) * 0.5 }
  if (py.value > window.innerHeight - margin) { py.value = window.innerHeight - margin; vy = -Math.abs(vy) * 0.5 }

  // 7. 旋转（跟随 x 方向速度）
  const targetAngle = REST_ANGLE + vx * 1.8
  const da = targetAngle - pAngle.value
  vAngle = (vAngle + da * ANGLE_K) * ANGLE_DAMPING
  pAngle.value += vAngle

  // 8. 收敛检测
  const settled =
    Math.abs(vx) < 0.04 && Math.abs(vy) < 0.04 &&
    Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 &&
    Math.abs(vAngle) < 0.02

  if (settled) {
    px.value = rest.x
    py.value = rest.y
    pAngle.value = REST_ANGLE
    vx = 0; vy = 0; vAngle = 0
    rafId = null
    return
  }

  rafId = requestAnimationFrame(physicsTick)
}

// ── 微风摆动（resize 触发） ───────────────────────────────────────────────────
function scheduleWindGust() {
  if (windTimer) clearTimeout(windTimer)
  windTimer = setTimeout(() => {
    if (!isDragging.value) {
      vx += (Math.random() - 0.5) * 3.5
      vy += Math.random() * 1.5
      startPhysics()
    }
  }, 80)
}

// ── CSS 样式（标牌左上角 = 质心 - 半宽/半高） ─────────────────────────────
const charmStyle = computed(() => ({
  left: `${px.value - CHARM_W / 2}px`,
  top: `${py.value - 6}px`,
  transform: `rotate(${pAngle.value}deg)`,
  transformOrigin: 'top center',
}))

// ── 拖动逻辑 ─────────────────────────────────────────────────────────────────
const isDragging = ref(false)
let dragStartClientX = 0, dragStartClientY = 0
let dragStartPX = 0, dragStartPY = 0

function startDrag(e: PointerEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  stopPhysics()
  vx = 0; vy = 0; vAngle = 0

  dragStartClientX = e.clientX
  dragStartClientY = e.clientY
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
  const nx = dragStartPX + (e.clientX - dragStartClientX)
  const ny = dragStartPY + (e.clientY - dragStartClientY)

  // 最大拉伸限制
  const ddx = nx - anchorX.value
  const ddy = ny - anchorY.value
  const dd = Math.sqrt(ddx * ddx + ddy * ddy)
  if (dd > MAX_RADIUS) {
    const s = MAX_RADIUS / dd
    px.value = anchorX.value + ddx * s
    py.value = anchorY.value + ddy * s
  } else {
    px.value = nx
    py.value = ny
  }

  // 拖动时旋转跟随偏移
  const offsetFromRest = px.value - getRestPos().x
  pAngle.value = Math.max(-28, Math.min(28, offsetFromRest * 0.1))
}

function stopDrag(_e: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false

  // 松手冲量：基于位移而非速度，体现胡克定律"拉越远弹越猛"
  const dispX = px.value - getRestPos().x
  const dispY = py.value - getRestPos().y
  const dist = Math.sqrt(dispX * dispX + dispY * dispY)
  const impulse = Math.min(dist * 0.08, 18) // 限幅防止过猛
  if (dist > 1) {
    vx = -(dispX / dist) * impulse
    vy = -(dispY / dist) * impulse
  }

  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
  startPhysics()
}

// ── isActive 切换时初始化物理 ─────────────────────────────────────────────────
watch(() => props.isActive, (active) => {
  if (active) {
    syncAnchor()
    // 从锚点位置下落，模拟标牌被"放下"
    px.value = anchorX.value
    py.value = anchorY.value
    vx = 0; vy = 0.5; vAngle = 0
    pAngle.value = 0
    startPhysics()
  } else {
    stopPhysics()
  }
})

// ── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(() => {
  syncAnchor()
  if (props.isActive) {
    px.value = anchorX.value
    py.value = anchorY.value
    vx = 0; vy = 0.5
    startPhysics()
  }
})

onUnmounted(() => {
  stopPhysics()
  if (windTimer) clearTimeout(windTimer)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
})
</script>

<style scoped>
.rope-svg {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 21;
  pointer-events: none;
  overflow: visible;
}

.physics-charm {
  position: fixed;
  z-index: 22;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: grab;
  will-change: transform, left, top;
  user-select: none;
}

.physics-charm.charm--dragging {
  cursor: grabbing;
}

.charm-deco {
  position: absolute;
  top: -10px;
  left: -8px;
  z-index: 0;
  pointer-events: none;
  filter: drop-shadow(1px 1px 0px #1A1A1A);
}

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
  transition: box-shadow 0.1s;
}

.physics-charm:hover .charm-card {
  box-shadow: 7px 7px 0 0 #1A1A1A;
}

.physics-charm.charm--dragging .charm-card {
  box-shadow: 3px 3px 0 0 #1A1A1A;
}

.charm-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #1A1A1A80;
  text-transform: uppercase;
}

.charm-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 40px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

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

@media (max-width: 640px) {
  .charm-card {
    min-width: 120px;
    padding: 8px 12px 10px;
  }
  .charm-title { font-size: 28px; }
  .charm-sub { font-size: 7px; }
}
</style>
