<template>
  <!--
    CanvasBoard.vue — Apple Pencil + 数位板增强版 (v8.5)
    - strokeColor prop：支持任意颜色
    - Apple Pencil / Stylus 支持：pressure 感知笔触粗细+透明度、tilt 倾斜
    - 鼠标/触控/数位板均走 PointerEvent 统一路径
    - 悬停时显示笔触预览圆圈（仅非 touch 指针）
    - Apple Pencil 悬停光标使用苹果逻辑（细十字准线，实时压力环）
  -->
  <canvas
    ref="canvasRef"
    class="board-canvas"
    :class="{ 'board-canvas--active': isActive, 'board-canvas--pencil': isPencilDevice }"
    style="touch-action: none;"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerLeave"
    @pointercancel="onPointerUp"
    @pointerenter="onPointerEnter"
  />

  <!-- 光标预览圆（非 touch 时显示；绘制中改为小实心点，悬停时为空心圆）-->
  <div
    v-if="isActive && showCursor"
    class="pencil-cursor"
    :class="{
      'pencil-cursor--pencil': isPencilDevice,
      'pencil-cursor--drawing': isDrawing
    }"
    :style="cursorStyle"
    aria-hidden="true"
  ></div>
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
  strokeColor?: string
}>(), {
  isActive: false,
  tool: 'pencil',
  strokeWidth: 4,
  strokeOpacity: 1,
  strokeColor: '#1A1A1A',
})

// ── Emits ─────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  (e: 'stroke'): void
}>()

// ── Refs ──────────────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const showCursor = ref(false)
const isPencilDevice = ref(false)       // apple pencil / stylus
const cursorX = ref(0)
const cursorY = ref(0)
const cursorPressure = ref(0.5)         // 实时压力（用于预览环大小）

let lastX = 0; let lastY = 0
let strokesTotal = 0
let lastPressure = 0.5
let lastTiltX = 0; let lastTiltY = 0

// ── 悬停光标样式（用 transform 代替 top/left，零延迟跟随）──────────────────
const cursorStyle = computed(() => {
  const size = Math.max(8, props.strokeWidth * (isPencilDevice.value ? cursorPressure.value * 2 + 0.5 : 1))
  return {
    // transform 走 GPU compositor，不触发 layout/paint，实现真正零延迟
    transform: `translate(${cursorX.value}px, ${cursorY.value}px) translate(-50%, -50%)`,
    width: `${size}px`,
    height: `${size}px`,
    borderColor: props.tool === 'eraser' ? '#FF6B6B' : (props.strokeColor || '#1A1A1A'),
    opacity: Math.max(0.7, props.strokeOpacity),
  }
})

// ── Canvas 上下文 ─────────────────────────────────────────────────────────────
function getCtx() { return canvasRef.value?.getContext('2d') ?? null }
function getCanvas() { return canvasRef.value }

// ── 相对坐标 ──────────────────────────────────────────────────────────────────
function relPos(e: PointerEvent): { x: number; y: number; pressure: number; tiltX: number; tiltY: number } {
  const c = getCanvas(); if (!c) return { x: 0, y: 0, pressure: 0.5, tiltX: 0, tiltY: 0 }
  const r = c.getBoundingClientRect()
  // Apple Pencil 压力范围 0~1，鼠标/touch 为 0.5
  const rawPressure = e.pressure
  const pressure = rawPressure > 0 ? rawPressure : 0.5
  return {
    x: (e.clientX - r.left) * (c.width / r.width),
    y: (e.clientY - r.top) * (c.height / r.height),
    pressure,
    tiltX: (e as any).tiltX ?? 0,
    tiltY: (e as any).tiltY ?? 0,
  }
}

// ── 实际绘制颜色（橡皮擦无色，其余（含荧光笔）均用 strokeColor）──────────────
function getDrawColor(tool: BrushTool): string {
  if (tool === 'eraser') return 'transparent'
  return props.strokeColor || '#1A1A1A'
}

