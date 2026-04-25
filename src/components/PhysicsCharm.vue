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
      <!-- 绳索：锚点 → 标牌顶边中心（py - CHARM_TOP_OFFSET） -->
      <line
        :x1="anchorX" :y1="anchorY"
        :x2="px" :y2="ropeEndY"
        stroke="#1A1A1A" stroke-width="3"
        stroke-linecap="round"
        filter="url(#rope-shadow)"
      />
      <circle :cx="anchorX" :cy="anchorY" r="5" fill="#FFD600" stroke="#1A1A1A" stroke-width="2.5"/>
      <circle :cx="anchorX" :cy="anchorY" r="2" fill="#1A1A1A"/>
      <circle :cx="px" :cy="ropeEndY" r="3.5" fill="#1A1A1A" stroke="#FFD600" stroke-width="2"/>
    </svg>

    <div
      class="physics-charm"
      :class="{ 'charm--dragging': isDragging, 'charm--settled': isSettled }"
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
    // 锚点变化时：若已收敛则直接跟随到新 rest 位置；否则施加微风
    if (!isDragging.value) {
      if (isSettled.value) {
        const rest = getRestPos()
        px.value = rest.x
        py.value = rest.y
      } else {
        scheduleWindGust()
      }
    }
  }
}, { deep: true })

// ── 尺寸常量 ─────────────────────────────────────────────────────────────────
const CHARM_W = 170       // 标牌宽度估算（居中用）
const CHARM_HALF_H = 44   // 标牌半高估算（绳子终点偏移到顶边）

// ── 物理状态 ─────────────────────────────────────────────────────────────────
const px = ref(0)     // 标牌质心 x
const py = ref(0)     // 标牌质心 y
let vx = 0
let vy = 0
const pAngle = ref(0) // 旋转角（度）
let vAngle = 0
const isSettled = ref(false) // 是否已物理收敛

// 绳子终点：标牌顶边中心（质心上移半高），始终与标牌绑定
const ropeEndY = computed(() => py.value - CHARM_HALF_H)

// ── 物理常数 ─────────────────────────────────────────────────────────────────
const GRAVITY    = 0.30    // 重力加速度 px/frame²（略微减小，下落更优雅）
const SPRING_K   = 0.042   // 胡克弹簧系数
const DAMPING    = 0.80    // 速度阻尼（↑ = 更多弹跳次数才收敛）
const ANGLE_K    = 0.04    // 旋转回正弹簧
const ANGLE_DAMP = 0.76    // 旋转阻尼
const REST_ANGLE = 0
const MAX_RADIUS = 580     // ↑ 最大拉伸半径（原 420 → 580，拖拽范围更大）
const ROPE_LEN   = 90      // 绳子自然长度（锚点 → 标牌质心距离）

let rafId: number | null = null
let windTimer: ReturnType<typeof setTimeout> | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null  // idle 引导动效定时

// ── 静止悬挂位置（质心）────────────────────────────────────────────────────
function getRestPos() {
  return { x: anchorX.value, y: anchorY.value + ROPE_LEN }
}

// ── 物理循环 ────────────────────────────────────────────────────────────────
function startPhysics() {
  isSettled.value = false
  stopIdleAnimation()
  if (!rafId) rafId = requestAnimationFrame(physicsTick)
}

function stopPhysics() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

function physicsTick() {
  const rest = getRestPos()

  // 1. 胡克弹力
  const dx = rest.x - px.value
  const dy = rest.y - py.value
  const fx = dx * SPRING_K
  const fy = dy * SPRING_K

  // 2. 速度更新（弹力 + 重力 + 阻尼）
  vx = (vx + fx) * DAMPING
  vy = (vy + fy + GRAVITY) * DAMPING

  // 3. 位置更新
  px.value += vx
  py.value += vy

  // 4. 最大拉伸约束
  const totalDx = px.value - anchorX.value
  const totalDy = py.value - anchorY.value
  const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy)
  if (totalDist > MAX_RADIUS) {
    const scale = MAX_RADIUS / totalDist
    px.value = anchorX.value + totalDx * scale
    py.value = anchorY.value + totalDy * scale
    vx *= 0.3; vy *= 0.3
  }

  // 5. 屏幕边界
  const margin = 20
  if (px.value < margin) { px.value = margin; vx = Math.abs(vx) * 0.5 }
  if (px.value > window.innerWidth - margin) { px.value = window.innerWidth - margin; vx = -Math.abs(vx) * 0.5 }
  if (py.value < margin) { py.value = margin; vy = Math.abs(vy) * 0.5 }
  if (py.value > window.innerHeight - margin) { py.value = window.innerHeight - margin; vy = -Math.abs(vy) * 0.5 }

  // 6. 旋转
  const targetAngle = REST_ANGLE + vx * 1.8
  const da = targetAngle - pAngle.value
  vAngle = (vAngle + da * ANGLE_K) * ANGLE_DAMP
  pAngle.value += vAngle

  // 7. 收敛检测
  const settled =
    Math.abs(vx) < 0.04 && Math.abs(vy) < 0.04 &&
    Math.abs(dx) < 0.5  && Math.abs(dy) < 0.5  &&
    Math.abs(vAngle) < 0.02

  if (settled) {
    px.value = rest.x
    py.value = rest.y
    pAngle.value = REST_ANGLE
    vx = 0; vy = 0; vAngle = 0
    isSettled.value = true
    rafId = null
    // 收敛后启动 idle 引导动效循环
    scheduleIdleAnimation()
    return
  }

  rafId = requestAnimationFrame(physicsTick)
}

