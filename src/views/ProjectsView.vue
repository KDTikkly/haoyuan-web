<template>
  <div class="max-w-6xl mx-auto px-6 py-16">

    <!-- ── Page Header ── -->
    <div class="mb-16 border-b-[3px] border-ink pb-8">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-blue text-warm-white">
        <span class="w-2 h-2 rounded-full bg-warm-white"></span>
        {{ $t('projects.badge') }}
      </div>
      <h1 class="font-display font-extrabold text-5xl mb-3">{{ $t('projects.title') }}</h1>
      <p class="font-mono text-sm text-ink/60 tracking-widest uppercase">
        {{ $t('projects.subtitle') }}
      </p>
    </div>

    <!-- ════════════════════════════════════════════
         ZK-PHYSICS LIVE — SuperResEngine
         项目界面专属：超分辨率晶体渲染管线验证
         孟菲斯风格容器：3px 黑边 + 半透明网格背景
         仅在 ProjectsView 挂载，离开时完全销毁 WebGL 上下文
    ════════════════════════════════════════════ -->
    <div
      ref="zkPhysicsContainerRef"
      class="zk-physics-viewport"
      :class="{ 'zk-bypass': casCompareActive }"
      aria-hidden="true"
      @mousedown.prevent="onCasCompareStart"
      @mouseup="onCasCompareEnd"
      @mouseleave="onCasCompareEnd"
      @touchstart.prevent="onCasCompareStart"
      @touchend="onCasCompareEnd"
    >
      <!-- 标签行浮于 WebGL canvas 之上 -->
      <div class="zkp-label-row">
        <span class="zkp-badge">⬡ ZK-PHYSICS LIVE</span>
        <span class="zkp-hint">{{ locale === 'en' ? 'CHALDEAS SUPER-RES · CRYSTAL OPTICS' : '迦勒底亚斯超分模拟 · 晶体光学验证' }}</span>
        <!-- CAS 状态角标：按住时变为 RAW，松开时显示 CAS ON -->
        <span class="zkp-cas-state" :class="{ 'zkp-cas-off': casCompareActive }">
          {{ casCompareActive
            ? (locale === 'en' ? '⬛ RAW 0.5×' : '⬛ 原始 0.5×')
            : (locale === 'en' ? '◈ CAS ON'   : '◈ 锐化开')
          }}
        </span>
      </div>
      <!-- 按住提示 — 仅在 CAS 激活状态下显示 -->
      <div v-if="!casCompareActive" class="zkp-press-hint">
        {{ locale === 'en' ? 'HOLD TO COMPARE' : '按住对比原图' }}
      </div>
    </div>

    <!-- ── Filter Pills + Sort Toggle ── -->
    <div class="flex flex-wrap items-center gap-3 mb-10">
      <button
        v-for="tag in allTags"
        :key="tag"
        class="
          px-4 py-1.5
          font-mono text-xs font-bold tracking-wide uppercase
          border-2 border-ink
          transition-[transform,box-shadow,background-color] duration-150
        "
        :class="activeTag === tag
          ? 'bg-ink text-warm-beige shadow-none translate-x-[3px] translate-y-[3px]'
          : 'bg-warm-beige text-ink shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'"
        @click="toggleTag(tag)"
      >{{ tag }}</button>

      <!-- Divider -->
      <span class="w-px h-5 bg-ink/20 hidden sm:block"></span>

      <!-- Sort toggle -->
      <button
        class="
          flex items-center gap-1.5
          px-4 py-1.5
          font-mono text-xs font-bold tracking-wide uppercase
          border-2 border-ink
          transition-[transform,box-shadow,background-color] duration-150
          shadow-[3px_3px_0_0_#1A1A1A]
          hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]
          active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
        "
        :class="sortByDate ? 'bg-memphis-yellow text-ink' : 'bg-warm-beige text-ink'"
        @click="sortByDate = !sortByDate"
      >
        <span>{{ sortByDate
          ? (locale === 'en' ? '↓ Newest First' : '↓ 最新优先')
          : (locale === 'en' ? 'Default Order' : '默认排序')
        }}</span>
      </button>
    </div>

    <!-- ── Loading Skeleton ── -->
    <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="n in 4"
        :key="n"
        class="border-[3px] border-ink shadow-[5px_5px_0_0_#1A1A1A] h-72 animate-pulse bg-warm-beige"
      />
    </div>

    <!-- ── Error ── -->
    <div v-else-if="error" class="py-16 text-center border-[3px] border-dashed border-ink">
      <p class="font-mono text-sm text-ink/60">⚠ {{ $t('projects.error') }}：{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 border-2 border-ink font-mono text-xs shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-[transform,box-shadow] duration-150"
        @click="loadProjects"
      >{{ $t('projects.retry') }}</button>
    </div>

    <!-- ── Grid ── -->
    <TransitionGroup
      v-else
      name="cards"
      tag="div"
      class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      <ProjectCard
        v-for="p in filtered"
        :key="p.id"
        :project="p"
        @open="activeProject = p"
      />
    </TransitionGroup>

    <!-- ── Empty State ── -->
    <div
      v-if="!loading && !error && filtered.length === 0"
      class="py-24 text-center border-[3px] border-dashed border-ink"
    >
      <p class="font-mono text-ink/60">No projects found for "{{ activeTag }}".</p>
    </div>

    <ProjectSlideOver
      :project="activeProject"
      :visible="!!activeProject"
      @close="activeProject = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectCard from '@/components/ProjectCard.vue'
import ProjectSlideOver from '@/components/ProjectSlideOver.vue'
import { fetchProjects } from '@/api/projectService'
import type { Project } from '@/types/project'
import { SuperResEngine } from '@/utils/SuperResEngine.js'

const { locale } = useI18n()

// ════════════════════════════════════════════
//  ZK-PHYSICS LIVE — SuperResEngine
//  领域隔离：仅在 ProjectsView 生命周期内存活
//  onUnmounted 时调用 engine.destroy() 彻底释放 WebGL 上下文
// ════════════════════════════════════════════
const zkPhysicsContainerRef = ref<HTMLElement | null>(null)
let   zkPhysicsEngine: SuperResEngine | null = null

// CAS 对比开关：按住 = bypass（raw 0.5×），松开 = CAS 锐化
const casCompareActive = ref(false)

function onCasCompareStart() {
  casCompareActive.value = true
  zkPhysicsEngine?.setCasEnabled(false)
}

function onCasCompareEnd() {
  if (!casCompareActive.value) return
  casCompareActive.value = false
  zkPhysicsEngine?.setCasEnabled(true)
}

function mountZkPhysicsEngine() {
  if (!zkPhysicsContainerRef.value || zkPhysicsEngine) return
  try {
    zkPhysicsEngine = new SuperResEngine(zkPhysicsContainerRef.value, { scale: 0.5 })
    zkPhysicsEngine.mount()
  } catch (e) {
    console.warn('[ProjectsView] SuperResEngine mount failed:', e)
    zkPhysicsEngine = null
  }
}

function destroyZkPhysicsEngine() {
  if (zkPhysicsEngine) {
    zkPhysicsEngine.destroy()
    zkPhysicsEngine = null
  }
}

const projects      = ref<Project[]>([])
const loading       = ref(true)
const error         = ref('')
const activeTag     = ref('All')
const activeProject = ref<Project | null>(null)
const sortByDate    = ref(false)

// Toggle：再次点击已激活的 tag 时回退到 All
function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? 'All' : tag
}

