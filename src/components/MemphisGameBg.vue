<template>
  <!--
    MemphisGameBg.vue — 俄罗斯方块背景层 (v2.0)
    - 默认"自动演示"模式，不干扰访客滚动
    - 点击 PLAY 或按任意方向键/空格后进入"玩家接管"模式
    - 键盘：← → ↓ 移动 | ↑/Z 旋转 | 空格 硬降
    - 完整游戏逻辑：持续下落、碰撞检测、触底固定、满行消除
    - 计分 / 关卡 / Game Over / Restart
  -->
  <div class="tetris-bg-wrap" :class="{ 'player-mode': isPlayerMode }" aria-hidden="true">

    <canvas ref="canvasRef" class="tetris-canvas" />

    <!-- ═══ 计分板 ═══ -->
    <div class="scoreboard" :class="{ 'scoreboard--active': isPlayerMode }">
      <div class="score-inner">
        <!-- 顶部色带 -->
        <div class="score-stripe" :style="{ background: currentColor }"></div>

        <div class="score-body">
          <div class="score-row">
            <span class="score-label">SCORE</span>
            <span class="score-val" :style="{ color: currentColor }">{{ score.toLocaleString() }}</span>
          </div>
          <div class="score-divider"></div>
          <div class="score-row">
            <span class="score-label">LEVEL</span>
            <span class="score-val" :style="{ color: currentColor }">{{ level }}</span>
          </div>
          <div class="score-divider"></div>
          <div class="score-row">
            <span class="score-label">LINES</span>
            <span class="score-val">{{ lines }}</span>
          </div>
        </div>

        <!-- 下一块预览 -->
        <div class="score-divider"></div>
        <div class="score-next-label">NEXT</div>
        <canvas ref="previewRef" class="preview-canvas" width="64" height="64" />
      </div>
    </div>

    <!-- ═══ 模式切换按钮 ═══ -->
    <button
      v-if="!isGameOver"
      class="mode-btn"
      :class="{ 'mode-btn--active': isPlayerMode }"
      @click="togglePlayerMode"
    >
      <span v-if="!isPlayerMode">▶ PLAY</span>
      <span v-else>⏸ AUTO</span>
    </button>

    <!-- ═══ Game Over 面板 ═══ -->
    <Transition name="gameover-pop">
      <div v-if="isGameOver" class="gameover-overlay">
        <div class="gameover-card">
          <div class="gameover-stripe"></div>
          <div class="gameover-body">
            <div class="gameover-badge">GAME OVER</div>
            <div class="gameover-score">
              <span class="gameover-score-label">FINAL SCORE</span>
              <span class="gameover-score-val">{{ score.toLocaleString() }}</span>
            </div>
            <div class="gameover-score" style="margin-top: 6px">
              <span class="gameover-score-label">LEVEL</span>
              <span class="gameover-score-val" style="font-size: 24px">{{ level }}</span>
            </div>
            <button class="restart-btn" @click="restartGame">
              ↺ RESTART
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

// ── Memphis 配色 ──────────────────────────────────────────────────────────────
const COLORS = ['#FFD600', '#FF6B6B', '#2979FF', '#00E5A0', '#A78BFA', '#FF9800', '#FF4081']
const INK = '#1A1A1A'
const BG  = '#FAF8F5'

// ── 游戏常量 ──────────────────────────────────────────────────────────────────
const COLS = 10
const ROWS = 20
const BASE_MS = 800      // Level 1 下落间隔 (ms)
const MIN_MS  = 80       // 最快速度
const MAX_LEVEL = 91     // 最高关卡数
const SCORE_PER_LEVEL = 233  // 每 233 分升 1 级

// ── Tetromino 定义 (SRS 旋转) ──────────────────────────────────────────────────
// 每个 piece 包含 4 个旋转状态，每个状态是 4 个 [col, row] 格子偏移
const PIECES: Record<string, number[][][]> = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
}
const PIECE_KEYS = Object.keys(PIECES)

// ── 响应式状态 ────────────────────────────────────────────────────────────────
const canvasRef  = ref<HTMLCanvasElement | null>(null)
const previewRef = ref<HTMLCanvasElement | null>(null)
const isPlayerMode = ref(false)
const isGameOver   = ref(false)
const score = ref(0)
const level = ref(1)
const lines = ref(0)

