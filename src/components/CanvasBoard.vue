<template>
  <!--
    CanvasBoard.vue — Apple 级画笔引擎 (v8.2)
    - 4 种独立工具：铅笔(Pencil) / 马克笔(Marker) / 荧光笔(Highlighter) / 橡皮擦(Eraser)
    - 粗细 & 透明度滑块，Memphis 风格 UI
    - 纯净画板背景，无黑色混色
    - 触控优化：单指绘画 + passive wheel
  -->
  <canvas
    ref="canvasRef"
    class="board-canvas"
    :class="{ 'board-canvas--active': isActive }"
    style="touch-action: none;"
    @pointerdown="onPointerDown"
    @pointermove.passive="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { BrushTool } from '@/types/brush'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  isActive: boolean
  tool: BrushTool
  strokeWidth: number
  strokeOpacity: number
}>(), {
  isActive: false,
  tool: 'pencil',
  strokeWidth: 4,
  strokeOpacity: 1,
})

// ── Emits ─────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  (e: 'stroke'): void
}>()

// ── Refs ──────────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing  = ref(false)
let lastX = 0; let lastY = 0
let strokesTotal = 0
let noiseSeed = 0

// ── Canvas 上下文 ─────────────────────────────────────────────────────────────
function getCtx() { return canvasRef.value?.getContext('2d') ?? null }
function getCanvas() { return canvasRef.value }

// ── 相对坐标 ──────────────────────────────────────────────────────────────────
function relPos(e: PointerEvent): { x: number; y: number; pressure: number } {
  const c = getCanvas(); if (!c) return { x: 0, y: 0, pressure: 0 }
  const r = c.getBoundingClientRect()
  return {
    x: (e.clientX - r.left) * (c.width / r.width),
    y: (e.clientY - r.top) * (c.height / r.height),
    pressure: e.pressure > 0 ? e.pressure : 0.5,
  }
}

// ── 画笔实现 ──────────────────────────────────────────────────────────────────

/** 铅笔：细线 + 边缘噪点 */
function drawPencil(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = Math.max(0.5, props.strokeWidth * 0.6)
  const op = props.strokeOpacity
  ctx.globalAlpha = op * (0.7 + Math.random() * 0.3)
  ctx.strokeStyle = '#1A1A1A'
  ctx.lineWidth = w + (Math.random() - 0.5) * 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'source-over'

  // 主笔迹
  ctx.lineTo(x, y)
  ctx.stroke()

  // 噪点飞溅
  for (let i = 0; i < 3; i++) {
    const rx = x + (Math.random() - 0.5) * w * 3
    const ry = y + (Math.random() - 0.5) * w * 3
    ctx.fillStyle = '#1A1A1A'
    ctx.globalAlpha = op * Math.random() * 0.25
    ctx.fillRect(rx, ry, Math.random() * 2, Math.random() * 2)
  }

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.globalAlpha = 1
}

/** 马克笔：纯色覆盖，半透明叠加 */
function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = props.strokeWidth
  const op = props.strokeOpacity * 0.65
  ctx.globalAlpha = op
  ctx.strokeStyle = '#1A1A1A'
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'source-over'

  ctx.lineTo(x, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.globalAlpha = 1
}

/** 荧光笔：宽笔触 + multiply 混合 */
function drawHighlighter(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = props.strokeWidth * 2.5
  const op = props.strokeOpacity * 0.35
  ctx.globalAlpha = op
  ctx.strokeStyle = '#FFD600'
  ctx.lineWidth = w
  ctx.lineCap = 'square'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'multiply'

  ctx.lineTo(x, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/** 橡皮擦：destination-out 擦除 */
function drawEraser(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = props.strokeWidth * 2
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 1

  ctx.lineTo(x, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.globalCompositeOperation = 'source-over'
}

// ── 绘制分发 ──────────────────────────────────────────────────────────────────
const brushDraw = {
  pencil:      drawPencil,
  marker:      drawMarker,
  highlighter: drawHighlighter,
  eraser:      drawEraser,
} as const

function drawStroke(ctx: CanvasRenderingContext2D, x: number, y: number) {
  try { brushDraw[props.tool](ctx, x, y) } catch { /* ignore */ }
}

// ── 指针事件 ──────────────────────────────────────────────────────────────────
function onPointerDown(e: PointerEvent) {
  if (!props.isActive) return
  isDrawing.value = true
  noiseSeed = Math.random() * 100
  strokesTotal++
  emit('stroke')

  const ctx = getCtx(); if (!ctx) return
  const { x, y } = relPos(e)
  lastX = x; lastY = y
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function onPointerMove(e: PointerEvent) {
  if (!isDrawing.value || !props.isActive) return
  e.preventDefault()
  const ctx = getCtx(); if (!ctx) return
  const { x, y } = relPos(e)
  drawStroke(ctx, x, y)
  lastX = x; lastY = y
}

function onPointerUp(e: PointerEvent) {
  if (!isDrawing.value) return
  e.preventDefault()
  isDrawing.value = false
  const ctx = getCtx(); ctx?.beginPath()
}

// ── 公开方法 ──────────────────────────────────────────────────────────────────
function clearBoard() {
  const c = getCanvas(); if (!c) return
  const ctx = c.getContext('2d'); if (!ctx) return
  ctx.clearRect(0, 0, c.width, c.height)
  drawDotGrid(ctx, c.width, c.height)
  strokesTotal = 0
}

function getImageData(): string {
  return getCanvas()?.toDataURL('image/jpeg', 0.85) ?? ''
}

function getStrokeCount(): number {
  return strokesTotal
}

// ── 背景网格（Memphis 点阵装饰）────────────────────────────────────────────────
function drawDotGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  // 纯净白色背景
  ctx.fillStyle = '#FAF8F5'
  ctx.fillRect(0, 0, w, h)

  // 淡色网格点
  ctx.fillStyle = '#1A1A1A14'
  const gap = 32
  for (let x = gap; x < w; x += gap) {
    for (let y = gap; y < h; y += gap) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── Canvas 尺寸自适应 ─────────────────────────────────────────────────────────
function resizeCanvas() {
  const c = getCanvas(); if (!c) return
  const imgData = c.toDataURL()
  c.width = window.innerWidth
  c.height = window.innerHeight
  const ctx = c.getContext('2d'); if (!ctx) return
  drawDotGrid(ctx, c.width, c.height)
  if (strokesTotal > 0) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = imgData
  }
}

// ── 监听工具变化（更新光标）─────────────────────────────────────────────────────
watch(() => props.tool, () => {
  const c = getCanvas(); if (!c) return
  c.style.cursor = props.tool === 'eraser' ? 'cell' : 'crosshair'
})

// ── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

defineExpose({ clearBoard, getImageData, getStrokeCount })
</script>

<style scoped>
.board-canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: #FAF8F5;
  cursor: crosshair;
}

.board-canvas--active {
  cursor: crosshair;
}
</style>
