<template>
  <!--
    PhysicsCharm.vue — 真实 2D 弹簧物理挂饰 v8.6
    两个 Teleport to="body"：脱离任何父容器的 overflow/transform/clip 限制
    - rope-svg: 全屏 SVG 绘制绳索，坐标系与视口完全一致
    - physics-charm: 标牌 div，position:fixed 坐标不受父容器影响
  -->
  <Teleport to="body">
    <!-- v-show 而非 v-if：避免 isActive 切换时重新挂载导致 anchor/px/py 竞态 -->
    <svg
      v-show="isActive"
      class="rope-svg"
      aria-hidden="true"
      style="position:fixed;inset:0;width:100vw;height:100vh;overflow:visible;pointer-events:none;z-index:9000;"
    >
      <defs>
        <filter id="rope-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#1A1A1A" flood-opacity="0.25"/>
        </filter>
      </defs>
      <!-- 绳索主体 -->
      <line
        :x1="anchorX" :y1="anchorY"
        :x2="px" :y2="ropeEndY"
        stroke="#1A1A1A" stroke-width="4"
        stroke-linecap="round"
        filter="url(#rope-shadow)"
        opacity="0.9"
      />
      <!-- 锚点螺钉 -->
      <circle :cx="anchorX" :cy="anchorY" r="7" fill="#FFD600" stroke="#1A1A1A" stroke-width="2.5"/>
      <circle :cx="anchorX" :cy="anchorY" r="3" fill="#1A1A1A"/>
      <line :x1="anchorX - 6" :y1="anchorY" :x2="anchorX + 6" :y2="anchorY" stroke="#1A1A1A" stroke-width="1.5" opacity="0.4"/>
      <!-- 绳端挂钩点 -->
      <circle :cx="px" :cy="ropeEndY" r="5" fill="#1A1A1A" stroke="#FFD600" stroke-width="2.5"/>
    </svg>
  </Teleport>

  <Teleport to="body">
    <div
      v-show="isActive"
      class="physics-charm"
      :class="{ 'charm--dragging': isDragging, 'charm--settled': isSettled }"
      :style="charmStyle"
      role="banner"
      aria-label="AI Lab 可拖动挂饰，拖动后松手触发弹性回弹"
      @pointerdown="startDrag"
    >
      <!-- 拖拽热区：横向扩大到视口 40% / 2 = 20vw，纵向不扩大 -->
      <div class="drag-hitarea" aria-hidden="true"></div>
      <!-- Memphis 装饰元素 -->
      <svg class="charm-deco" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="0" y="0" width="9" height="9" fill="#FF6B6B" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="11" y="3" width="5" height="5" fill="#2979FF" stroke="#1A1A1A" stroke-width="1.5"/>
        <polygon points="37,39 46,39 46,46" fill="#FFD600" stroke="#1A1A1A" stroke-width="1.5"/>
        <circle cx="42" cy="5" r="4.5" fill="#00E5A0" stroke="#1A1A1A" stroke-width="2"/>
        <line x1="13" y1="7" x2="37" y2="41" stroke="#1A1A1A" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.25"/>
      </svg>

      <div class="charm-card">
        <div class="charm-header">
          <span class="charm-tag">{{ modelTag }}</span>
          <span class="charm-dot" aria-label="active" title="AI Ready"></span>
        </div>
        <span class="charm-title">AI LAB</span>
        <div class="charm-footer">
          <span class="charm-sub">DRAW · ANALYZE · GUESS</span>
          <span class="charm-hint" aria-hidden="true">↕ DRAG</span>
        </div>
      </div>

      <div class="drag-handle" aria-hidden="true" title="拖动我"><span>⠿</span></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { selectedVisionModel, MODEL_META } from '@/api/aiService'

