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
         CHALDEAS SIMULATION — SuperResEngine
         项目界面专属：迦勒底亚斯超分辨率晶体渲染管线
         孟菲斯风格容器：3px 黑边 + 半透明网格背景
         仅在 ProjectsView 挂载，离开时完全销毁 WebGL 上下文
    ════════════════════════════════════════════ -->
    <div
      ref="zkPhysicsContainerRef"
      class="zk-physics-viewport"
      :style="{
        '--zkp-zoom': zoomLevel,
        height: Math.round(200 + Math.max(0, zoomLevel - 1.0) * 120) + 'px',
      }"
    >
      <!-- 标签行浮于 WebGL canvas 之上 -->
      <div class="zkp-label-row">
        <span class="zkp-badge">⬡ CHALDEAS SIMULATION</span>
        <span class="zkp-hint">{{ locale === 'en' ? 'CHALDEAS SUPER-RES · CRYSTAL OPTICS' : '迦勒底亚斯超分模拟 · 晶体光学验证' }}</span>
      </div>

      <!-- ── HUD LAYER: 2D/3D 界面边界统治层 ────────────────────────────
           四角物理对齐标记 — 3px 纯黑实线段，无防锯齿硬边缘
           原理：WebGL内部三维硬线条与外部CSS二维重型边框完美嵌套
      ──────────────────────────────────────────────────────────────── -->
      <!-- 四角标记 — Top-Left -->
      <div class="zkp-corner zkp-corner-tl" aria-hidden="true">
        <div class="zkp-corner-h"></div>
        <div class="zkp-corner-v"></div>
      </div>
      <!-- Top-Right -->
      <div class="zkp-corner zkp-corner-tr" aria-hidden="true">
        <div class="zkp-corner-h"></div>
        <div class="zkp-corner-v"></div>
      </div>
      <!-- Bottom-Left -->
      <div class="zkp-corner zkp-corner-bl" aria-hidden="true">
        <div class="zkp-corner-h"></div>
        <div class="zkp-corner-v"></div>
      </div>
      <!-- Bottom-Right -->
      <div class="zkp-corner zkp-corner-br" aria-hidden="true">
        <div class="zkp-corner-h"></div>
        <div class="zkp-corner-v"></div>
      </div>

      <!-- ── 坐标数据框 — 右上角 ─────────────────────────────────────────
           背景: 孟菲斯亮青 (#00E5FF) | 边框: 3px 纯黑
           字体: JetBrains Mono 等宽 | 硬阴影: 3px 无防锯齿
      ──────────────────────────────────────────────────────────────── -->
      <div class="zkp-hud-coords" aria-hidden="true">
        <div class="zkp-hud-coords-row"><span class="zkp-hud-label">SYS</span><span class="zkp-hud-val">CHALDEAS-Ω3</span></div>
        <div class="zkp-hud-coords-row"><span class="zkp-hud-label">RA</span><span class="zkp-hud-val zkp-hud-blink">{{ hudCoords.ra }}</span></div>
        <div class="zkp-hud-coords-row"><span class="zkp-hud-label">DEC</span><span class="zkp-hud-val zkp-hud-blink">{{ hudCoords.dec }}</span></div>
        <div class="zkp-hud-coords-row"><span class="zkp-hud-label">R</span><span class="zkp-hud-val">{{ hudCoords.r }}AU</span></div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           右下角控制堆栈 — 垂直隔离布局（绝对定位）
           z-index: 9999 — 完全压制所有 WebGL / 2D 底层元素
           堆叠顺序（从上到下）：
             ① zkp-zoom-control   — ZOOM 滑块（野兽派机械压块）
             ② 6px 纯白强制隔离带（zkp-stack-divider）
             ③ zkp-tier-selector  — SR 超分档位下拉菜单
      ══════════════════════════════════════════════════════════════ -->
      <div class="zkp-control-stack">

        <!-- ① ZOOM RANGE SLIDER — 野兽派物理缩放控制器 ──────────────────
             容器：纯黑背景 + 3px纯黑硬边框 + 6px深层阴影
             严禁圆角、半透明、任何白色软弱背景
             滑轨：纯白底色 + 3px纯黑硬边框
             滑块：16×16px 纯黑实心方块，无圆角
        ──────────────────────────────────────────────────────────── -->
        <div class="zkp-zoom-control">
          <span class="zkp-zoom-label">ZOOM</span>
          <input
            type="range"
            class="zkp-zoom-slider"
            min="0.5"
            max="5.0"
            step="0.01"
            :value="zoomLevel"
            @input="handleZoomChange"
            aria-label="Viewport zoom control"
          />
          <span class="zkp-zoom-value">{{ zoomLevel.toFixed(2) }}×</span>
        </div>

        <!-- ② 6px 纯白强制隔离带 ─────────────────────────────────────── -->
        <div class="zkp-stack-divider" aria-hidden="true"></div>

        <!-- ③ SR TIER 多档位下拉菜单 ────────────────────────────────────
             孟菲斯野兽派规范：3px纯黑边框 + 亮绿背景 + 6px纯黑硬阴影
             选项列表：瞬间弹出硬块，严禁淡入淡出动画
             悬停效果：背景翻转为纯黑，文字翻转为亮绿（零过渡）
        ──────────────────────────────────────────────────────────── -->
        <div class="zkp-tier-selector" :class="{ 'zkp-tier-open': tierMenuOpen }">
          <!-- 触发按钮 -->
          <button
            class="zkp-tier-btn"
            @click="tierMenuOpen = !tierMenuOpen"
            aria-label="Select super-resolution tier"
          >
            <span class="zkp-tier-label">{{ activeTier.label }}</span>
            <span class="zkp-tier-arrow" :class="{ 'zkp-tier-arrow-up': tierMenuOpen }">▼</span>
          </button>
          <!-- 选项列表 — 瞬间弹出，严禁动画 -->
          <ul v-if="tierMenuOpen" class="zkp-tier-list">
            <li
              v-for="tier in SR_TIERS"
              :key="tier.id"
              class="zkp-tier-item"
              :class="{ 'zkp-tier-item-active': activeTier.id === tier.id }"
              @click="selectTier(tier)"
            >{{ tier.label }}</li>
          </ul>
        </div>

      </div><!-- /zkp-control-stack -->
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
import { fetchProjects, FEATURED_CHANGED_EVENT } from '@/api/projectService'
import type { Project } from '@/types/project'
import { SuperResEngine } from '@/utils/SuperResEngine.js'

const { locale } = useI18n()

// ════════════════════════════════════════════
//  HUD 坐标数据 — 模拟轨道测量仪器实时跳变
//  RA/DEC 每帧微扰动，模拟天球坐标系实时采样
// ════════════════════════════════════════════
function _fmtCoord(v: number, digits = 4) {
  return v.toFixed(digits).padStart(8, '0')
}
const hudCoords = ref({ ra: '000.0000', dec: '+00.0000', r: '2.8000' })
let _hudTimer: ReturnType<typeof setInterval> | null = null

function _startHudJitter() {
  // Seed values derived from current timestamp for uniqueness per mount
  let raBase  = 186.0 + Math.random() * 4.0
  let decBase = -14.0 + Math.random() * 2.0
  let rBase   = 2.78 + Math.random() * 0.05
  _hudTimer = setInterval(() => {
    // Tiny random drift — simulates live telemetry noise
    raBase  += (Math.random() - 0.5) * 0.003
    decBase += (Math.random() - 0.5) * 0.002
    rBase   += (Math.random() - 0.5) * 0.0004
    hudCoords.value = {
      ra:  _fmtCoord(((raBase % 360) + 360) % 360, 4),
      dec: (decBase >= 0 ? '+' : '-') + _fmtCoord(Math.abs(decBase), 4),
      r:   _fmtCoord(Math.max(rBase, 2.5), 4),
    }
  }, 120)  // ~8Hz jitter — fast enough to feel live, not too distracting
}

function _stopHudJitter() {
  if (_hudTimer !== null) { clearInterval(_hudTimer); _hudTimer = null }
}

// ════════════════════════════════════════════
//  CHALDEAS SIMULATION — SuperResEngine
//  领域隔离：仅在 ProjectsView 生命周期内存活
//  onUnmounted 时调用 engine.destroy() 彻底释放 WebGL 上下文
// ════════════════════════════════════════════
const zkPhysicsContainerRef = ref<HTMLElement | null>(null)
let   zkPhysicsEngine: SuperResEngine | null = null

// ════════════════════════════════════════════
//  SR TIER — 超分辨率档位多选控制器
//  四档精确控制，从马赛克废墟到极致工业清晰
// ════════════════════════════════════════════
const SR_TIERS = [
  { id: 'RAW',         label: '■ RAW        0.1×  马赛克废墟' },
  { id: 'PERFORMANCE', label: '◆ PERFORMANCE 0.25× 基础锐化'  },
  { id: 'BALANCED',    label: '◈ BALANCED   0.5×  CAS 锐化'  },
  { id: 'ULTRA',       label: '★ ULTRA CLEAR 1.0× 高频注入'  },
]

// ════════════════════════════════════════════
//  ZOOM LEVEL — 物理缩放控制器
//  范围：0.5× ~ 2.0×，步进 0.01
//  绑定到 SuperResEngine.setZoom()
// ════════════════════════════════════════════
const zoomLevel = ref(1.0)

function handleZoomChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newZoom = parseFloat(target.value)
  zoomLevel.value = newZoom
  if (zkPhysicsEngine) {
    zkPhysicsEngine.setZoom(newZoom)
  }
}