const allTags = computed(() => {
  const tags = new Set<string>(['All'])
  projects.value.forEach(p => p.tags.forEach(t => tags.add(t)))
  return [...tags]
})

const filtered = computed(() => {
  let list = activeTag.value === 'All'
    ? projects.value
    : projects.value.filter(p => p.tags.includes(activeTag.value))
  if (sortByDate.value) {
    list = [...list].sort((a, b) => {
      const da = (a as any).date ?? ''
      const db = (b as any).date ?? ''
      return db.localeCompare(da) // newest first
    })
  }
  return list
})

async function loadProjects() {
  loading.value = true
  error.value = ''
  try {
    projects.value = await fetchProjects()
  } catch (e: any) {
    error.value = e?.message ?? (locale.value === 'en' ? 'Unknown error' : '未知错误')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loadProjects()
  // ZK-PHYSICS: await nextTick 保证容器 DOM 已撑开，再实例化引擎
  await nextTick()
  mountZkPhysicsEngine()
})

onUnmounted(() => {
  // 彻底释放 WebGL 上下文，防止 Steam 界面内存泄漏与性能降级
  destroyZkPhysicsEngine()
})

// Re-fetch when locale changes
watch(locale, loadProjects)
</script>

<style scoped>
.cards-enter-active { transition: all 0.3s ease; }
.cards-leave-active { transition: all 0.2s ease; position: absolute; }
.cards-enter-from  { opacity: 0; transform: translateY(12px); }
.cards-leave-to    { opacity: 0; transform: translateY(-6px); }

