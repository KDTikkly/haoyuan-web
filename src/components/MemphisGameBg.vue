<template>
  <!--
    MemphisGameBg.vue — 反重力俄罗斯方块背景层 (v3.0)
    - 方块从屏幕底部生成，每 tick 向上飘（反重力）
    - 碰撞：上方越界 (y<0) 或遇到已固定方块
    - 顶行满时消除，其余方块向下平移（重力修复）
    - Enter / Space 硬浮（瞬间贴顶）
    - 计分：233分/级，上限91关
    - Restart 完整重置所有状态
  -->
  <div class="tetris-bg-wrap" :class="{ 'player-mode': isPlayerMode }" aria-hidden="true">

    <canvas ref="canvasRef" class="tetris-canvas" />

    <!-- ═══ 计分板（绝对定位顶部右侧，避免与页面内容重叠）═══ -->
    <div class="scoreboard" :class="{ 'scoreboard--active': isPlayerMode }">
      <div class="score-inner">
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
            <button class="restart-btn" @click="restartGame">↺ RESTART</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ── Memphis 配色 ──────────────────────────────────────────────────────────────
const COLORS = ['#FFD600', '#FF6B6B', '#2979FF', '#00E5A0', '#A78BFA', '#FF9800', '#FF4081']
const INK = '#1A1A1A'
const BG  = '#FAF8F5'

// ── 游戏常量 ──────────────────────────────────────────────────────────────────
const COLS           = 10
const ROWS           = 20
const BASE_MS        = 900      // Level 1 上升间隔 (ms)
const MIN_MS         = 80       // 最快速度
const MAX_LEVEL      = 91
const SCORE_PER_LEVEL = 233

// ── Tetromino 定义 (SRS 旋转) ──────────────────────────────────────────────────
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
const canvasRef    = ref<HTMLCanvasElement | null>(null)
const previewRef   = ref<HTMLCanvasElement | null>(null)
const isPlayerMode = ref(false)
const isGameOver   = ref(false)
const score        = ref(0)
const level        = ref(1)
const lines        = ref(0)
const currentColor = ref(COLORS[0])

// ── 游戏内部状态 ──────────────────────────────────────────────────────────────
let board: (string | null)[][] = []

interface Piece {
  key:   string
  rot:   number
  x:     number
  y:     number   // 行号，0=顶，ROWS-1=底
  color: string
}