// ── 铅笔：细线 + 压力感知 + 边缘噪点 ────────────────────────────────────────
function drawPencil(ctx: CanvasRenderingContext2D, x: number, y: number, pressure: number, tiltX: number, tiltY: number) {
  // pressure 感知：笔触粗细随压力变化
  const w = Math.max(0.3, props.strokeWidth * 0.6 * (0.4 + pressure * 0.9))
  // tilt 感知：倾斜时笔触略宽（模拟铅笔侧锋）
  const tiltFactor = 1 + Math.min(Math.abs(tiltX) + Math.abs(tiltY), 60) / 120
  const finalW = w * tiltFactor
  const op = props.strokeOpacity * (0.65 + pressure * 0.35)
  const color = getDrawColor(props.tool)

  ctx.globalAlpha = op * (0.7 + Math.random() * 0.3)
  ctx.strokeStyle = color
  ctx.lineWidth = finalW + (Math.random() - 0.5) * 1.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'source-over'

  ctx.lineTo(x, y)
  ctx.stroke()

  // 噪点飞溅（轻压时减少，重压时增多）
  const dots = Math.floor(pressure * 4)
  for (let i = 0; i < dots; i++) {
    const rx = x + (Math.random() - 0.5) * finalW * 3
    const ry = y + (Math.random() - 0.5) * finalW * 3
    ctx.fillStyle = color
    ctx.globalAlpha = op * Math.random() * 0.2
    ctx.fillRect(rx, ry, Math.random() * 1.5, Math.random() * 1.5)
  }

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.globalAlpha = 1
}

