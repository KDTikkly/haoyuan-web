<template>
  <!--
    MemphisGameBg.vue
    全屏 Matter.js 物理沙盒背景层
    - z-index: -1, pointer-events: none（默认）
    - 鼠标作为不可见刚体推动几何体
    - 点击几何体触发爆炸粒子并销毁
    - 累计消除10个弹出成就徽章
    - 路由离开时销毁引擎
  -->
  <div class="memphis-bg-wrap" aria-hidden="true">
    <canvas ref="canvasRef" class="memphis-canvas" />

    <!-- 爆炸粒子层 (CSS 动画) -->
    <div class="particles-layer" ref="particlesRef"></div>

    <!-- 成就徽章 -->
    <Transition name="badge-pop">
      <div v-if="showBadge" class="achievement-badge" @click="showBadge = false">
        <div class="badge-inner">
          <div class="badge-icon">🏆</div>
          <div class="badge-text">
            <div class="badge-title">{{ badgeTitle }}</div>
            <div class="badge-sub">{{ badgeSub }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Matter from 'matter-js'

const { locale } = useI18n()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const particlesRef = ref<HTMLDivElement | null>(null)
const showBadge = ref(false)

const badgeTitle = ref('')
const badgeSub = ref('')

// ── Memphis colors ──
const COLORS = ['#FFD600', '#FF6B6B', '#2979FF', '#00E5A0', '#A78BFA', '#FF9800']
const INK = '#1A1A1A'

// ── State ──
let engine: Matter.Engine
let runner: Matter.Runner
let render: Matter.Render
let mouseConstraint: Matter.MouseConstraint
let destroyedCount = 0
let animFrameId: number
let resizeObs: ResizeObserver

// Bodies map for click detection
const bodyMap = new Map<number, Matter.Body>()

// ── Shape factory ──
function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

type ShapeType = 'circle' | 'rect' | 'triangle'
function createShape(x: number, y: number, type?: ShapeType): Matter.Body {
  const t = type ?? (['circle', 'rect', 'triangle'] as ShapeType[])[Math.floor(Math.random() * 3)]
  const size = 22 + Math.random() * 28
  const color = randomColor()
  const opts = {
    restitution: 0.55,
    frictionAir: 0.015,
    friction: 0.2,
    render: {
      fillStyle: color,
      strokeStyle: INK,
      lineWidth: 3,
    },
  }

  let body: Matter.Body
  if (t === 'circle') {
    body = Matter.Bodies.circle(x, y, size / 2, opts)
  } else if (t === 'rect') {
    const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8
    body = Matter.Bodies.rectangle(x, y, size, size, { ...opts, angle })
  } else {
    // equilateral triangle via vertices
    const r = size * 0.6
    const verts = [
      { x: 0, y: -r },
      { x: r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6) },
      { x: -r * Math.cos(Math.PI / 6), y: r * Math.sin(Math.PI / 6) },
    ]
    body = Matter.Bodies.fromVertices(x, y, verts, opts, true)
  }

  // store color for explosion
  ;(body as any)._color = color
  return body
}

// ── Spawn initial bodies ──
function spawnBodies(w: number, h: number, count = 18) {
  const bodies: Matter.Body[] = []
  for (let i = 0; i < count; i++) {
    const x = 60 + Math.random() * (w - 120)
    const y = 80 + Math.random() * (h * 0.55)
    const b = createShape(x, y)
    bodies.push(b)
    bodyMap.set(b.id, b)
  }
  Matter.Composite.add(engine.world, bodies)
}

// ── Explosion particle effect ──
function spawnExplosion(x: number, y: number, color: string) {
  const container = particlesRef.value
  if (!container) return
  const count = 10
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span')
    el.className = 'particle'
    const angle = (i / count) * 360
    const dist = 40 + Math.random() * 50
    const size = 6 + Math.random() * 8
    el.style.cssText = `
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      background:${color};
      --dx:${Math.cos((angle * Math.PI) / 180) * dist}px;
      --dy:${Math.sin((angle * Math.PI) / 180) * dist}px;
    `
    container.appendChild(el)
    el.addEventListener('animationend', () => el.remove(), { once: true })
  }
}

// ── Achievement badge ──
function triggerAchievement() {
  badgeTitle.value = locale.value === 'en' ? 'Achievement Unlocked: The Explorer' : '成就解锁：探索者'
  badgeSub.value = locale.value === 'en' ? 'You cleared 10 Memphis shapes!' : '已消除 10 个孟菲斯几何体！'
  showBadge.value = true
  setTimeout(() => { showBadge.value = false }, 4000)
}