// ── 微风摆动（resize 或锚点变化触发） ───────────────────────────────────────
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

// ── Idle 引导动效：静止后定期给予轻微冲量，吸引玩家拖动 ────────────────────
function scheduleIdleAnimation() {
  stopIdleAnimation()
  // 3~5s 后触发一次轻摇，循环往复
  const delay = 3000 + Math.random() * 2000
  idleTimer = setTimeout(() => {
    if (!isDragging.value && isSettled.value && props.isActive) {
      // 轻柔的左右微摇冲量
      const side = Math.random() > 0.5 ? 1 : -1
      vx = side * (1.2 + Math.random() * 1.0)
      vy = -(0.4 + Math.random() * 0.4)
      vAngle = side * (0.6 + Math.random() * 0.4)
      startPhysics()
      // 物理结束后会再次调用 scheduleIdleAnimation，形成循环
    } else if (props.isActive && !isDragging.value) {
      scheduleIdleAnimation()
    }
  }, delay)
}

function stopIdleAnimation() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
}

// ── CSS 样式 ─────────────────────────────────────────────────────────────────
const charmStyle = computed(() => ({
  left: `${px.value - CHARM_W / 2}px`,
  top: `${py.value - CHARM_HALF_H}px`,
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
  stopIdleAnimation()
  isSettled.value = false
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

  // 拖动时旋转跟随水平偏移（夹角最大 ±32°）
  const offsetFromRest = px.value - getRestPos().x
  pAngle.value = Math.max(-32, Math.min(32, offsetFromRest * 0.1))
}

function stopDrag(_e: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false

  // 松手冲量：位移越大弹力越猛（胡克定律体现）
  const dispX = px.value - getRestPos().x
  const dispY = py.value - getRestPos().y
  const dist = Math.sqrt(dispX * dispX + dispY * dispY)
  const impulse = Math.min(dist * 0.09, 22) // 稍微提高上限让弹跳更爽
  if (dist > 1) {
    vx = -(dispX / dist) * impulse
    vy = -(dispY / dist) * impulse
  }

  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
  startPhysics()
}

// ── isActive 切换 ─────────────────────────────────────────────────────────────
watch(() => props.isActive, (active) => {
  if (active) {
    syncAnchor()
    const rest = getRestPos()
    // 从锚点高处落下，带入场感
    px.value = rest.x + (Math.random() - 0.5) * 20
    py.value = anchorY.value + 10
    vx = (Math.random() - 0.5) * 1.5
    vy = 0.8
    vAngle = (Math.random() - 0.5) * 2
    pAngle.value = 0
    startPhysics()
  } else {
    stopPhysics()
    stopIdleAnimation()
  }
})

// ── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(() => {
  syncAnchor()
  if (props.isActive) {
    const rest = getRestPos()
    px.value = rest.x + (Math.random() - 0.5) * 20
    py.value = anchorY.value + 10
    vx = (Math.random() - 0.5) * 1.5
    vy = 0.8
    vAngle = (Math.random() - 0.5) * 2
    startPhysics()
  }
})

onUnmounted(() => {
  stopPhysics()
  stopIdleAnimation()
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

/* ── 静止时 idle 引导脉冲：subtle glow + cursor hint ─────────────────────── */
.charm--settled .charm-card {
  animation: charm-idle-pulse 3.2s ease-in-out infinite;
}
.charm--settled .drag-handle {
  animation: handle-fade-in 0.6s ease forwards, handle-pulse 2.4s 0.6s ease-in-out infinite;
  color: #1A1A1A80;
}

@keyframes charm-idle-pulse {
  0%, 100% { box-shadow: 5px 5px 0 0 #1A1A1A; }
  50%       { box-shadow: 5px 5px 0 0 #1A1A1A, 0 0 0 4px #FFD60044; }
}

@keyframes handle-fade-in {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes handle-pulse {
  0%, 100% { color: #1A1A1A40; }
  50%       { color: #1A1A1AAA; }
}

/* ── 拖拽时取消脉冲动画 ──────────────────────────────────────────────────── */
.charm--dragging .charm-card {
  animation: none;
}
</style>
