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

    <!-- ② 前景内容（正常文档流，z-index 自动 > -1） -->
    <div
      class="home-content relative transition-opacity duration-300"
    >

      <HeroSection />

      <!-- Quick intro pillars — 横向拖拽排序 -->
      <section
        ref="pillarsRef"
        class="pillars-section max-w-6xl mx-auto px-6 py-24 border-t-[3px] border-ink"
        :class="{ 'is-dragging': dragState.dragging !== null }"
        aria-label="专业领域卡片，可拖拽排序"
      >
        <!-- 拖拽提示 hint bar -->
        <div class="flex items-center gap-3 mb-6 select-none">
          <!-- 动画引导图标 -->
          <div class="pillar-hint-icon" :class="{ 'hint-idle': !hintDismissed }" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" fill="#FFD600" stroke="#1A1A1A" stroke-width="1.5"/>
              <rect x="4" y="4" width="5" height="5" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="1.5"/>
              <path d="M8.5 7 L11 7 M11 7 L9.5 5.5 M11 7 L9.5 8.5" stroke="#1A1A1A" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="font-mono text-[9px] text-ink/30 uppercase tracking-widest">DRAG TO REORDER</span>
          <!-- 顺序指示点 -->
          <span class="flex gap-1 ml-auto" aria-hidden="true">
            <span
              v-for="(p, i) in sortedPillars" :key="p.id"
              class="pillar-order-dot border border-ink/20"
              :style="{ background: p.color }"
              :title="`位置 ${i+1}: ${p.id}`"
            ></span>
          </span>
        </div>

        <!-- 卡片容器 -->
        <div class="pillars-grid grid md:grid-cols-3 gap-6">
          <div
            v-for="(item, idx) in sortedPillars"
            :key="item.id"
            class="pillar-card-wrapper relative"
          >
            <!-- 占位槽：拖拽中显示虚线框 -->
            <div
              v-if="dragState.dragging === item.id"
              class="pillar-placeholder border-[3px] border-dashed border-ink/30 bg-ink/5"
              aria-hidden="true"
            ></div>

            <!-- 真实卡片 -->
            <div
              v-else
              class="pillar-card border-[3px] border-ink bg-warm-beige/90 select-none relative overflow-visible"
              :class="{
                'pillar-card--drop-target': isDragOver(idx),
                'pillar-card--idle-hint': !hintDismissed && idx === 0,
              }"
              :style="{ cursor: 'grab' }"
              @pointerdown="onDragStart($event, idx)"
              :aria-grabbed="false"
              :aria-label="`${$t(item.labelKey)}，第 ${idx + 1} 位，可拖拽`"
            >
              <!-- 落点箭头指示（drop zone 箭头） -->
              <div v-if="isDragOver(idx)" class="drop-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3 L10 14 M5 10 L10 15 L15 10" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- grip 手柄 -->
              <div class="pillar-grip absolute top-3 right-3" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="2" cy="2" r="1.2" fill="#1A1A1A" opacity="0.25"/>
                  <circle cx="8" cy="2" r="1.2" fill="#1A1A1A" opacity="0.25"/>
                  <circle cx="2" cy="8" r="1.2" fill="#1A1A1A" opacity="0.25"/>
                  <circle cx="8" cy="8" r="1.2" fill="#1A1A1A" opacity="0.25"/>
                  <circle cx="2" cy="5" r="1.2" fill="#1A1A1A" opacity="0.25"/>
                  <circle cx="8" cy="5" r="1.2" fill="#1A1A1A" opacity="0.25"/>
                </svg>
              </div>

              <div class="p-8">
                <!-- SVG 图标替代 Unicode -->
                <div
                  class="pillar-icon w-10 h-10 mb-5 border-[2.5px] border-ink flex items-center justify-center"
                  :style="{ background: item.color }"
                >
                  <!-- game -->
                  <svg v-if="item.id === 'game'" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="1" y="5" width="16" height="9" rx="1" stroke="#1A1A1A" stroke-width="2"/>
                    <line x1="5" y1="9" x2="5" y2="9" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                    <line x1="3.5" y1="9.5" x2="6.5" y2="9.5" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="5" y1="8" x2="5" y2="11" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round"/>
                    <circle cx="13" cy="8.5" r="1" fill="#1A1A1A"/>
                    <circle cx="11" cy="10.5" r="1" fill="#1A1A1A"/>
                    <line x1="7" y1="1" x2="11" y2="1" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                    <line x1="9" y1="1" x2="9" y2="5" stroke="#1A1A1A" stroke-width="2"/>
                  </svg>
                  <!-- ai -->
                  <svg v-else-if="item.id === 'ai'" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="4" stroke="#1A1A1A" stroke-width="2"/>
                    <circle cx="9" cy="9" r="1.5" fill="#1A1A1A"/>
                    <line x1="9" y1="1" x2="9" y2="4" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                    <line x1="9" y1="14" x2="9" y2="17" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                    <line x1="1" y1="9" x2="4" y2="9" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                    <line x1="14" y1="9" x2="17" y2="9" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="3.5" cy="3.5" r="1.2" fill="#1A1A1A"/>
                    <circle cx="14.5" cy="14.5" r="1.2" fill="#1A1A1A"/>
                  </svg>
                  <!-- biz -->
                  <svg v-else-if="item.id === 'biz'" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <polyline points="2,13 6,8 10,10 16,4" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="12,4 16,4 16,8" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="2" y1="16" x2="16" y2="16" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
                <h3 class="font-display font-extrabold text-xl mb-2">{{ $t(item.labelKey) }}</h3>
                <p class="text-sm text-ink/60 leading-relaxed">{{ $t(item.descKey) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 浮动幽灵卡片（跟随鼠标） -->
        <Teleport to="body">
          <div
            v-if="ghost.visible && ghostItem"
            class="pillar-ghost border-[3px] border-ink bg-warm-beige"
            :style="{
              left: ghost.x + 'px',
              top:  ghost.y + 'px',
              width: ghost.w + 'px',
              height: ghost.h + 'px',
            }"
            aria-hidden="true"
          >
            <div class="p-8">
              <div
                class="pillar-icon w-10 h-10 mb-5 border-[2.5px] border-ink flex items-center justify-center"
                :style="{ background: ghostItem.color }"
              >
                <svg v-if="ghostItem.id === 'game'" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1" y="5" width="16" height="9" rx="1" stroke="#1A1A1A" stroke-width="2"/>
                  <line x1="3.5" y1="9.5" x2="6.5" y2="9.5" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round"/>
                  <line x1="5" y1="8" x2="5" y2="11" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round"/>
                  <circle cx="13" cy="8.5" r="1" fill="#1A1A1A"/>
                  <circle cx="11" cy="10.5" r="1" fill="#1A1A1A"/>
                  <line x1="7" y1="1" x2="11" y2="1" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                  <line x1="9" y1="1" x2="9" y2="5" stroke="#1A1A1A" stroke-width="2"/>
                </svg>
                <svg v-else-if="ghostItem.id === 'ai'" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="4" stroke="#1A1A1A" stroke-width="2"/>
                  <circle cx="9" cy="9" r="1.5" fill="#1A1A1A"/>
                  <line x1="9" y1="1" x2="9" y2="4" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                  <line x1="9" y1="14" x2="9" y2="17" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                  <line x1="1" y1="9" x2="4" y2="9" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                  <line x1="14" y1="9" x2="17" y2="9" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="3.5" cy="3.5" r="1.2" fill="#1A1A1A"/>
                  <circle cx="14.5" cy="14.5" r="1.2" fill="#1A1A1A"/>
                </svg>
                <svg v-else-if="ghostItem.id === 'biz'" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <polyline points="2,13 6,8 10,10 16,4" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="12,4 16,4 16,8" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="2" y1="16" x2="16" y2="16" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <h3 class="font-display font-extrabold text-xl mb-2">{{ $t(ghostItem.labelKey) }}</h3>
              <p class="text-sm text-ink/60 leading-relaxed">{{ $t(ghostItem.descKey) }}</p>
            </div>
          </div>
        </Teleport>
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
import { fetchProjects } from '@/api/projectService'

const { locale } = useI18n()

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

// ── 数据定义（去掉 icon 字段，改用模板内 SVG） ──
const PILLARS_DATA = [
  { id: 'game', color: '#FFD600', labelKey: 'pillars.game_label', descKey: 'pillars.game_desc' },
  { id: 'ai',   color: '#2979FF', labelKey: 'pillars.ai_label',   descKey: 'pillars.ai_desc'   },
  { id: 'biz',  color: '#FF6B6B', labelKey: 'pillars.biz_label',  descKey: 'pillars.biz_desc'  },
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

// ── 首次引导动画（只播一次，之后 dismiss） ──
const hintDismissed = ref(localStorage.getItem('pillars-hint-dismissed') === '1')

// ── Drag state ──
interface DragState {
  dragging: string | null
  overIdx:  number | null
  startIdx: number
}
const dragState = reactive<DragState>({ dragging: null, overIdx: null, startIdx: -1 })

// ── 幽灵卡片状态（跟随鼠标） ──
const ghost = reactive({ visible: false, x: 0, y: 0, w: 0, h: 0 })
const ghostItem = computed(() =>
  dragState.dragging ? sortedPillars.value.find(p => p.id === dragState.dragging) ?? null : null
)

// 拖拽偏移（按下时鼠标在卡片内的位置）
let dragOffsetX = 0
let dragOffsetY = 0

function isDragOver(idx: number): boolean {
  if (dragState.dragging === null) return false
  return dragState.overIdx === idx && sortedPillars.value[idx]?.id !== dragState.dragging
}

function onDragStart(e: PointerEvent, startIdx: number) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const item = sortedPillars.value[startIdx]
  if (!item) return

  // 记录当前卡片尺寸用于幽灵
  const cardEl = (e.currentTarget as HTMLElement)
  const rect   = cardEl.getBoundingClientRect()
  dragOffsetX  = e.clientX - rect.left
  dragOffsetY  = e.clientY - rect.top

  // 激活拖拽状态
  dragState.dragging = item.id
  dragState.startIdx = startIdx
  dragState.overIdx  = null

  // 显示幽灵卡片（初始位置）
  ghost.w = rect.width
  ghost.h = rect.height
  ghost.x = rect.left
  ghost.y = rect.top
  // 微延迟让占位符先渲染，避免闪烁
  requestAnimationFrame(() => { ghost.visible = true })

  // 标记 hint 已触发
  if (!hintDismissed.value) {
    hintDismissed.value = true
    localStorage.setItem('pillars-hint-dismissed', '1')
  }

  function onMove(ev: PointerEvent) {
    // 更新幽灵位置
    ghost.x = ev.clientX - dragOffsetX
    ghost.y = ev.clientY - dragOffsetY

    // 计算落点：遍历占位 wrapper，找到鼠标 X 经过哪张牌的中线
    if (!pillarsRef.value) return
    const wrappers = Array.from(pillarsRef.value.querySelectorAll('.pillar-card-wrapper')) as HTMLElement[]
    let targetIdx: number | null = null
    for (let i = 0; i < wrappers.length; i++) {
      const r   = wrappers[i].getBoundingClientRect()
      const mid = r.left + r.width / 2
      if (ev.clientX < mid) { targetIdx = i; break }
    }
    if (targetIdx === null) targetIdx = wrappers.length - 1
    dragState.overIdx = targetIdx
  }

  function onEnd() {
    // 先隐藏幽灵，播落下动画
    ghost.visible = false

    const fromIdx = sortedPillars.value.findIndex(p => p.id === dragState.dragging)
    const toIdx   = dragState.overIdx

    if (fromIdx !== -1 && toIdx !== null && toIdx !== fromIdx) {
      const arr = [...sortedPillars.value]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      sortedPillars.value = arr
      saveOrder()
    }

    dragState.dragging = null
    dragState.overIdx  = null
    dragState.startIdx = -1

    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup',   onEnd)
    document.removeEventListener('pointercancel', onEnd)
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
/* ── 根布局 ── */
.home-root {
  position: relative;
  min-height: 100vh;
}
.home-content {
  position: relative;
  z-index: 1;
}

/* ── 滚动箭头 ── */
.scroll-arrow {
  animation: bounce-down 1.6s ease-in-out infinite;
}
@keyframes bounce-down {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50%       { transform: translateY(5px); opacity: 0.7; }
}

/* ══════════════════════════════════════
   Pillar 拖拽系统
══════════════════════════════════════ */

/* 拖拽中：全局光标 + 禁止文字选中 */
.pillars-section.is-dragging,
.pillars-section.is-dragging * {
  cursor: grabbing !important;
  user-select: none;
}

/* ── 卡片 wrapper（维持布局占位） ── */
.pillar-card-wrapper {
  position: relative;
}

/* ── 真实卡片 ── */
.pillar-card {
  touch-action: none;
  cursor: grab;
  box-shadow: 5px 5px 0 0 #1A1A1A;
  transition:
    box-shadow  0.18s ease,
    transform   0.18s ease,
    background  0.18s ease;
  will-change: transform, box-shadow;
}
.pillar-card:hover {
  box-shadow: 7px 7px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}
.pillar-card:hover .pillar-grip {
  opacity: 0.5 !important;
}
.pillar-card:active {
  box-shadow: 3px 3px 0 0 #1A1A1A;
  transform: translate(1px, 1px);
}

/* ── 落点目标卡片：整体缩进 + 左侧色条 ── */
.pillar-card--drop-target {
  transform: scale(0.97) translateX(6px) !important;
  box-shadow: 3px 3px 0 0 #1A1A1A !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

/* ── 落点箭头 ── */
.drop-arrow {
  position: absolute;
  top: 50%;
  left: -28px;
  transform: translateY(-50%) rotate(-90deg);
  animation: drop-arrow-pulse 0.7s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes drop-arrow-pulse {
  from { opacity: 0.4; transform: translateY(-50%) rotate(-90deg) translateX(0); }
  to   { opacity: 1;   transform: translateY(-50%) rotate(-90deg) translateX(-4px); }
}

/* ── 占位虚线框（拖拽时原位显示） ── */
.pillar-placeholder {
  height: 100%;
  min-height: 200px;
  border-radius: 0;
  animation: placeholder-breathe 1.4s ease-in-out infinite;
}
@keyframes placeholder-breathe {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 0.9; }
}

/* ── Grip 手柄（默认半透明，hover 变深） ── */
.pillar-grip {
  opacity: 0.18;
  transition: opacity 0.2s ease;
}

/* ── 图标容器 ── */
.pillar-icon {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pillar-card:hover .pillar-icon {
  transform: rotate(-4deg) scale(1.08);
}

/* ── 幽灵卡片（body 级，跟随鼠标） ── */
:global(.pillar-ghost) {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 12px 12px 0 0 #1A1A1A;
  transform: rotate(2deg) scale(1.04);
  opacity: 0.92;
  animation: ghost-lift 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: left, top;
  /* 允许幽灵跟随鼠标时不被 transition 拖慢——位置用 JS 直接写，只动画入场 */
}
@keyframes ghost-lift {
  from {
    transform: rotate(0deg) scale(1);
    box-shadow: 5px 5px 0 0 #1A1A1A;
    opacity: 1;
  }
  to {
    transform: rotate(2deg) scale(1.04);
    box-shadow: 12px 12px 0 0 #1A1A1A;
    opacity: 0.92;
  }
}

/* ── Hint bar：引导动效 ── */
.pillar-hint-icon {
  display: flex;
  align-items: center;
}
.pillar-hint-icon.hint-idle {
  animation: hint-wiggle 2.4s ease-in-out 1.2s infinite;
}
@keyframes hint-wiggle {
  0%,  40%, 100% { transform: translateX(0); }
  10%            { transform: translateX(5px); }
  20%            { transform: translateX(-3px); }
  30%            { transform: translateX(3px); }
}

/* ── 顺序指示点 ── */
.pillar-order-dot {
  width: 8px;
  height: 8px;
  transition: transform 0.3s ease, background 0.3s ease;
}
.pillar-order-dot:hover {
  transform: scale(1.4);
}

/* ── 首张卡片首次引导轻抖（只在未 dismiss 时） ── */
.pillar-card--idle-hint {
  animation: card-nudge 3s ease-in-out 2s 2;
}
@keyframes card-nudge {
  0%, 100%  { transform: translate(0, 0) rotate(0deg); box-shadow: 5px 5px 0 0 #1A1A1A; }
  20%       { transform: translate(-3px, -2px) rotate(-0.8deg); box-shadow: 8px 8px 0 0 #1A1A1A; }
  40%       { transform: translate(2px, -3px) rotate(0.5deg); box-shadow: 6px 7px 0 0 #1A1A1A; }
  60%       { transform: translate(-2px, -2px) rotate(-0.4deg); box-shadow: 7px 8px 0 0 #1A1A1A; }
  80%       { transform: translate(0, -1px); box-shadow: 6px 6px 0 0 #1A1A1A; }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .drop-arrow {
    top: -28px;
    left: 50%;
    transform: translateX(-50%) rotate(0deg);
  }
  @keyframes drop-arrow-pulse {
    from { opacity: 0.4; transform: translateX(-50%) rotate(0deg) translateY(0); }
    to   { opacity: 1;   transform: translateX(-50%) rotate(0deg) translateY(-4px); }
  }
}
</style>
