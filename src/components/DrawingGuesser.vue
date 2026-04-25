<template>
  <!-- ════════════════════════════════════════════
       DrawingGuesser — AI 画图猜猜乐
       Memphis Brutalist 风格
       免费：23 次猜测，超出需支付 10 USDT 解锁
  ════════════════════════════════════════════ -->
  <div
    class="border-[3px] border-ink bg-warm-white shadow-[6px_6px_0_0_#1A1A1A] flex flex-col"
    style="max-width: 420px;"
  >
    <!-- ─── Header ─── -->
    <div
      class="flex items-center justify-between px-4 py-2.5"
      style="background: #1A1A1A; border-bottom: 3px solid #1A1A1A;"
    >
      <span class="font-display font-black text-sm uppercase tracking-wider" style="color:#FFD600;">
        [ 🎨 AI 画图猜猜乐 ]
      </span>
      <!-- 计数器 -->
      <div class="flex items-center gap-2">
        <span
          class="font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider"
          :style="isUnlocked
            ? 'background:#00E5A0;color:#1A1A1A;border:2px solid #00E5A0;'
            : guessCount >= FREE_LIMIT
              ? 'background:#FF6B6B;color:#fff;border:2px solid #FF6B6B;'
              : 'background:#FFD600;color:#1A1A1A;border:2px solid #FFD600;'"
        >
          {{ isUnlocked ? '∞ PRO' : `${guessCount} / ${FREE_LIMIT}` }}
        </span>
      </div>
    </div>

    <!-- ─── Canvas 画板 ─── -->
    <div class="relative" style="border-bottom: 3px solid #1A1A1A;">
      <canvas
        ref="drawCanvas"
        :width="canvasSize"
        :height="canvasSize"
        class="block w-full cursor-crosshair"
        style="background: #fff; touch-action: none;"
        @mousedown="startDraw"
        @mousemove="onDraw"
        @mouseup="stopDraw"
        @mouseleave="stopDraw"
        @touchstart.prevent="startDrawTouch"
        @touchmove.prevent="onDrawTouch"
        @touchend="stopDraw"
      ></canvas>
      <!-- 画笔颜色/粗细工具栏 -->
      <div
        class="absolute top-2 right-2 flex flex-col gap-1.5"
      >
        <button
          v-for="c in COLORS"
          :key="c"
          @click="brushColor = c"
          class="w-5 h-5 border-[2px]"
          :style="`background:${c}; border-color: ${brushColor === c ? '#1A1A1A' : c + '66'};
                   box-shadow: ${brushColor === c ? '2px 2px 0 #1A1A1A' : 'none'};`"
        ></button>
        <button
          @click="brushColor = 'eraser'"
          class="w-5 h-5 border-[2px] flex items-center justify-center font-mono text-[9px]"
          :style="`background:#fff; border-color: ${brushColor === 'eraser' ? '#1A1A1A' : '#ccc'};
                   box-shadow: ${brushColor === 'eraser' ? '2px 2px 0 #1A1A1A' : 'none'};`"
          title="橡皮擦"
        >✕</button>
      </div>
    </div>

    <!-- ─── 控制栏 ─── -->
    <div class="flex items-center gap-2 px-3 py-2" style="border-bottom: 2px solid #1A1A1A22;">
      <!-- 清空 -->
      <button
        @click="clearCanvas"
        class="font-mono font-bold text-[10px] uppercase px-2 py-1 border-[2px] border-ink
               hover:bg-ink hover:text-warm-white transition-all duration-100"
      >[ CLR ]</button>

      <!-- 画笔粗细 -->
      <input
        v-model.number="brushSize"
        type="range" min="2" max="20" step="1"
        class="flex-1 accent-ink"
        title="画笔粗细"
      />
      <span class="font-mono text-[9px] text-ink/40 w-5 text-right">{{ brushSize }}</span>

      <!-- AI 猜 按钮 -->
      <button
        @click="aiGuess"
        :disabled="isGuessing || isCanvasEmpty"
        class="font-display font-black text-[11px] uppercase tracking-wide px-3 py-1.5
               transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
        style="
          background: #1A1A1A;
          color: #FFD600;
          border: 2px solid #1A1A1A;
          box-shadow: 3px 3px 0 0 #FFD600;
        "
        @mousedown="(e:any) => { if(!isGuessing && !isCanvasEmpty){ e.currentTarget.style.transform='translate(3px,3px)';e.currentTarget.style.boxShadow='none'; }}"
        @mouseup="(e:any) => { e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 0 #FFD600'; }"
        @mouseleave="(e:any) => { e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 0 #FFD600'; }"
      >
        <span v-if="isGuessing" class="flex items-center gap-1">
          <span class="inline-block w-1.5 h-1.5 rounded-full animate-ping" style="background:#FFD600;"></span>
          猜中...
        </span>
        <span v-else>[ 🤖 AI 猜 ]</span>
      </button>
    </div>

    <!-- ─── AI 回复气泡 ─── -->
    <div class="px-4 py-3 min-h-[56px] flex items-center">
      <Transition name="bubble">
        <div
          v-if="guessResult"
          class="w-full px-3 py-2 font-mono text-xs leading-relaxed"
          style="
            background: #FAF8F0;
            border: 2px solid #1A1A1A;
            box-shadow: 3px 3px 0 0 #1A1A1A22;
          "
        >
          <span class="text-ink/40 text-[9px] uppercase tracking-widest block mb-0.5">AI Says:</span>
          {{ guessResult }}
        </div>
        <div v-else class="font-mono text-xs text-ink/20 italic">
          在画板上涂鸦，让 AI 来猜猜看...
        </div>
      </Transition>
    </div>

    <!-- ─── Footer：剩余次数进度条 ─── -->
    <div
      v-if="!isUnlocked"
      class="px-3 pb-3 flex flex-col gap-1"
      style="border-top: 2px solid #1A1A1A11;"
    >
      <div class="flex items-center justify-between mt-2">
        <span class="font-mono text-[9px] text-ink/40 uppercase tracking-widest">免费额度</span>
        <span class="font-mono text-[9px]" :style="guessCount >= FREE_LIMIT ? 'color:#FF6B6B;font-weight:bold;' : 'color:#1A1A1A66;'">
          剩余 {{ Math.max(0, FREE_LIMIT - guessCount) }} 次
        </span>
      </div>
      <!-- 进度条 -->
      <div class="h-[5px] bg-ink/10 border border-ink/10 overflow-hidden">
        <div
          class="h-full transition-all duration-500"
          :style="{
            width: `${Math.min(100, (guessCount / FREE_LIMIT) * 100)}%`,
            background: guessCount >= FREE_LIMIT ? '#FF6B6B' : '#FFD600',
          }"
        ></div>
      </div>
    </div>
  </div>

  <!-- 10 USDT 解锁弹窗 -->
  <DrawingPayModal
    v-if="showPayModal"
    @close="showPayModal = false"
    @unlocked="onUnlocked"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DrawingPayModal from './DrawingPayModal.vue'

// ─── 常量 ───
const FREE_LIMIT = 23
const COLORS = ['#1A1A1A', '#FF6B6B', '#FFD600', '#2979FF', '#00E5A0', '#A78BFA']
const canvasSize = 320

// ─── 状态 ───
const drawCanvas   = ref<HTMLCanvasElement | null>(null)
const guessCount   = ref(0)
const isUnlocked   = ref(false)
const showPayModal = ref(false)
const isGuessing   = ref(false)
const guessResult  = ref('')
const brushColor   = ref('#1A1A1A')
const brushSize    = ref(5)
const isDrawing    = ref(false)
let lastX = 0, lastY = 0

// ─── 是否空白画布 ───
const isCanvasEmpty = computed(() => {
  if (!drawCanvas.value) return true
  const ctx = drawCanvas.value.getContext('2d')!
  const data = ctx.getImageData(0, 0, canvasSize, canvasSize).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false
  }
  return true
})

// ─── 画板初始化 ───
onMounted(() => {
  const ctx = drawCanvas.value?.getContext('2d')
  if (ctx) {
    ctx.lineCap   = 'round'
    ctx.lineJoin  = 'round'
  }
})

function getScaledPos(e: MouseEvent): [number, number] {
  const rect = drawCanvas.value!.getBoundingClientRect()
  const scaleX = canvasSize / rect.width
  const scaleY = canvasSize / rect.height
  return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY]
}

function getScaledPosTouch(t: Touch): [number, number] {
  const rect = drawCanvas.value!.getBoundingClientRect()
  const scaleX = canvasSize / rect.width
  const scaleY = canvasSize / rect.height
  return [(t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY]
}

function startDraw(e: MouseEvent) {
  isDrawing.value = true;
  [lastX, lastY] = getScaledPos(e)
}
function stopDraw() { isDrawing.value = false }

function onDraw(e: MouseEvent) {
  if (!isDrawing.value || !drawCanvas.value) return
  const ctx = drawCanvas.value.getContext('2d')!
  const [x, y] = getScaledPos(e)
  ctx.beginPath()
  if (brushColor.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = brushSize.value * 3
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = brushColor.value
    ctx.lineWidth = brushSize.value
  }
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke();
  [lastX, lastY] = [x, y]
}

function startDrawTouch(e: TouchEvent) {
  isDrawing.value = true
  const t = e.touches[0];
  [lastX, lastY] = getScaledPosTouch(t)
}
function onDrawTouch(e: TouchEvent) {
  if (!isDrawing.value) return
  const t = e.touches[0]
  const synth = new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY })
  onDraw(synth)
}

function clearCanvas() {
  if (!drawCanvas.value) return
  const ctx = drawCanvas.value.getContext('2d')!
  ctx.clearRect(0, 0, canvasSize, canvasSize)
  guessResult.value = ''
}

// ─── AI 猜 ───
async function aiGuess() {
  // 检查次数上限
  if (!isUnlocked.value && guessCount.value >= FREE_LIMIT) {
    showPayModal.value = true
    return
  }
  if (isGuessing.value || isCanvasEmpty.value) return

  isGuessing.value = true
  guessResult.value = ''

  try {
    const imageData = drawCanvas.value!.toDataURL('image/png')
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData }),
    })
    const data = await res.json()
    guessResult.value = data.result || data.error || '??'

    if (!isUnlocked.value) {
      guessCount.value++
      // 恰好用完第 23 次后，下次触发弹窗
    }
  } catch {
    guessResult.value = '网络异常，AI 正在发呆中...'
  } finally {
    isGuessing.value = false
  }
}

function onUnlocked() {
  isUnlocked.value  = true
  showPayModal.value = false
}
</script>

<style scoped>
.bubble-enter-active { transition: all 0.2s ease; }
.bubble-leave-active { transition: all 0.15s ease; }
.bubble-enter-from, .bubble-leave-to { opacity: 0; transform: translateY(4px); }
</style>