// ── Ctrl+Wheel 滚轮劫持 ─────────────────────────────────────
// 必须通过原生 addEventListener + { passive: false } 注册
// Vue 的 @wheel 指令默认 passive=true，无法拦截浏览器原生缩放
function _onCtrlWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  // deltaY > 0 向下滚 → 缩小；deltaY < 0 向上滚 → 放大
  // 乘以 0.001 实现极其平滑的步进
  const delta = -e.deltaY * 0.001
  const next = Math.min(5.0, Math.max(0.5, zoomLevel.value + delta))
  zoomLevel.value = parseFloat(next.toFixed(3))
  if (zkPhysicsEngine) {
    zkPhysicsEngine.setZoom(zoomLevel.value)
  }
}

const activeTier   = ref(SR_TIERS[0])   // 初始：RAW（马赛克废墟）
const tierMenuOpen = ref(false)

function selectTier(tier: typeof SR_TIERS[0]) {
  activeTier.value   = tier
  tierMenuOpen.value = false
  zkPhysicsEngine?.setResolutionTier(tier.id)
}

function mountZkPhysicsEngine() {
  if (!zkPhysicsContainerRef.value || zkPhysicsEngine) return
  try {
    zkPhysicsEngine = new SuperResEngine(zkPhysicsContainerRef.value)
    zkPhysicsEngine.mount()
    // Expose engine instance to window for console debugging
    // Usage: window._superResEngine.setZoom(1.5)
    window._superResEngine = zkPhysicsEngine
    console.log('[SuperResEngine] Mounted. Console API: window._superResEngine.setZoom(0.5~2.0)')
  } catch (e) {
    console.warn('[ProjectsView] SuperResEngine mount failed:', e)
    zkPhysicsEngine = null
  }
}