// ── Setup ──
function setup() {
  const canvas = canvasRef.value
  if (!canvas) return
  const w = window.innerWidth
  const h = window.innerHeight

  engine = Matter.Engine.create({ gravity: { x: 0, y: 0.45 } })
  runner = Matter.Runner.create()

  render = Matter.Render.create({
    canvas,
    engine,
    options: {
      width: w,
      height: h,
      background: 'transparent',
      wireframes: false,
    },
  })

  // Walls
  const wallOpts = { isStatic: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent', lineWidth: 0 } }
  const walls = [
    Matter.Bodies.rectangle(w / 2, h + 25, w + 100, 50, wallOpts),  // floor
    Matter.Bodies.rectangle(-25, h / 2, 50, h + 100, wallOpts),       // left
    Matter.Bodies.rectangle(w + 25, h / 2, 50, h + 100, wallOpts),    // right
  ]
  Matter.Composite.add(engine.world, walls)

  // Bodies
  spawnBodies(w, h)

  // Invisible mouse body (cursor as rigidbody)
  const mouse = Matter.Mouse.create(canvas)
  mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.05, render: { visible: false } },
  })
  // We want mouse to PUSH bodies, not drag them — disable grabbing
  mouseConstraint.collisionFilter = { mask: 0 } as any
  Matter.Composite.add(engine.world, mouseConstraint)

  // Create a heavy invisible circle that follows the cursor and pushes
  const cursorBody = Matter.Bodies.circle(-200, -200, 28, {
    isStatic: false,
    isSensor: false,
    frictionAir: 1,
    mass: 10,
    render: { fillStyle: 'transparent', strokeStyle: 'transparent', lineWidth: 0 },
    collisionFilter: { category: 0x0002, mask: 0x0001 },
  })
  ;(cursorBody as any)._isCursor = true
  Matter.Composite.add(engine.world, cursorBody)
  bodyMap.set(cursorBody.id, cursorBody)

  // Track mouse position for cursor body
  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    Matter.Body.setPosition(cursorBody, { x: cx, y: cy })
    Matter.Body.setVelocity(cursorBody, { x: e.movementX * 0.8, y: e.movementY * 0.8 })
  }
  window.addEventListener('mousemove', onMouseMove)
  ;(canvas as any)._cleanupMouseMove = () => window.removeEventListener('mousemove', onMouseMove)

  // Click detection on canvas — explode body under cursor
  function onCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    const hit = Matter.Query.point(
      Matter.Composite.allBodies(engine.world).filter(b => !(b as any)._isCursor && !b.isStatic),
      { x: cx, y: cy }
    )
    if (hit.length > 0) {
      const body = hit[0]
      const color = (body as any)._color ?? '#FFD600'
      spawnExplosion(cx, cy, color)
      Matter.Composite.remove(engine.world, body)
      bodyMap.delete(body.id)
      destroyedCount++
      if (destroyedCount === 10) triggerAchievement()
      // Respawn a new body after 1s to keep the world populated
      setTimeout(() => {
        const nb = createShape(
          60 + Math.random() * (window.innerWidth - 120),
          -60
        )
        bodyMap.set(nb.id, nb)
        Matter.Composite.add(engine.world, nb)
      }, 800)
    }
  }
  canvas.addEventListener('click', onCanvasClick)
  ;(canvas as any)._cleanupClick = () => canvas.removeEventListener('click', onCanvasClick)

  // Periodic re-spawn (keep density)
  const spawnInterval = setInterval(() => {
    const bodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic && !(b as any)._isCursor)
    if (bodies.length < 10) {
      const nb = createShape(
        80 + Math.random() * (window.innerWidth - 160),
        -60
      )
      bodyMap.set(nb.id, nb)
      Matter.Composite.add(engine.world, nb)
    }
  }, 3000)
  ;(canvas as any)._spawnInterval = spawnInterval

  Matter.Render.run(render)
  Matter.Runner.run(runner, engine)
}

// ── Resize ──
function handleResize() {
  if (!render || !engine) return
  const w = window.innerWidth
  const h = window.innerHeight
  render.canvas.width = w
  render.canvas.height = h
  render.options.width = w
  render.options.height = h
}

// ── Cleanup ──
function teardown() {
  const canvas = canvasRef.value
  if (canvas) {
    if ((canvas as any)._cleanupMouseMove) (canvas as any)._cleanupMouseMove()
    if ((canvas as any)._cleanupClick) (canvas as any)._cleanupClick()
    if ((canvas as any)._spawnInterval) clearInterval((canvas as any)._spawnInterval)
  }
  if (render) { Matter.Render.stop(render); render.canvas.remove() }
  if (runner) Matter.Runner.stop(runner)
  if (engine) Matter.Engine.clear(engine)
  if (resizeObs) resizeObs.disconnect()
  cancelAnimationFrame(animFrameId)
  bodyMap.clear()
  destroyedCount = 0
}

onMounted(() => {
  setup()
  resizeObs = new ResizeObserver(handleResize)
  resizeObs.observe(document.body)
})

onUnmounted(teardown)
</script>

<style scoped>
.memphis-bg-wrap {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.memphis-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none; /* pass-through by default */
}

/* Re-enable pointer events only when hovering blank canvas area (not over UI elements) */
.memphis-bg-wrap.interactive .memphis-canvas {
  pointer-events: auto;
}

.particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Particle animation */
:global(.particle) {
  position: absolute;
  border: 2px solid #1A1A1A;
  transform-origin: center;
  animation: particle-burst 0.5s ease-out forwards;
}

@keyframes particle-burst {
  0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0) rotate(180deg); opacity: 0; }
}

/* Achievement badge */
.achievement-badge {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 999;
  pointer-events: auto;
  cursor: pointer;
}

.badge-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: #FAF8F5;
  border: 3px solid #1A1A1A;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  font-family: 'JetBrains Mono', monospace;
  max-width: 300px;
}

.badge-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.badge-title {
  font-weight: 700;
  font-size: 12px;
  color: #1A1A1A;
  line-height: 1.3;
}

.badge-sub {
  font-size: 10px;
  color: #1A1A1A80;
  margin-top: 2px;
}

/* Badge pop transition */
.badge-pop-enter-active {
  animation: badge-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-pop-leave-active {
  animation: badge-in 0.2s ease-in reverse;
}
@keyframes badge-in {
  from { opacity: 0; transform: translateY(20px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
