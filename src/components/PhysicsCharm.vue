<template>
  <!--
    PhysicsCharm.vue — ZZZ 风格弹力绳物理挂饰 (v8.2)
    - 黄底黑字 Memphis 标签，连接不可见弹力绳
    - 鼠标/触摸滑动时产生惯性摆动和回弹
    - CSS transform 驱动，无布局抖动
    - 性能优化：RAF + 轻量弹簧算法，手机端自动降频
  -->
  <div
    ref="charmEl"
    class="physics-charm"
    :class="{ 'charm--active': isActive }"
    :style="charmStyle"
    role="banner"
    aria-label="AI Lab"
    @pointerdown.prevent
  >
    <!-- 像素风几何装饰 -->
    <svg class="charm-deco" width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="8" height="8" fill="#FF6B6B" stroke="#1A1A1A" stroke-width="2"/>
      <rect x="10" y="3" width="5" height="5" fill="#2979FF" stroke="#1A1A1A" stroke-width="1.5"/>
      <polygon points="44,46 54,46 54,54" fill="#FFD600" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="6" r="4" fill="#00E5A0" stroke="#1A1A1A" stroke-width="2"/>
      <line x1="14" y1="6" x2="42" y2="44" stroke="#1A1A1A" stroke-width="1.5" stroke-dasharray="3 4" stroke-opacity="0.35"/>
    </svg>
    <!-- 主标志文字卡片 -->
    <div class="charm-card">
      <span class="charm-tag">{{ modelTag }}</span>
      <span class="charm-title">AI LAB</span>
      <span class="charm-sub">DRAW · ANALYZE · GUESS</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { selectedVisionModel, MODEL_META } from '@/api/aiService'

const props = defineProps<{
  isActive: boolean
}>()

const charmEl = ref<HTMLElement | null>(null)

// ── 模型标签 ─────────────────────────────────────────────────────────────────
const modelTag = computed(() => MODEL_META[selectedVisionModel.value].tag)

// ── 弹簧物理状态 ──────────────────────────────────────────────────────────────
interface PhysicsState {
  x: number; y: number
  vx: number; vy: number
  angle: number
  vAngle: number
}

const state: PhysicsState = {
  x: ANCHOR_X, y: ANCHOR_Y,
  vx: 0, vy: 0,
  angle: 0,
  vAngle: 0,
}

const ANCHOR_X = 20
const ANCHOR_Y = 110
const SPRING_K = 0.008
const SPRING_K_ANGLE = 0.01
const DAMPING = 0.88
const DAMPING_ANGLE = 0.84
const IMPULSE_SCALE = 1.2
const MOBILE_IMPULSE = 0.6

let rafId: number | null = null
let isMobile = false

// ── 计算样式 ──────────────────────────────────────────────────────────────────
const charmStyle = computed(() => ({
  transform: `translate(${state.x}px, ${state.y}px) rotate(${state.angle}deg)`,
  transition: 'none',
}))

// ── 弹簧积分 ──────────────────────────────────────────────────────────────────
function springTick() {
  // 位置弹簧
  const dx = ANCHOR_X - state.x
  const dy = ANCHOR_Y - state.y
  state.vx += dx * SPRING_K
  state.vy += dy * SPRING_K
  state.vx *= DAMPING
  state.vy *= DAMPING
  state.x += state.vx
  state.y += state.vy

  // 角度弹簧
  state.vAngle -= state.angle * SPRING_K_ANGLE
  state.vAngle *= DAMPING_ANGLE
  state.angle += state.vAngle

  // 微小值置零，节省 CPU
  if (Math.abs(state.vx) < 0.01 && Math.abs(state.vy) < 0.01 &&
      Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 &&
      Math.abs(state.vAngle) < 0.005 && Math.abs(state.angle) < 0.1) {
    state.x = ANCHOR_X
    state.y = ANCHOR_Y
    state.vx = 0; state.vy = 0
    state.angle = 0; state.vAngle = 0
    rafId = null
    return
  }

  rafId = requestAnimationFrame(springTick)
}

function pokeSpring(clientX: number, clientY: number) {
  const scale = isMobile ? MOBILE_IMPULSE : IMPULSE_SCALE
  // 向鼠标反方向施加推力（挂饰远离鼠标）
  state.vx += (state.x - clientX * 0.15) * 0.02 * scale
  state.vy += (state.y - clientY * 0.15) * 0.02 * scale
  // 旋转推力
  state.vAngle += ((clientX - window.innerWidth / 2) / window.innerWidth) * 0.04 * scale

  if (!rafId || rafId <= 0) {
    rafId = requestAnimationFrame(springTick)
  }
}

// ── 全局鼠标/触摸监听 ─────────────────────────────────────────────────────────
let lastPokeTime = 0
const POKE_THROTTLE = 32 // ~30fps on pointer move

function onPointerMove(e: PointerEvent) {
  if (!props.isActive) return
  const now = performance.now()
  if (now - lastPokeTime < POKE_THROTTLE) return
  lastPokeTime = now
  pokeSpring(e.clientX, e.clientY)
}

function onPointerDown(e: PointerEvent) {
  if (!props.isActive) return
  pokeSpring(e.clientX, e.clientY)
  // 点击给一个更大的推动
  state.vx += (Math.random() - 0.5) * 6
  state.vy += (Math.random() - 0.5) * 6
  state.vAngle += (Math.random() - 0.5) * 1.5
  if (!rafId || rafId <= 0) {
    rafId = requestAnimationFrame(springTick)
  }
}

// ── 生命周期 ──────────────────────────────────────────────────────────────────
function detectMobile() {
  isMobile = window.innerWidth <= 640
}

onMounted(() => {
  detectMobile()
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', detectMobile)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('resize', detectMobile)
})
</script>

<style scoped>
.physics-charm {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 22;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  pointer-events: none;
  opacity: 0;
  transform: translate(20px, 110px);
  will-change: transform;
}

.charm--active {
  opacity: 1;
  transition: opacity 0.3s ease;
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
  min-width: 180px;
}

/* 顶部小标签 */
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
  font-size: 44px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

/* 底部副标题 */
.charm-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #1A1A1A;
  text-transform: uppercase;
  border-top: 2px solid #1A1A1A;
  padding-top: 5px;
  margin-top: 3px;
}

/* 手机端缩小 */
@media (max-width: 640px) {
  .charm-card {
    min-width: 130px;
    padding: 8px 14px 10px;
  }
  .charm-title {
    font-size: 30px;
  }
}
</style>