const props = defineProps<{
  /** 始终为 true：组件一直挂载，绳索一直可见 */
  isActive: boolean
  /** true = 画板已打开，触发物理入场；false = 画板关闭，绳索静止悬挂 */
  isDrawing: boolean
}>()
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
// 调参原则：
//   - DAMPING 越高 → 每帧保留速度比例越高 → 振幅衰减越慢 → 弹跳次数更多
//   - SPRING_K 越大 → 弹力越强 → 振荡频率越高（改小 = 慢悠悠大摆幅）
//   - GRAVITY 对归位后上下振荡贡献明显，适度保留
const GRAVITY    = 0.25    // 较小重力 → 下落感柔和，上下振幅更显著
const SPRING_K   = 0.028   // ↓ 弹簧系数减小 → 慢悠悠大摆幅（原0.042）
const DAMPING    = 0.935   // ↑ 高阻尼保留率 → 振荡衰减非常慢（原0.80）
const ANGLE_K    = 0.032   // 旋转回正弹簧（配合 SPRING_K 同步调慢）
const ANGLE_DAMP = 0.92    // ↑ 旋转阻尼 → 摆动角度跟随线速度更流畅
const REST_ANGLE = 0
const MAX_RADIUS = 580     // 最大拉伸半径
const ROPE_LEN   = 100     // 绳子自然长度（↑ 略加长，静止位置更低更突出）

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

  // 6. 旋转（跟随 x 速度，系数 × 2.2 让摆幅更明显）
  const targetAngle = REST_ANGLE + vx * 2.2
  const da = targetAngle - pAngle.value
  vAngle = (vAngle + da * ANGLE_K) * ANGLE_DAMP
  pAngle.value += vAngle

  // 7. 收敛检测（阈值宽松以匹配高阻尼参数，避免无限循环）
  const settled =
    Math.abs(vx) < 0.08 && Math.abs(vy) < 0.08 &&
    Math.abs(dx) < 1.2  && Math.abs(dy) < 1.2  &&
    Math.abs(vAngle) < 0.04

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
  const delay = 3500 + Math.random() * 2500
  idleTimer = setTimeout(() => {
    if (!isDragging.value && isSettled.value) {
      const side = Math.random() > 0.5 ? 1 : -1
      vx = side * (2.5 + Math.random() * 2.0)
      vy = -(0.8 + Math.random() * 0.8)
      vAngle = side * (1.2 + Math.random() * 0.8)
      startPhysics()
    } else if (!isDragging.value) {
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

  // 松手冲量：位移越大弹力越猛，系数上调保证回弹第一波足够大
  const dispX = px.value - getRestPos().x
  const dispY = py.value - getRestPos().y
  const dist = Math.sqrt(dispX * dispX + dispY * dispY)
  const impulse = Math.min(dist * 0.12, 28) // 0.09→0.12，上限 22→28
  if (dist > 1) {
    vx = -(dispX / dist) * impulse
    vy = -(dispY / dist) * impulse
    // 附加旋转冲量，松手瞬间有明显甩动感
    vAngle = (-vx / Math.max(impulse, 1)) * 3.5
  }

  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
  startPhysics()
}

// ── isDrawing 切换：画板开启时物理入场，关闭时继续静止悬挂 ──────────────────
watch(() => props.isDrawing, (drawing) => {
  if (drawing) {
    // 延迟 80ms：等父组件 v-if 面板渲染 + updateStreamAnchor 两次 nextTick 后再入场
    setTimeout(() => {
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
    }, 80)
  } else {
    // 画板关闭：不停物理，让绳索自然收敛到静止位置（增加一个向 rest 的冲量）
    if (!isDragging.value) {
      const rest = getRestPos()
      const dispX = px.value - rest.x
      const dispY = py.value - rest.y
      const dist = Math.sqrt(dispX * dispX + dispY * dispY)
      if (dist > 2) {
        // 给一个轻轻归位冲量，让绳索摆回来
        vx += -(dispX / dist) * Math.min(dist * 0.05, 4)
        vy += -(dispY / dist) * Math.min(dist * 0.05, 4)
        startPhysics()
      }
    }
  }
})

// ── 生命周期 ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  // nextTick 等父组件 provide 的 streamAnchor 初始值写入后再读取
  await nextTick()
  syncAnchor()

  // 若锚点仍在 (0,0)（inject 未命中），使用与 MemphisGameBg fallback 一致的默认值
  if (anchorX.value === 0 && anchorY.value === 0) {
    anchorX.value = window.innerWidth - 120
    anchorY.value = 52
  }

  // 初始化：直接定位到静止悬挂位置，绳索常驻可见
  const rest = getRestPos()
  px.value = rest.x
  py.value = rest.y
  pAngle.value = 0
  isSettled.value = true
  // 延迟启动 idle 引导动效
  scheduleIdleAnimation()
  // 若挂载时画板已开，立即触发入场
  if (props.isDrawing) {
    px.value = rest.x + (Math.random() - 0.5) * 20
    py.value = anchorY.value + 10
    vx = (Math.random() - 0.5) * 1.5
    vy = 0.8
    vAngle = (Math.random() - 0.5) * 2
    isSettled.value = false
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
  /* 高于所有 UI 层（画板激活时 z-index:60，工具栏 z-index:22），低于 modal(9999) */
  z-index: 9000;
  pointer-events: none;
  overflow: visible;
}

.physics-charm {
  position: fixed;
  z-index: 9001;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: grab;
  will-change: transform, left, top;
  user-select: none;
  isolation: isolate;
}

.physics-charm.charm--dragging {
  cursor: grabbing;
}

/* ── Memphis 装饰图形 ─────────────────────────────────────────────────────── */
.charm-deco {
  position: absolute;
  top: -12px;
  left: -10px;
  z-index: 0;
  pointer-events: none;
  filter: drop-shadow(1px 1px 0px #1A1A1A);
}

/* ── 透明拖拽扩展热区：横向扩展 20vw（左右各 10vw），纵向不扩大 ──────────── */
.drag-hitarea {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -10vw;
  right: -10vw;
  z-index: 0;
  pointer-events: auto;
  cursor: grab;
  background: transparent;
}

.charm--dragging .drag-hitarea {
  cursor: grabbing;
}

/* ── 主卡片 ─────────────────────────────────────────────────────────────── */
.charm-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #FFD600;
  border: 3px solid #1A1A1A;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  padding: 10px 18px 12px;
  min-width: 175px;
  transition: box-shadow 0.12s ease, transform 0.12s ease;
}

.physics-charm:active .charm-card,
.physics-charm.charm--dragging .charm-card {
  box-shadow: 2px 2px 0 0 #1A1A1A;
  transform: translate(4px, 4px);
}

/* ── 顶部 header：模型标签 + 状态指示灯 ─────────────────────────────────── */
.charm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.charm-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #1A1A1A70;
  text-transform: uppercase;
}

/* 活跃状态绿点 */
.charm-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00C853;
  border: 1.5px solid #1A1A1A;
  animation: dot-blink 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* ── 主标题 ─────────────────────────────────────────────────────────────── */
.charm-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 42px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 0.92;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

/* ── 底部 footer：操作提示 + 拖拽暗示 ──────────────────────────────────── */
.charm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 2.5px solid #1A1A1A;
  padding-top: 5px;
  margin-top: 2px;
}