/* ════════════════════════════════════════════
   ZK-PHYSICS LIVE Viewport — 项目界面专属
   孟菲斯美学对齐：3px 黑边 + 半透明网格背景
   Layer stack (bottom → top):
     [1] #F5F2EC warm-grey base
     [2] 20px repeating grid (10% dark)
     [3] ::before SVG grain (5%)
     [4] <canvas> WebGL — transparent crystal
     [5] .zkp-label-row text
   ════════════════════════════════════════════ */
.zk-physics-viewport {
  position: relative;
  height: 200px;
  overflow: hidden;
  margin-bottom: 2rem;          /* 与下方 Filter Pills 保持间距 */
  background-color: #F5F2EC;
  background-image:
    repeating-linear-gradient(0deg,   transparent, transparent 19px, rgba(30,25,20,0.10) 20px),
    repeating-linear-gradient(90deg,  transparent, transparent 19px, rgba(30,25,20,0.10) 20px);
  border: 3px solid #1A1A1A;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  user-select: none;
}

/* Grain overlay */
.zk-physics-viewport::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='64' height='64' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 64px 64px;
}

/* Label row — floats above WebGL canvas */
.zkp-label-row {
  position: absolute;
  top: 10px;
  left: 14px;
  right: 14px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.zkp-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #FFD600;
  background: #1A1A1A;
  padding: 3px 8px;
  border: 2px solid #a78bfa;
  text-transform: uppercase;
  flex-shrink: 0;
}

.zkp-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #1A1A1A60;
  text-transform: uppercase;
}

/* ── CAS 状态角标 ────────────────────────────────────────────
   默认（CAS ON）：紫色边框 + 绿色文字
   按住（RAW）：黄色背景 + 黑字，醒目提示未锐化状态
   注意：不修改 .zk-physics-viewport 的 border/box-shadow，
         3px 黑边由父容器独立持有，WebGL canvas 在 overflow:hidden
         内部，任何情况下都不会污染边框。
   ──────────────────────────────────────────────────────── */
.zkp-cas-state {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #00e676;
  background: #1A1A1A;
  padding: 3px 8px;
  border: 2px solid #00e676;
  text-transform: uppercase;
  flex-shrink: 0;
  margin-left: auto;
  transition: color 0.05s, border-color 0.05s, background 0.05s;
}

.zkp-cas-state.zkp-cas-off {
  color: #1A1A1A;
  background: #FFD600;
  border-color: #1A1A1A;
}

/* 按住对比提示 — 右下角浮标 */
.zkp-press-hint {
  position: absolute;
  bottom: 10px;
  right: 14px;
  z-index: 10;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: #1A1A1A40;
  text-transform: uppercase;
  pointer-events: none;
  user-select: none;
}

/* bypass 状态：容器内部投影颜色切换（不触碰 border，仅改 box-shadow 颜色）
   — 3px solid #1A1A1A border 始终保持，孟菲斯黑边不受干扰 */
.zk-physics-viewport.zk-bypass {
  box-shadow: 6px 6px 0 0 #FFD600;
}

.cards-enter-from   { opacity: 0; transform: translateY(12px) scale(0.95); }
.cards-leave-to     { opacity: 0; transform: scale(0.95); }
</style>