function destroyZkPhysicsEngine() {
  if (zkPhysicsEngine) {
    zkPhysicsEngine.destroy()
    zkPhysicsEngine = null
    // Clean up window reference
    if (window._superResEngine) {
      delete window._superResEngine
    }
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
  window.addEventListener(FEATURED_CHANGED_EVENT, loadProjects)
  // CHALDEAS SIMULATION: await nextTick 保证容器 DOM 已撑开，再实例化引擎
  await nextTick()
  mountZkPhysicsEngine()
  _startHudJitter()
  // Ctrl+Wheel 滚轮劫持：必须在 nextTick 后，容器 DOM 存在时注册
  // { passive: false } 是关键 — 允许调用 preventDefault 拦截浏览器原生缩放
  if (zkPhysicsContainerRef.value) {
    zkPhysicsContainerRef.value.addEventListener('wheel', _onCtrlWheel as EventListener, { passive: false })
  }
})

onUnmounted(() => {
  // 彻底释放 WebGL 上下文，防止 Steam 界面内存泄漏与性能降级
  window.removeEventListener(FEATURED_CHANGED_EVENT, loadProjects)
  destroyZkPhysicsEngine()
  _stopHudJitter()
  // 移除 Ctrl+Wheel 监听器
  if (zkPhysicsContainerRef.value) {
    zkPhysicsContainerRef.value.removeEventListener('wheel', _onCtrlWheel as EventListener)
  }
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
   CHALDEAS SIMULATION Viewport — 项目界面专属
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
  /* 外框Y轴扩张：step过渡模拟机械结构阶跃应力 */
  transition: height 0.18s steps(3, end);
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

/* ════════════════════════════════════════════
   右下角控制堆栈容器 — 垂直隔离总承载体
   绝对定位：bottom:10px right:14px
   z-index: 9999 — 宇宙最高层级，压制所有底层
   内部采用 flex column，zoom 在上，tier 在下
   ════════════════════════════════════════════ */
.zkp-control-stack {
  position: absolute;
  bottom: 10px;
  right: 14px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;                   /* 间距由 zkp-stack-divider 精确控制 */
}

/* 6px 纯白强制隔离带 */
.zkp-stack-divider {
  width: 100%;
  height: 6px;
  background: #F5F2EC;      /* 与 viewport 背景色一致，形成硬切割 */
  flex-shrink: 0;
}

/* ── SR TIER 重型下拉菜单 — 孟菲斯野兽派控制器 ─────────────
   底座：亮绿背景 #00E676 + 3px纯黑边框 + 6px纯黑硬阴影
   选项列表：瞬间跳出硬块，严禁淡入淡出 (display切换，无transition)
   Hover翻转：纯黑背景 + 亮绿文字（零过渡，数字工业冷酷感）
   ──────────────────────────────────────────────────────── */
.zkp-tier-selector {
  /* 不再需要 position:absolute — 由父容器 zkp-control-stack 定位 */
  position: relative;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  user-select: none;
}

/* 触发按钮 */
.zkp-tier-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #00E676;
  color: #000000;
  border: 3px solid #000000;
  box-shadow: 6px 6px 0 0 #000000;
  padding: 5px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: none !important;
  animation: none !important;
}

/* 档位标签 */
.zkp-tier-label {
  flex: 1;
}

/* 三角箭头 — 纯黑，标识下拉方向 */
.zkp-tier-arrow {
  font-size: 7px;
  line-height: 1;
  color: #000000;
  transition: none !important;
}
.zkp-tier-arrow-up {
  transform: scaleY(-1);
}

/* 选项列表 — 瞬间弹出硬块，无动画 */
.zkp-tier-list {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 2px;
  list-style: none;
  padding: 0;
  margin-left: 0;
  background: #00E676;
  border: 3px solid #000000;
  box-shadow: 10px 10px 0 0 #000000;  /* 10px深阴影 — 比静止状态更深，强压底层网格 */
  box-shadow: 6px 6px 0 0 #000000;
  min-width: 220px;
  /* 零动画：display切换由v-if控制，此处无transition */
}

/* 单个选项 */
.zkp-tier-item {
  padding: 6px 10px;
  color: #000000;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 1px solid #00000030;
  /* 严禁 transition — 零延迟背景翻转 */
  transition: none !important;
}
.zkp-tier-item:last-child {
  border-bottom: none;
}

/* Hover：背景翻转纯黑，文字翻转亮绿 — 零延迟 */
.zkp-tier-item:hover {
  background: #000000;
  color: #00E676;
}

/* 当前激活档位：额外加粗标识 */
.zkp-tier-item-active {
  background: #1A1A1A;
  color: #00E676;
}
.zkp-tier-item-active:hover {
  background: #000000;
  color: #00E676;
}

/* bypass 状态：容器内部投影颜色切换（不触碰 border，仅改 box-shadow 颜色）
   — 3px solid #1A1A1A border 始终保持，孟菲斯黑边不受干扰 */
.zk-physics-viewport.zk-bypass {
  box-shadow: 6px 6px 0 0 #FFD600;
}

/* ════════════════════════════════════════════
   HUD LAYER — 二维/三维交界处统治力系统
   四角物理对齐标记：3px 纯黑，无防锯齿
   坐标数据框：孟菲斯亮青底 + 3px 纯黑边 + 硬阴影
   ════════════════════════════════════════════ */

/* ── 四角对齐标记通用基座 ──────────────────────────── */
.zkp-corner {
  position: absolute;
  width: 18px;
  height: 18px;
  z-index: 20;
  pointer-events: none;
}
/* 水平线段 */
.zkp-corner-h {
  position: absolute;
  height: 3px;
  width: 100%;
  background: #000000;
}
/* 垂直线段 */
.zkp-corner-v {
  position: absolute;
  width: 3px;
  height: 100%;
  background: #000000;
}

/* Top-Left */
.zkp-corner-tl { top: 8px; left: 8px; }
.zkp-corner-tl .zkp-corner-h { top: 0; left: 0; }
.zkp-corner-tl .zkp-corner-v { top: 0; left: 0; }

/* Top-Right */
.zkp-corner-tr { top: 8px; right: 8px; }
.zkp-corner-tr .zkp-corner-h { top: 0; right: 0; left: 0; }
.zkp-corner-tr .zkp-corner-v { top: 0; right: 0; left: auto; }

/* Bottom-Left */
.zkp-corner-bl { bottom: 8px; left: 8px; }
.zkp-corner-bl .zkp-corner-h { bottom: 0; top: auto; left: 0; }
.zkp-corner-bl .zkp-corner-v { bottom: 0; top: auto; left: 0; }

/* Bottom-Right */
.zkp-corner-br { bottom: 8px; right: 8px; }
.zkp-corner-br .zkp-corner-h { bottom: 0; top: auto; right: 0; left: 0; }
.zkp-corner-br .zkp-corner-v { bottom: 0; top: auto; right: 0; left: auto; }

/* ── 坐标数据框 ─────────────────────────────────────── */
.zkp-hud-coords {
  position: absolute;
  bottom: 20px;   /* 左下角 — 避开右侧控制堆栈，与左上标签形成视觉平衡 */
  left: 20px;
  z-index: 20;
  pointer-events: none;
  border: 3px solid #000000;          /* 野兽派硬边框 */
  box-shadow: 4px 4px 0 0 #000000;    /* 4px纯黑硬阴影 — 悬浮独立模块感 */
  background: #00E5FF;        /* 孟菲斯亮青 — 工业测量仪器色 */
  border: 3px solid #000000;
  /* 硬阴影：无任何模糊半径，纯黑偏移，零防锯齿 */
  box-shadow: 3px 3px 0 0 #000000;
  padding: 5px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 150px;
}

.zkp-hud-coords-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.zkp-hud-label {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: #000000;
  text-transform: uppercase;
  min-width: 22px;
  flex-shrink: 0;
}

.zkp-hud-val {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.10em;
  color: #000000;
  text-transform: uppercase;
  /* Tabular numbers — prevent jitter from shifting layout */
  font-variant-numeric: tabular-nums;
}

/* 跳动值：用 CSS animation 模拟快速闪烁替代感，辅助 JS 数据跳变 */
@keyframes zkp-val-flash {
  0%, 90%  { opacity: 1; }
  95%      { opacity: 0.55; }
  100%     { opacity: 1; }
}
.zkp-hud-blink {
  animation: zkp-val-flash 0.9s steps(1, end) infinite;
}

.cards-enter-from   { opacity: 0; transform: translateY(12px) scale(0.95); }
.cards-leave-to     { opacity: 0; transform: scale(0.95); }

/* ════════════════════════════════════════════
   ZOOM RANGE SLIDER — 孟菲斯野兽派物理控制器
   容器：纯黑背景 + 3px纯黑硬边框 + 6px深层阴影
   严禁：圆角、白色/半透明背景、任何软弱视觉
   独立悬浮机械压块——比静止状态更深的阴影
   ════════════════════════════════════════════ */

.zkp-zoom-control {
  /* 不再需要 position:absolute — 由父容器 zkp-control-stack 垂直堆叠 */
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  user-select: none;
  /* 背景：纯黑 — 杀死一切白色软弱感 */
  background: #000000;
  border: 3px solid #000000;
  /* 6px 深阴影 — 比下方 tier-selector 更深，形成压制关系 */
  box-shadow: 6px 6px 0 0 #000000, 0 0 0 2px #F5F2EC;
  padding: 6px 12px;
}

.zkp-zoom-label {
  color: #00E676;            /* 亮绿 — 与 tier-selector 主题色呼应 */
  flex-shrink: 0;
}

.zkp-zoom-value {
  color: #FFD600;            /* 孟菲斯亮黄 — 实时数值用警示色突出 */
  min-width: 42px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── RANGE INPUT 纯CSS重写 ────────────────────
   清除所有浏览器默认样式，强制野兽派外观
   ──────────────────────────────────────────── */
.zkp-zoom-slider {
  /* 尺寸控制 */
  width: 160px;
  height: 20px;

  /* 移除默认appearance */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* 背景透明 */
  background: transparent;

  /* 去除focus轮廓 */
  outline: none;
  border: none;

  /* 禁用系统样式 */
  cursor: pointer;
}

/* ── TRACK（滑轨）─ 纯白底 + 3px纯黑边框 ────── */
.zkp-zoom-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 10px;
  /* 纯白底色 */
  background: #FFFFFF;
  /* 3px 纯黑硬边框 */
  border: 3px solid #000000;
  /* 硬阴影：无模糊，零防锯齿 */
  box-shadow: 3px 3px 0 0 #000000;
  /* 正方形端点，无圆角 */
  border-radius: 0;
  /* 强制盒模型 */
  box-sizing: border-box;
}

.zkp-zoom-slider::-moz-range-track {
  width: 100%;
  height: 10px;
  background: #FFFFFF;
  border: 3px solid #000000;
  border-radius: 0;
  box-sizing: border-box;
}

/* Firefox 需要额外的moz-range-progress样式来填充已完成部分 */

/* ── THUMB（滑块）─ 16×16纯黑实心方块 ─────── */
.zkp-zoom-slider::-webkit-slider-thumb {
  /* 尺寸：16×16px 正方形，无圆角 */
  -webkit-appearance: none;
  width: 16px;
  height: 16px;

  /* 纯黑实心 */
  background: #000000;

  /* 无圆角 */
  border-radius: 0;

  /* 3px纯黑边框，与滑轨形成视觉连贯 */
  border: 3px solid #000000;

  /* 硬阴影：工业仪表冷峻感 */
  box-shadow: 4px 4px 0 0 #000000;

  /* 负边距使滑块与滑轨顶部对齐 */
  margin-top: -6px;

  /* 去除默认的点击高亮 */
  cursor: grab;
}

/* Firefox 滑块 */
.zkp-zoom-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #000000;
  border: 3px solid #000000;
  border-radius: 0;
  box-shadow: 4px 4px 0 0 #000000;
  cursor: grab;
}

/* 拖动时的抓取手型 */
.zkp-zoom-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  box-shadow: 2px 2px 0 0 #000000;
}

.zkp-zoom-slider::-moz-range-thumb:active {
  cursor: grabbing;
  box-shadow: 2px 2px 0 0 #000000;
}
</style>
