<template>
  <!--
    HomeView.vue v2
    MemphisGameBg 作为全屏背景 (z-index:-1)
    前景内容正常交互，鼠标在空白处时事件穿透到 canvas
    pointer-events 策略：
      - 前景 .home-content 内所有元素保持 pointer-events:auto
      - MemphisGameBg canvas 默认 pointer-events:none
      - 用 JS 检测鼠标是否在可交互元素上；若不在则临时给 canvas 开启 pointer-events
        以使 Matter.js 的 mouse 模块捕获到位置更新
      - 实际上 Matter.js 的 MouseConstraint 绑在 canvas 上，我们通过
        window mousemove 同步光标刚体位置，无需 pointer-events:auto
  -->
  <div class="home-root">

    <!-- ① 物理背景层（固定全屏，z-index:-1） -->
    <!-- tetrisHover：方块区域 hover 时隐藏 Hero 避免信息重叠 -->
    <MemphisGameBg ref="bgRef" @tetrisHover="onTetrisHover" />

    <!-- ② 前景内容（正常文档流，z-index 自动 > -1） -->
    <!-- isTetrisActive 时透明淡出，pointer-events-none 避免遮挡操控 -->
    <div
      class="home-content relative transition-opacity duration-300"
      :class="isTetrisActive ? 'opacity-0 pointer-events-none' : 'opacity-100'"
    >

      <HeroSection />

      <!-- Quick intro pillars — 横向拖拽排序 -->
      <section
        ref="pillarsRef"
        class="pillars-section max-w-6xl mx-auto px-6 py-24 border-t-[3px] border-ink"
        aria-label="专业领域卡片，可拖拽排序"
      >
        <!-- 拖拽提示 -->
        <div class="flex items-center gap-2 mb-6 select-none">
          <span class="font-mono text-[9px] text-ink/30 uppercase tracking-widest">DRAG TO REORDER</span>
          <span class="flex gap-1" aria-hidden="true">
            <span v-for="i in sortedPillars.length" :key="i"
              class="w-1.5 h-1.5 border border-ink/30"
              :style="{ background: sortedPillars[i-1]?.color + '60' }"
            ></span>
          </span>
        </div>

        <!-- 卡片容器 -->
        <div class="pillars-grid grid md:grid-cols-3 gap-6">
          <div
            v-for="(item, idx) in sortedPillars"
            :key="item.id"
            class="pillar-card border-[3px] border-ink bg-warm-beige/90 backdrop-blur-[2px] select-none
                   transition-[transform,box-shadow,opacity] duration-150 relative"
            :class="{
              'shadow-[5px_5px_0_0_#1A1A1A]': dragState.dragging !== item.id && !isDragOver(idx),
              'shadow-[8px_8px_0_0_#1A1A1A] -translate-x-[2px] -translate-y-[2px] rotate-[1.5deg] opacity-80 z-50 cursor-grabbing': dragState.dragging === item.id,
              'scale-[0.98]': isDragOver(idx) && dragState.dragging !== item.id,
            }"
            :style="dragState.dragging === item.id ? { cursor: 'grabbing' } : { cursor: 'grab' }"
            @pointerdown="onDragStart($event, idx)"
            :aria-grabbed="dragState.dragging === item.id"
            :aria-label="`${$t(item.labelKey)}，第 ${idx + 1} 位`"
          >
            <!-- 拖拽手柄提示（左上角 grip dots，hover 时显示） -->
            <div class="absolute top-2 right-2 flex flex-col gap-[3px] opacity-0 group-hover:opacity-40 pillar-grip" aria-hidden="true">
              <span class="flex gap-[3px]"><span class="w-[3px] h-[3px] bg-ink rounded-full"></span><span class="w-[3px] h-[3px] bg-ink rounded-full"></span></span>
              <span class="flex gap-[3px]"><span class="w-[3px] h-[3px] bg-ink rounded-full"></span><span class="w-[3px] h-[3px] bg-ink rounded-full"></span></span>
              <span class="flex gap-[3px]"><span class="w-[3px] h-[3px] bg-ink rounded-full"></span><span class="w-[3px] h-[3px] bg-ink rounded-full"></span></span>
            </div>

            <!-- 落点指示线（左侧） -->
            <div
              v-if="isDragOver(idx) && dragState.dragging !== item.id"
              class="absolute -left-[5px] top-0 bottom-0 w-[4px] bg-ink z-10"
              aria-hidden="true"
            ></div>

            <div class="p-8">
              <div
                class="w-10 h-10 mb-4 flex items-center justify-center border-2 border-ink font-bold text-lg"
                :style="{ background: item.color }"
              >{{ item.icon }}</div>
              <h3 class="font-display font-extrabold text-xl mb-2">{{ $t(item.labelKey) }}</h3>
              <p class="text-sm text-ink/60 leading-relaxed">{{ $t(item.descKey) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured projects teaser -->
      <section class="border-t-[3px] border-ink py-16 px-6">
        <div class="max-w-6xl mx-auto">
          <div class="flex items-end justify-between mb-10">
            <div>
              <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-4 bg-memphis-purple text-warm-white">
                <span class="w-2 h-2 rounded-full bg-warm-white"></span>
                {{ $t('home.featured_badge') }}
              </div>
              <h2 class="font-display font-extrabold text-4xl">{{ $t('home.featured_title') }}</h2>
            </div>
            <RouterLink to="/projects" class="
              px-4 py-2 text-sm font-mono font-bold
              border-[3px] border-ink
              shadow-[4px_4px_0_0_#1A1A1A]
              hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
              active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
              transition-[transform,box-shadow] duration-150
            ">
              {{ $t('home.view_all') }}
            </RouterLink>
          </div>
          <div v-if="loading" class="grid md:grid-cols-2 gap-6">
            <div v-for="n in 2" :key="n" class="card-hard h-72 animate-pulse bg-warm-beige" />
          </div>
          <div v-else class="grid md:grid-cols-2 gap-6">
            <ProjectCard
              v-for="p in featured"
              :key="p.id"
              :project="p"
              @open="openProject"
            />
          </div>
        </div>
      </section>

      <!-- Scroll down indicator -->
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1">
        <span class="font-mono text-[9px] text-ink/30 uppercase tracking-widest">SCROLL</span>
        <svg class="scroll-arrow" width="16" height="22" viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="8" y1="0" x2="8" y2="14" stroke="#1A1A1A" stroke-opacity="0.3" stroke-width="2" stroke-linecap="round"/>
          <polyline points="3,10 8,16 13,10" stroke="#1A1A1A" stroke-opacity="0.3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>

      <ProjectSlideOver :project="activeProject" :visible="!!activeProject" @close="activeProject = null" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HeroSection from '@/components/HeroSection.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import ProjectSlideOver from '@/components/ProjectSlideOver.vue'
import MemphisGameBg from '@/components/MemphisGameBg.vue'
import { fetchProjects } from '@/api/projectService'

const { locale } = useI18n()

const bgRef         = ref(null)
const isTetrisActive = ref(false)

function onTetrisHover(active: boolean) {
  isTetrisActive.value = active
}
const projects = ref<any[]>([])
const loading = ref(true)
const activeProject = ref<any>(null)

const featured = computed(() => projects.value.filter((p: any) => p.featured).slice(0, 2))

async function loadFeatured() {
  loading.value = true
  try {
    const res = await fetchProjects()
    projects.value = res ?? []
  } catch { projects.value = [] }
  finally { loading.value = false }
}

onMounted(loadFeatured)
watch(locale, loadFeatured)

function openProject(p: any) { activeProject.value = p }

const pillarsRef = ref<HTMLElement | null>(null)

// 初始顺序，每项带稳定 id
const PILLARS_DATA = [
  { id: 'game', icon: '◈', color: '#FFD600', labelKey: 'pillars.game_label', descKey: 'pillars.game_desc' },
  { id: 'ai',   icon: '◉', color: '#2979FF', labelKey: 'pillars.ai_label',   descKey: 'pillars.ai_desc'   },
  { id: 'biz',  icon: '◆', color: '#FF6B6B', labelKey: 'pillars.biz_label',  descKey: 'pillars.biz_desc'  },
]

// 从 localStorage 恢复顺序
function loadOrder(): typeof PILLARS_DATA {
  try {
    const saved = localStorage.getItem('pillars-order')
    if (saved) {
      const ids: string[] = JSON.parse(saved)
      const sorted = ids.map(id => PILLARS_DATA.find(p => p.id === id)).filter(Boolean) as typeof PILLARS_DATA
      if (sorted.length === PILLARS_DATA.length) return sorted
    }
  } catch { /* ignore */ }
  return [...PILLARS_DATA]
}

const sortedPillars = ref(loadOrder())

function saveOrder() {
  localStorage.setItem('pillars-order', JSON.stringify(sortedPillars.value.map(p => p.id)))
}

// ── Drag state ──
interface DragState {
  dragging: string | null   // 当前被拖拽的 item.id
  overIdx: number | null    // 当前悬停的目标索引
  startIdx: number          // 拖拽起始索引
}

const dragState = reactive<DragState>({ dragging: null, overIdx: null, startIdx: -1 })

function isDragOver(idx: number): boolean {
  if (dragState.dragging === null) return false
  if (dragState.overIdx === idx && sortedPillars.value[idx]?.id !== dragState.dragging) return true
  return false
}

function onDragStart(e: PointerEvent, startIdx: number) {
  // 只响应左键 / 触控
  if ((e as PointerEvent).pointerType === 'mouse' && (e as PointerEvent).button !== 0) return
  const item = sortedPillars.value[startIdx]
  if (!item) return

  dragState.dragging = item.id
  dragState.startIdx = startIdx
  dragState.overIdx  = null

  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

  function onMove(ev: PointerEvent) {
    if (!pillarsRef.value) return
    const cards = Array.from(pillarsRef.value.querySelectorAll('.pillar-card')) as HTMLElement[]
    let targetIdx: number | null = null
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      if (ev.clientX < midX) { targetIdx = i; break }
    }
    if (targetIdx === null) targetIdx = cards.length - 1
    dragState.overIdx = targetIdx
  }

  function onEnd(ev: PointerEvent) {
    ;(ev.currentTarget as HTMLElement)?.releasePointerCapture?.(ev.pointerId)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.removeEventListener('pointercancel', onEnd)

    const fromIdx = sortedPillars.value.findIndex(p => p.id === dragState.dragging)
    const toIdx   = dragState.overIdx

    if (fromIdx !== -1 && toIdx !== null && toIdx !== fromIdx) {
      const arr = [...sortedPillars.value]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx > fromIdx ? toIdx - 0 : toIdx, 0, moved)
      sortedPillars.value = arr
      saveOrder()
    }

    dragState.dragging = null
    dragState.overIdx  = null
    dragState.startIdx = -1
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup',   onEnd)
  document.addEventListener('pointercancel', onEnd)
}



// ── Pointer-events pass-through logic ──
// The canvas is z-index:-1 and pointer-events:none (set in MemphisGameBg).
// Matter.js cursor body position is synced via window mousemove, so it works
// regardless of pointer-events setting on the canvas — no extra JS needed.
// Click events on blank areas: we delegate to canvas click in MemphisGameBg
// by checking if the native click target is the body/html (blank area):
function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  // If the click landed on a background element (not on home-content children),
  // re-fire the click on the canvas so MemphisGameBg can handle shape detection.
  if (target === document.body || target === document.documentElement) {
    const canvas = document.querySelector('.memphis-canvas') as HTMLCanvasElement | null
    if (canvas) canvas.dispatchEvent(new MouseEvent('click', { clientX: e.clientX, clientY: e.clientY, bubbles: false }))
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick, true))
onUnmounted(() => document.removeEventListener('click', onDocumentClick, true))
</script>

<style scoped>
.home-root {
  position: relative;
  min-height: 100vh;
}

.home-content {
  position: relative;
  z-index: 1;
}

.scroll-arrow {
  animation: bounce-down 1.6s ease-in-out infinite;
}

@keyframes bounce-down {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50%       { transform: translateY(5px); opacity: 0.7; }
}

/* ── Pillar 拖拽排序 ── */
.pillars-section.is-dragging {
  cursor: grabbing;
  user-select: none;
}

.pillar-card:hover .pillar-grip {
  opacity: 0.35 !important;
}

.pillar-card {
  touch-action: none; /* 禁止浏览器接管触控手势 */
}

/* 拖拽中的卡片：加强阴影 + 轻旋转（在内联 class 里已处理，这里做 will-change 优化） */
.pillar-card[aria-grabbed="true"] {
  will-change: transform;
  pointer-events: none;
}

</style>
