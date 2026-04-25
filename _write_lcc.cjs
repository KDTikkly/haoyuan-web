
const fs = require('fs')
const dest = 'c:/Users/KDVON/CodeBuddy/20260422231627/portfolio-frontend/src/components/LightConeCard.vue'

// Read existing file to get template section
const existing = fs.readFileSync(dest, 'utf8')
// Keep only <template>...</template> block
const templateMatch = existing.match(/<template[\s\S]*<\/template>/)
const templateBlock = templateMatch ? templateMatch[0] : '<template><slot/></template>'

const code = templateBlock + `

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { OpticsEngine } from '../utils/OpticsEngine.js'

// ── Props ────────────────────────────────────────────────────
const props = defineProps({
  coneId:    { type: String,  default: 'LC-00' },
  attrs:     { type: Array,   default: () => [] },
  baseColor: { type: Array,   default: () => [0.07, 0.05, 0.13] },
  fresnelR0: { type: Number,  default: 0.04 },
})

// ── Template refs ────────────────────────────────────────────
const wrapEl         = ref(null)
const cardEl         = ref(null)
const shaderCanvasEl = ref(null)

// ── Engine & state ───────────────────────────────────────────
let engine  = null
const isPressed  = ref(false)
const showDetail = ref(false)

// Spring state
let _cx = 0, _cy = 0, _targetCx = 0, _targetCy = 0
let _rafId = 0
const STIFFNESS = 0.10
const DAMPING   = 0.78

// ── Spring loop ──────────────────────────────────────────────
function _springFrame() {
  _cx += (_targetCx - _cx) * STIFFNESS
  _cy += (_targetCy - _cy) * STIFFNESS
  // CSS 3-D tilt
  if (cardEl.value) {
    const r = Math.sqrt(_cx * _cx + _cy * _cy)
    const perspDist = Math.round(900 - r * r * 180)
    const scale = 1.015 + r * r * 0.035
    cardEl.value.style.transform =
      \`perspective(\${perspDist}px) rotateX(\${-_cy * 15}deg) rotateY(\${_cx * 15}deg) scale3d(\${scale},\${scale},1)\`
  }
  // Drive WebGL engine
  if (engine) engine.setTilt(_cx, _cy)
  _rafId = requestAnimationFrame(_springFrame)
}

// ── Pointer events ───────────────────────────────────────────
function onPointerMove(e) {
  if (!wrapEl.value) return
  const rect = wrapEl.value.getBoundingClientRect()
  _targetCx = Math.max(-1, Math.min(1, ((e.clientX - rect.left)  / rect.width  - 0.5) * 2))
  _targetCy = Math.max(-1, Math.min(1, ((e.clientY - rect.top)   / rect.height - 0.5) * 2))
}

function onPointerEnter(e) { onPointerMove(e) }

function onPointerLeave() {
  _targetCx = 0
  _targetCy = 0
}

// ── Press feedback ───────────────────────────────────────────
function onMouseDown() {
  isPressed.value = true
  if (cardEl.value) {
    cardEl.value.style.transition = 'transform 60ms ease'
    cardEl.value.style.transform  = 'scale(0.96)'
    cardEl.value.style.boxShadow  = '1px 1px 0 #000'
  }
}

function onMouseUp() {
  isPressed.value = false
  if (cardEl.value) {
    cardEl.value.style.transition = 'transform 300ms cubic-bezier(0.34,1.56,0.64,1)'
  }
}

// ── Click → detail modal ─────────────────────────────────────
function onClick() {
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

// Close on ESC
function _onKeyDown(e) {
  if (e.key === 'Escape') closeDetail()
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(() => {
  // Init WebGL engine on canvas
  if (shaderCanvasEl.value) {
    engine = new OpticsEngine(shaderCanvasEl.value)
    engine.setBaseColor(...props.baseColor)
    engine.setFresnelR0(props.fresnelR0)
    engine.init()
  }
  // Start spring loop
  _rafId = requestAnimationFrame(_springFrame)
  window.addEventListener('keydown', _onKeyDown)
})

onUnmounted(() => {
  cancelAnimationFrame(_rafId)
  if (engine) { engine.dispose(); engine = null }
  window.removeEventListener('keydown', _onKeyDown)
})
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────── */
.lc-wrap {
  position: relative;
  display: inline-block;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

/* ── Card ────────────────────────────────────────────────── */
.lc-card {
  position: relative;
  overflow: hidden;
  /* Intentional visual exception: NO hard border/shadow on this optical surface */
  border-radius: 8px;
  will-change: transform;
  transform-style: preserve-3d;
  transition: box-shadow 200ms ease;
}

/* ── WebGL canvas — absolute overlay, pointer transparent ── */
.lc-shader-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
  mix-blend-mode: screen;
  opacity: 0.92;
}

/* ── Card content slot ───────────────────────────────────── */
.lc-content {
  position: relative;
  z-index: 1;
}

/* ── Press ripple ring ───────────────────────────────────── */
.lc-press-ring {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  border: 2px solid transparent;
  transition: border-color 80ms ease;
}
.lc-press-ring.active {
  border-color: rgba(255,255,255,0.35);
}

/* ════════════════════════════════════════════════════════════
   Detail Modal — Memphis strict compliance
   3px black border, font-mono, hard shadow, NO rounded corners
   ════════════════════════════════════════════════════════════ */
.lc-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0,0,0,0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lc-detail-panel {
  background: #fafafa;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  width: min(720px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Header row ─────────────────────────────────────────── */
.lc-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 3px solid #000;
  background: #111;
}

.lc-detail-tag {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #fff;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.lc-detail-id {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #aaa;
  margin-left: auto;
}

.lc-detail-close {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #fff;
  background: transparent;
  border: 2px solid #fff;
  padding: 2px 8px;
  cursor: pointer;
  letter-spacing: 0.08em;
  transition: background 120ms, color 120ms;
}
.lc-detail-close:hover {
  background: #fff;
  color: #000;
}

/* ── Body slot ───────────────────────────────────────────── */
.lc-detail-body {
  padding: 20px 20px 12px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #111;
  flex: 1;
}

.lc-detail-placeholder {
  color: #888;
  font-style: italic;
}

/* ── Footer attr row ─────────────────────────────────────── */
.lc-detail-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-top: 3px solid #000;
}

.lc-detail-attr {
  display: flex;
  flex-direction: column;
  padding: 8px 16px;
  border-right: 2px solid #000;
  min-width: 120px;
}
.lc-detail-attr:last-child { border-right: none; }

.lc-detail-attr-label {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.10em;
}

.lc-detail-attr-value {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #000;
  font-weight: 700;
  margin-top: 2px;
}

/* ── Unfurl transition ───────────────────────────────────── */
.lc-unfurl-enter-active {
  transition: opacity 220ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1);
}
.lc-unfurl-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.lc-unfurl-enter-from,
.lc-unfurl-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
`

fs.writeFileSync(dest, code, 'utf8')
console.log('LightConeCard.vue written:', fs.statSync(dest).size, 'bytes')