.charm-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #1A1A1A;
  text-transform: uppercase;
}

.charm-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #1A1A1A50;
  text-transform: uppercase;
  transition: color 0.2s;
}

.physics-charm:hover .charm-hint {
  color: #1A1A1A;
}

/* ── 拖拽手柄（右上角） ─────────────────────────────────────────────────── */
.drag-handle {
  position: absolute;
  top: 4px;
  right: 5px;
  z-index: 2;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #1A1A1A30;
  letter-spacing: -1px;
  pointer-events: none;
  transition: color 0.2s;
}

.physics-charm:hover .drag-handle {
  color: #1A1A1A80;
}

/* ── 响应式 ─────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .charm-card {
    min-width: 130px;
    padding: 8px 12px 10px;
  }
  .charm-title { font-size: 30px; }
  .charm-sub { font-size: 6px; }
  .charm-hint { display: none; }
}

/* ── Settled（静止）状态：idle 脉冲引导 ─────────────────────────────────── */
.charm--settled .charm-card {
  animation: charm-idle-pulse 3.5s ease-in-out infinite;
}

@keyframes charm-idle-pulse {
  0%, 100% {
    box-shadow: 6px 6px 0 0 #1A1A1A;
  }
  45%, 55% {
    box-shadow: 6px 6px 0 0 #1A1A1A, 0 0 0 5px #FFD60055, 0 0 12px 2px #FFD60022;
  }
}

/* ── 拖拽时关闭所有动画 ─────────────────────────────────────────────────── */
.charm--dragging .charm-card,
.charm--dragging .charm-dot {
  animation: none;
}
</style>