// 当前 piece 颜色（驱动计分板高亮）
const currentColor = ref(COLORS[0])

// ── 游戏内部状态 ──────────────────────────────────────────────────────────────
// 格子颜色板：null = 空，string = 已固定颜色
let board: (string | null)[][] = []

interface Piece {
  key: string
  rot: number
  x: number
  y: number
  color: string
}

let current: Piece | null = null
let next: Piece | null = null
let tickTimer: ReturnType<typeof setTimeout> | null = null
let isRunning = false

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function randPiece(): Piece {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return { key, rot: 0, x: 3, y: 0, color }
}

function cells(p: Piece): [number, number][] {
  return PIECES[p.key][p.rot].map(([dc, dr]) => [p.x + dc, p.y + dr]) as [number, number][]
}

function isValid(p: Piece, board: (string | null)[][]): boolean {
  for (const [c, r] of cells(p)) {
    if (c < 0 || c >= COLS || r >= ROWS) return false
    if (r >= 0 && board[r][c] !== null) return false
  }
  return true
}

function lockPiece(p: Piece, b: (string | null)[][]) {
  for (const [c, r] of cells(p)) {
    if (r >= 0) b[r][c] = p.color
  }
}

function clearLines(b: (string | null)[][]): number {
  const cleared = b.filter(row => row.some(cell => cell === null))
  const count = ROWS - cleared.length
  const empty = Array.from({ length: count }, () => Array<string | null>(COLS).fill(null))
  b.splice(0, ROWS, ...empty, ...cleared)
  return count
}

function tickInterval(): number {
  // Level 1 = 800ms，每级减少约 8ms，Level 91 = ~80ms（MIN_MS 兜底）
  return Math.max(MIN_MS, BASE_MS - (level.value - 1) * 8)
}

// ── 主游戏循环 ────────────────────────────────────────────────────────────────
function tick() {
  if (!current || !isRunning) return

  const moved: Piece = { ...current, y: current.y + 1 }
  if (isValid(moved, board)) {
    current = moved
  } else {
    // 触底固定
    lockPiece(current, board)
    const cleared = clearLines(board)
    if (cleared > 0) {
      lines.value += cleared
      // 积分：1行40 / 2行100 / 3行300 / 4行1200（经典分制 × level）
      const pts = [0, 40, 100, 300, 1200][Math.min(cleared, 4)]
      score.value += pts * level.value
      lines.value += cleared
      // 每 233 分升 1 级，上限 91 关
      const newLevel = Math.min(MAX_LEVEL, Math.floor(score.value / SCORE_PER_LEVEL) + 1)
      if (newLevel > level.value) level.value = newLevel
    }
    // 生成下一块
    current = next ?? randPiece()
    next = randPiece()
    currentColor.value = current.color

    // Game Over 检测：新块生成即越界
    if (!isValid(current, board)) {
      gameOver()
      return
    }
  }

  draw()
  scheduleTick()
}

function scheduleTick() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(tick, tickInterval())
}

function stopTick() {
  if (tickTimer) { clearTimeout(tickTimer); tickTimer = null }
  isRunning = false
}

function startTick() {
  isRunning = true
  scheduleTick()
}

// ── Auto-demo：AI 下落，不理会玩家 ──────────────────────────────────────────
// Demo 模式就是正常 tick，只是键盘不响应
function setPlayerMode(on: boolean) {
  isPlayerMode.value = on
  // 切换时不打断当前 tick，让游戏无缝继续
}

function togglePlayerMode() {
  setPlayerMode(!isPlayerMode.value)
}

// ── Game Over / Restart ───────────────────────────────────────────────────────
function gameOver() {
  stopTick()
  isGameOver.value = true
}

function restartGame() {
  isGameOver.value = false
  score.value = 0
  level.value = 1
  lines.value = 0
  board = newBoard()
  current = randPiece()
  next = randPiece()
  currentColor.value = current.color
  startTick()
  setPlayerMode(true)
  draw()
}