let current: Piece | null = null
let next:    Piece | null = null
let tickTimer: ReturnType<typeof setTimeout> | null = null
let isRunning = false

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function newBoard(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

/**
 * 生成新方块，从底部出生：y = ROWS - 1（最底行）
 */
function randPiece(): Piece {
  const key   = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  // 底部出生行：让方块主体在 ROWS-2 行（避免出生即越界）
  return { key, rot: 0, x: 3, y: ROWS - 2, color }
}

function cells(p: Piece): [number, number][] {
  return PIECES[p.key][p.rot].map(([dc, dr]) => [p.x + dc, p.y + dr]) as [number, number][]
}

/**
 * 反重力碰撞检测：
 *   - 列越界：c<0 || c>=COLS → invalid
 *   - 上方越界：r<0 → invalid（顶部碰壁）
 *   - 下方越界：r>=ROWS → invalid（不允许超出底部，初始出生时已调整）
 *   - 已有方块：board[r][c] !== null → invalid
 */
function isValid(p: Piece, b: (string | null)[][]): boolean {
  for (const [c, r] of cells(p)) {
    if (c < 0 || c >= COLS) return false
    if (r < 0) return false          // 上方越界（反重力终点）
    if (r >= ROWS) return false      // 下方越界
    if (b[r][c] !== null) return false
  }
  return true
}

function lockPiece(p: Piece, b: (string | null)[][]) {
  for (const [c, r] of cells(p)) {
    if (r >= 0 && r < ROWS) b[r][c] = p.color
  }
}

/**
 * 反重力消行：消除 row=0（最顶行）的满行
 * 消除后，将该行以下（row>0）所有行向下平移（重力恢复）
 */
function clearTopLines(b: (string | null)[][]): number {
  let cleared = 0
  // 从顶部往下检查每行
  for (let r = 0; r < ROWS; ) {
    if (b[r].every(cell => cell !== null)) {
      // 消除此行：将 r+1..ROWS-1 向上移（覆盖 r），底部补空行
      b.splice(r, 1)
      b.push(Array(COLS).fill(null))
      cleared++
      // 不递增 r，继续检查同位置（新移上来的行）
    } else {
      r++
    }
  }
  return cleared
}

function tickInterval(): number {
  return Math.max(MIN_MS, BASE_MS - (level.value - 1) * 9)
}

// ── 反重力主游戏循环 ──────────────────────────────────────────────────────────
function tick() {
  if (!current || !isRunning) return

  // 向上移动一行（y - 1）
  const moved: Piece = { ...current, y: current.y - 1 }

  if (isValid(moved, board)) {
    current = moved
  } else {
    // 贴顶固定
    lockPiece(current, board)

    // 消行
    const cleared = clearTopLines(board)
    if (cleared > 0) {
      const pts = [0, 40, 100, 300, 1200][Math.min(cleared, 4)]
      score.value += pts * level.value
      lines.value += cleared
      const newLevel = Math.min(MAX_LEVEL, Math.floor(score.value / SCORE_PER_LEVEL) + 1)
      if (newLevel > level.value) level.value = newLevel
    }

    // 生成下一块
    current = next ?? randPiece()
    next = randPiece()
    currentColor.value = current.color

    // Game Over 检测：新块出生即无效（底部已堆满）
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

function setPlayerMode(on: boolean) {
  isPlayerMode.value = on
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
  // 彻底重置：清空所有计时器 + 矩阵 + 状态
  stopTick()
  isGameOver.value = false
  score.value = 0
  level.value = 1
  lines.value = 0
  board = newBoard()
  current = randPiece()
  next    = randPiece()
  currentColor.value = current.color
  draw()
  startTick()
  setPlayerMode(true)
}

// ── 绘制 ──────────────────────────────────────────────────────────────────────
function cellSize(): number {
  const canvas = canvasRef.value
  if (!canvas) return 20
  const maxH = canvas.height / ROWS
  const maxW = canvas.width  / (COLS + 8)
  return Math.floor(Math.min(maxH, maxW, 28))
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cs    = cellSize()
  const gridW = cs * COLS
  const gridH = cs * ROWS
  const offsetX = Math.max(20, (canvas.width - gridW) / 2 - 60)
  const offsetY = Math.max(20, (canvas.height - gridH) / 2)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 网格背景
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

  // 外边框
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.strokeRect(offsetX - 1.5, offsetY - 1.5, gridW + 3, gridH + 3)

  // "消行区"顶部高亮提示
  ctx.fillStyle = currentColor.value + '15'
  ctx.fillRect(offsetX, offsetY, gridW, cs)

  // 已固定格子
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c]
      if (cell) drawCell(ctx, offsetX + c * cs, offsetY + r * cs, cs, cell)
    }
  }

  // 当前方块（含 ghost）
  if (current) {
    // Ghost：反重力方向，ghost 应在上方尽头
    let ghost: Piece = { ...current }
    while (isValid({ ...ghost, y: ghost.y - 1 }, board)) {
      ghost = { ...ghost, y: ghost.y - 1 }
    }
    for (const [c, r] of cells(ghost)) {
      if (r >= 0 && r < ROWS) drawCell(ctx, offsetX + c * cs, offsetY + r * cs, cs, current.color, true)
    }
    for (const [c, r] of cells(current)) {
      if (r >= 0 && r < ROWS) drawCell(ctx, offsetX + c * cs, offsetY + r * cs, cs, current.color)
    }
  }

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
    ctx.fillStyle   = color + '28'
    ctx.strokeStyle = color + '60'
    ctx.lineWidth   = 1.5
  } else {
    ctx.fillStyle   = color
    ctx.strokeStyle = INK
    ctx.lineWidth   = 3
  }
  const pad = ghost ? 1 : 2
  ctx.fillRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2)
  if (!ghost) {
    ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3)
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
  const cs    = 12
  const cells_ = PIECES[next.key][0]
  const minC  = Math.min(...cells_.map(([c]) => c))
  const minR  = Math.min(...cells_.map(([, r]) => r))
  const maxC  = Math.max(...cells_.map(([c]) => c))
  const maxR  = Math.max(...cells_.map(([, r]) => r))
  const pw    = (maxC - minC + 1) * cs
  const ph    = (maxR - minR + 1) * cs
  const ox    = (64 - pw) / 2 - minC * cs
  const oy    = (64 - ph) / 2 - minR * cs
  for (const [dc, dr] of cells_) {
    drawCell(ctx, ox + dc * cs, oy + dr * cs, cs, next.color)
  }
}