// ── 马克笔：压力感知线宽 ───────────────────────────────────────────────────────
function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, pressure: number) {
  const w = props.strokeWidth * (0.5 + pressure * 0.7)
  const op = props.strokeOpacity * 0.72
  ctx.globalAlpha = op
  ctx.strokeStyle = getDrawColor(props.tool)
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

// ── 荧光笔：宽笔触 + multiply + 压力感知 ─────────────────────────────────────
function drawHighlighter(ctx: CanvasRenderingContext2D, x: number, y: number, pressure: number) {
  const w = props.strokeWidth * 2.5 * (0.6 + pressure * 0.5)
  const op = props.strokeOpacity * 0.38
  ctx.globalAlpha = op
  ctx.strokeStyle = getDrawColor(props.tool)
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

// ── 橡皮擦：destination-out ───────────────────────────────────────────────────
function drawEraser(ctx: CanvasRenderingContext2D, x: number, y: number, pressure: number) {
  const w = props.strokeWidth * 2 * (0.6 + pressure * 0.6)
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
function drawStroke(ctx: CanvasRenderingContext2D, x: number, y: number, pressure: number, tiltX: number, tiltY: number) {
  try {
    switch (props.tool) {
      case 'pencil':      drawPencil(ctx, x, y, pressure, tiltX, tiltY); break
      case 'marker':      drawMarker(ctx, x, y, pressure); break
      case 'highlighter': drawHighlighter(ctx, x, y, pressure); break
      case 'eraser':      drawEraser(ctx, x, y, pressure); break
    }
  } catch { /* ignore */ }
}

// ── 检测指针设备类型 ───────────────────────────────────────────────────────────
function detectDevice(e: PointerEvent) {
  // pen = Apple Pencil / 数位板笔
  isPencilDevice.value = e.pointerType === 'pen'
}

// ── 指针事件 ──────────────────────────────────────────────────────────────────
function onPointerDown(e: PointerEvent) {
  if (!props.isActive) return
  e.preventDefault()
  detectDevice(e)
  isDrawing.value = true
  strokesTotal++
  emit('stroke')

  const ctx = getCtx(); if (!ctx) return
  const { x, y, pressure, tiltX, tiltY } = relPos(e)
  lastX = x; lastY = y; lastPressure = pressure
  lastTiltX = tiltX; lastTiltY = tiltY
  ctx.beginPath()
  ctx.moveTo(x, y)

  // 单点 dot（按下不移动时也画一个点）
  drawStroke(ctx, x, y, pressure, tiltX, tiltY)
}

function onPointerMove(e: PointerEvent) {
  if (!props.isActive) return
  // 更新光标预览位置（不论是否在画）
  cursorX.value = e.clientX
  cursorY.value = e.clientY
  cursorPressure.value = e.pressure > 0 ? e.pressure : 0.5

  if (!isDrawing.value) return
  e.preventDefault()
  const ctx = getCtx(); if (!ctx) return
  const { x, y, pressure, tiltX, tiltY } = relPos(e)
  drawStroke(ctx, x, y, pressure, tiltX, tiltY)
  lastX = x; lastY = y; lastPressure = pressure
  lastTiltX = tiltX; lastTiltY = tiltY
}

function onPointerUp(e: PointerEvent) {
  if (!isDrawing.value) return
  e.preventDefault()
  isDrawing.value = false
  const ctx = getCtx(); ctx?.beginPath()
}

function onPointerLeave(e: PointerEvent) {
  showCursor.value = false
  if (!isDrawing.value) return
  onPointerUp(e)
}

function onPointerEnter(e: PointerEvent) {
  if (e.pointerType !== 'touch') showCursor.value = true
  detectDevice(e)
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

// ── 背景网格（缓存 Path2D，避免每次重绘大量 arc 调用）────────────────────────
let _dotGridPath: Path2D | null = null
let _dotGridW = 0
let _dotGridH = 0

function drawDotGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#FAF8F5'
  ctx.fillRect(0, 0, w, h)
  // 如果尺寸变化，重新构建 Path2D
  if (!_dotGridPath || _dotGridW !== w || _dotGridH !== h) {
    _dotGridPath = new Path2D()
    const gap = 32
    for (let x = gap; x < w; x += gap) {
      for (let y = gap; y < h; y += gap) {
        _dotGridPath.moveTo(x + 1.5, y)
        _dotGridPath.arc(x, y, 1.5, 0, Math.PI * 2)
      }
    }
    _dotGridW = w
    _dotGridH = h
  }
  ctx.fillStyle = '#1A1A1A14'
  ctx.fill(_dotGridPath)
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

// ── 监听工具变化 ───────────────────────────────────────────────────────────────
watch(() => props.tool, () => {
  const c = getCanvas(); if (!c) return
  c.style.cursor = 'none' // 统一用自定义光标
})

// ── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  // 初始化光标为 none（用自定义 div 代替）
  if (canvasRef.value) canvasRef.value.style.cursor = 'none'
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
  cursor: none;
}

.board-canvas--active {
  cursor: none;
}

/* Apple Pencil 模式：画布光标完全隐藏 */
.board-canvas--pencil {
  cursor: none !important;
}

/* ── 悬停预览圆 ── */
.pencil-cursor {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
  border: 2px solid currentColor;
  border-radius: 50%;
  /* 去除 top/left transition — 改用 transform 定位后无需任何 transition */
  /* 只保留 size 的极小 transition 让笔触粗细变化更平滑 */
  transition: width 0.06s ease, height 0.06s ease;
  /* will-change: transform → 提示浏览器提升为合成层，彻底消除可视差 */
  will-change: transform;
  mix-blend-mode: normal;
  background: transparent;
  /* 外白圈：提升在深色/浅色背景的可读性 */
  box-shadow: 0 0 0 1.5px rgba(255,255,255,0.75), 0 0 0 3px rgba(0,0,0,0.18);
}

/* Apple Pencil 模式：十字准线 */
.pencil-cursor--pencil {
  border-radius: 50%;
  border-width: 1.5px;
}

.pencil-cursor--pencil::before,
.pencil-cursor--pencil::after {
  content: '';
  position: absolute;
  background: currentColor;
  opacity: 0.4;
}

/* 水平准线 */
.pencil-cursor--pencil::before {
  width: 200%;
  height: 1px;
  top: 50%;
  left: -50%;
  transform: translateY(-50%);
}

/* 垂直准线 */
.pencil-cursor--pencil::after {
  height: 200%;
  width: 1px;
  left: 50%;
  top: -50%;
  transform: translateX(-50%);
}

/* 绘制中：实心小点，跟随笔迹提示落点 */
.pencil-cursor--drawing {
  background: currentColor;
  opacity: 0.55 !important;
  box-shadow: 0 0 0 1.5px rgba(255,255,255,0.6);
  width: 6px !important;
  height: 6px !important;
}
</style>
