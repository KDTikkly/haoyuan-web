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
    <MemphisGameBg ref="bgRef" />

    <!-- ② 前景内容（正常文档流，z-index 自动 > -1） -->
    <div class="home-content relative">

      <HeroSection />

      <!-- Quick intro pillars -->
      <section class="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-3 gap-6 border-t-[3px] border-ink">
        <div
          v-for="item in pillars"
          :key="item.labelKey"
          class="
            p-8 border-[3px] border-ink bg-warm-beige/90 backdrop-blur-[2px]
            shadow-[5px_5px_0_0_#1A1A1A]
            hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
            transition-[transform,box-shadow] duration-150
          "
        >
          <div
            class="w-10 h-10 mb-4 flex items-center justify-center border-2 border-ink font-bold text-lg"
            :style="{ background: item.color }"
          >{{ item.icon }}</div>
          <h3 class="font-display font-extrabold text-xl mb-2">{{ $t(item.labelKey) }}</h3>
          <p class="text-sm text-ink/60 leading-relaxed">{{ $t(item.descKey) }}</p>
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

      <!-- Hint: click the shapes -->
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span class="font-mono text-[10px] text-ink/30 uppercase tracking-widest">
          {{ locale === 'en' ? '← click the shapes →' : '← 点击几何体 →' }}
        </span>
      </div>

      <ProjectSlideOver :project="activeProject" :visible="!!activeProject" @close="activeProject = null" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HeroSection from '@/components/HeroSection.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import ProjectSlideOver from '@/components/ProjectSlideOver.vue'
import MemphisGameBg from '@/components/MemphisGameBg.vue'
import { fetchProjects } from '@/api/projectService'

const { locale } = useI18n()

const bgRef = ref(null)
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

const pillars = [
  { icon: '◈', color: '#FFD600', labelKey: 'pillars.game_label', descKey: 'pillars.game_desc' },
  { icon: '◉', color: '#2979FF', labelKey: 'pillars.ai_label',   descKey: 'pillars.ai_desc'   },
  { icon: '◆', color: '#FF6B6B', labelKey: 'pillars.biz_label',  descKey: 'pillars.biz_desc'  },
]

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
</style>