// ── 绘制 ──────────────────────────────────────────────────────────────────────
function cellSize(): number {
  const canvas = canvasRef.value
  if (!canvas) return 20
  const maxH = canvas.height / ROWS
  const maxW = canvas.width / (COLS + 8) // 留右侧空间
  return Math.floor(Math.min(maxH, maxW, 28))
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cs = cellSize()
  const gridW = cs * COLS
  const gridH = cs * ROWS
  // 网格居中偏左（右侧留给计分板）
  const offsetX = Math.max(20, (canvas.width - gridW) / 2 - 60)
  const offsetY = Math.max(20, (canvas.height - gridH) / 2)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 网格背景（淡描边）
  ctx.strokeStyle = INK + '18'
  ctx.lineWidth = 0.5
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath()
    ctx.moveTo(offsetX, offsetY + r * cs)
    ctx.lineTo(offsetX + gridW, offsetY + r * cs)
    ctx.stroke()
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath()
    ctx.moveTo(offsetX + c * cs, offsetY)
    ctx.lineTo(offsetX + c * cs, offsetY + gridH)
    ctx.stroke()
  }

  // 外边框（Memphis 3px）
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.strokeRect(offsetX - 1.5, offsetY - 1.5, gridW + 3, gridH + 3)

  // 已固定的格子
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c]
      if (cell) {
        drawCell(ctx, offsetX + c * cs, offsetY + r * cs, cs, cell)
      }
    }
  }

  // 当前下落块（含 ghost）
  if (current) {
    // Ghost（预测触底位置）
    let ghost: Piece = { ...current }
    while (isValid({ ...ghost, y: ghost.y + 1 }, board)) ghost = { ...ghost, y: ghost.y + 1 }
    for (const [c, r] of cells(ghost)) {
      if (r >= 0) drawCell(ctx, offsetX + c * cs, offsetY + r * cs, cs, current.color, true)
    }
    // 实际块
    for (const [c, r] of cells(current)) {
      if (r >= 0) drawCell(ctx, offsetX + c * cs, offsetY + r * cs, cs, current.color)
    }
  }

  // Game Over 遮罩（轻微）
  if (isGameOver.value) {
    ctx.fillStyle = BG + 'CC'
    ctx.fillRect(offsetX, offsetY, gridW, gridH)
  }

  drawPreview()
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, cs: number,
  color: string,
  ghost = false
) {
  if (ghost) {
    ctx.fillStyle = color + '28'
    ctx.strokeStyle = color + '60'
    ctx.lineWidth = 1.5
  } else {
    ctx.fillStyle = color
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
  }
  const pad = ghost ? 1 : 2
  ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2)
  if (!ghost) {
    ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3)
    // 高光
    ctx.fillStyle = '#ffffff30'
    ctx.fillRect(x + pad + 1, y + pad + 1, 4, 4)
  }
}

function drawPreview() {
  const canvas = previewRef.value
  if (!canvas || !next) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, 64, 64)

  const cs = 12
  const cells_ = PIECES[next.key][0]
  const minC = Math.min(...cells_.map(([c]) => c))
  const minR = Math.min(...cells_.map(([, r]) => r))
  const maxC = Math.max(...cells_.map(([c]) => c))
  const maxR = Math.max(...cells_.map(([, r]) => r))
  const pw = (maxC - minC + 1) * cs
  const ph = (maxR - minR + 1) * cs
  const ox = (64 - pw) / 2 - minC * cs
  const oy = (64 - ph) / 2 - minR * cs

  for (const [dc, dr] of cells_) {
    drawCell(ctx, ox + dc * cs, oy + dr * cs, cs, next.color)
  }
}

// ── 键盘控制 ──────────────────────────────────────────────────────────────────
function handleKey(e: KeyboardEvent) {
  // 任何方向键 / 空格 / Enter 首次触发时进入玩家模式
  const gameCodes = ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','KeyZ','Space','Enter']
  if (gameCodes.includes(e.code)) {
    if (!isPlayerMode.value) setPlayerMode(true)
    if (isGameOver.value) return
  } else return

  e.preventDefault()

  if (!current) return
  let p = { ...current }

  switch (e.code) {
    case 'ArrowLeft':
      p = { ...current, x: current.x - 1 }
      if (isValid(p, board)) current = p
      break
    case 'ArrowRight':
      p = { ...current, x: current.x + 1 }
      if (isValid(p, board)) current = p
      break
    case 'ArrowDown':
      p = { ...current, y: current.y + 1 }
      if (isValid(p, board)) {
        current = p
        score.value += 1
        // 软降时重置 tick 计时
        if (tickTimer) clearTimeout(tickTimer)
        tickTimer = setTimeout(tick, tickInterval())
      }
      break
    case 'ArrowUp':
    case 'KeyZ':
      // 旋转（带 wall-kick 简版）
      const newRot = ((current.rot + 1) % 4) as 0|1|2|3
      const kicks = [0, -1, 1, -2, 2]
      for (const kick of kicks) {
        const rp = { ...current, rot: newRot, x: current.x + kick }
        if (isValid(rp, board)) { current = rp; break }
      }
      break
    case 'Space':
    case 'Enter':
      // 硬降（Space 或 Enter 均可）
      let hp = { ...current }
      while (isValid({ ...hp, y: hp.y + 1 }, board)) {
        hp = { ...hp, y: hp.y + 1 }
        score.value += 2
      }
      current = hp
      // 立即触底
      if (tickTimer) clearTimeout(tickTimer)
      tick()
      return
  }
  draw()
}