// ── 键盘控制 ──────────────────────────────────────────────────────────────────
function handleKey(e: KeyboardEvent) {
  const gameCodes = ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','KeyZ','Space','Enter']
  if (gameCodes.includes(e.code)) {
    if (!isPlayerMode.value) setPlayerMode(true)
    if (isGameOver.value) return
  } else return

  e.preventDefault()
  if (!current) return

  switch (e.code) {
    case 'ArrowLeft': {
      const p = { ...current, x: current.x - 1 }
      if (isValid(p, board)) current = p
      break
    }
    case 'ArrowRight': {
      const p = { ...current, x: current.x + 1 }
      if (isValid(p, board)) current = p
      break
    }
    case 'ArrowDown': {
      // 反重力中，↓ 表示向下退（减慢浮升，软降反方向）
      const p = { ...current, y: current.y + 1 }
      if (isValid(p, board)) {
        current = p
      }
      break
    }
    case 'ArrowUp': {
      // ↑ 加速上浮（软浮）
      const p = { ...current, y: current.y - 1 }
      if (isValid(p, board)) {
        current = p
        score.value += 1
        if (tickTimer) clearTimeout(tickTimer)
        tickTimer = setTimeout(tick, tickInterval())
      }
      break
    }
    case 'KeyZ': {
      // 旋转（带 wall-kick）
      const newRot = ((current.rot + 1) % 4) as 0|1|2|3
      const kicks  = [0, -1, 1, -2, 2]
      for (const kick of kicks) {
        const rp = { ...current, rot: newRot, x: current.x + kick }
        if (isValid(rp, board)) { current = rp; break }
      }
      break
    }
    case 'Space':
    case 'Enter': {
      // 硬浮：瞬间贴顶
      let hp = { ...current }
      while (isValid({ ...hp, y: hp.y - 1 }, board)) {
        hp = { ...hp, y: hp.y - 1 }
        score.value += 2
      }
      current = hp
      if (tickTimer) clearTimeout(tickTimer)
      tick()
      return
    }
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
/* ── Canvas 固定底层，pointer-events: none 避免干扰页面交互 ── */
.tetris-bg-wrap {
  position: fixed;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  overflow: hidden;
}

.tetris-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ─── 计分板：固定右上，玩家模式下可见 ─── */
.scoreboard {
  position: fixed;
  top: 80px;
  right: 20px;
  pointer-events: none;
  opacity: 0.45;
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

.score-body { padding: 8px; }

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
  padding: 0 8px 4px;
}

.preview-canvas {
  display: block;
  width: 64px;
  height: 64px;
  border-top: 2px solid #1A1A1A20;
}

/* ─── PLAY/AUTO 切换按钮 ─── */
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

/* ─── Game Over 面板 ─── */
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
  box-shadow: none;
}

/* ─── Game Over 弹出动画 ─── */
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