// ── 画布尺寸自适应 ────────────────────────────────────────────────────────────
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  draw()
}

// ── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  board   = newBoard()
  current = randPiece()
  next    = randPiece()
  currentColor.value = current.color

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKey)

  startTick()
  draw()
})

onUnmounted(() => {
  stopTick()
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKey)
})
</script>

<style scoped>
.tetris-bg-wrap {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.tetris-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ═══ 计分板 ═══ */
.scoreboard {
  position: fixed;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.55;
  transition: opacity 0.25s;
  z-index: 2;
}
.scoreboard--active {
  opacity: 1;
}

.score-inner {
  border: 3px solid #1A1A1A;
  background: #FAF8F5;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  width: 80px;
  overflow: hidden;
}

.score-stripe {
  height: 6px;
  width: 100%;
  transition: background 0.3s;
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

.score-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: #1A1A1A80;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.score-val {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1A1A1A;
  line-height: 1;
  transition: color 0.3s;
}

.score-divider {
  height: 2px;
  background: #1A1A1A;
  margin: 6px 0;
}

.score-next-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: #1A1A1A80;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0 8px 4px;
}

.preview-canvas {
  display: block;
  width: 64px;
  height: 64px;
  border-top: 2px solid #1A1A1A20;
}

/* ═══ 模式切换按钮 ═══ */
.mode-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 10;
  pointer-events: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 7px 12px;
  border: 3px solid #1A1A1A;
  background: #FAF8F5;
  color: #1A1A1A;
  cursor: pointer;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transition: transform 0.1s, box-shadow 0.1s, background 0.2s;
  opacity: 0.7;
}
.mode-btn:hover,
.mode-btn--active {
  opacity: 1;
  background: #FFD600;
}
.mode-btn:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #1A1A1A;
}

/* ═══ Game Over 面板 ═══ */
.gameover-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  background: #1A1A1A40;
}

.gameover-card {
  border: 3px solid #1A1A1A;
  background: #FAF8F5;
  box-shadow: 8px 8px 0 0 #1A1A1A;
  overflow: hidden;
  min-width: 220px;
}

.gameover-stripe {
  height: 10px;
  background: repeating-linear-gradient(
    45deg,
    #FFD600 0px, #FFD600 8px,
    #1A1A1A 8px, #1A1A1A 16px
  );
}

.gameover-body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.gameover-badge {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: #FF6B6B;
  letter-spacing: 0.05em;
  border: 3px solid #1A1A1A;
  padding: 4px 14px;
  background: #1A1A1A;
  color: #FFD600;
}

.gameover-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.gameover-score-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #1A1A1A80;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.gameover-score-val {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 36px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 1;
}

.restart-btn {
  margin-top: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 8px 20px;
  border: 3px solid #1A1A1A;
  background: #1A1A1A;
  color: #FFD600;
  cursor: pointer;
  box-shadow: 5px 5px 0 0 #FFD600;
  transition: transform 0.1s, box-shadow 0.1s;
}
.restart-btn:hover {
  background: #FFD600;
  color: #1A1A1A;
  box-shadow: 5px 5px 0 0 #1A1A1A;
}
.restart-btn:active {
  transform: translate(5px, 5px);
  box-shadow: 0 0 0 0 #FFD600;
}

/* ═══ Game Over 弹出动画 ═══ */
.gameover-pop-enter-active {
  animation: go-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gameover-pop-leave-active {
  animation: go-in 0.2s ease-in reverse;
}
@keyframes go-in {
  from { opacity: 0; transform: scale(0.85) translateY(16px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
</style>
