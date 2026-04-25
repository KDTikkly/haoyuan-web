<template>
  <!--
    ProjectCard.vue — 孟菲斯极简卡片
    核心视觉：黑色粗描边 + Hard offset shadow（硬偏移阴影）
    Hover 状态：阴影收缩（物理按下感） + SVG 角括号线绘动画
  -->
  <article
    ref="cardRef"
    class="
      group relative cursor-pointer select-none
      bg-warm-beige
      border-[3px] border-ink
      transition-[transform,box-shadow] duration-150 ease-out
      shadow-hard
      hover:shadow-hard-sm
      hover:translate-x-[3px] hover:translate-y-[3px]
      active:shadow-none active:translate-x-[5px] active:translate-y-[5px]
    "
    @click="$emit('open', project)"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <!-- ── 封面区 ─────────────────────────────────────────────────── -->
    <div class="relative aspect-[16/9] overflow-hidden border-b-[3px] border-ink">
      <!-- cover → gallery fallback → Memphis 色块兜底 -->
      <img
        v-if="!bothFailed"
        :src="coverSrc"
        :alt="project.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        @error="onCoverError"
      />
      <!-- 最终兜底：Memphis 色块 -->
      <div
        v-else
        class="w-full h-full flex items-center justify-center border-b-[3px] border-ink"
        :style="{ background: accentColor }"
      >
        <span class="font-mono text-xs font-bold text-ink/60 uppercase tracking-widest">
          {{ project.tags[0] ?? 'PROJECT' }}
        </span>
      </div>

      <!-- Featured badge -->
      <span
        v-if="project.featured"
        class="
          absolute top-3 left-3
          px-2 py-0.5
          font-mono text-[11px] font-bold tracking-widest uppercase
          border-2 border-ink
          bg-memphis-yellow text-ink
        "
      >★ FEATURED</span>

      <!-- 右上角 accent 色块装饰 -->
      <div
        class="absolute top-0 right-0 w-8 h-8 border-b-[3px] border-l-[3px] border-ink"
        :style="{ backgroundColor: accentColor }"
      />
    </div>

    <!-- ── 卡片主体 ────────────────────────────────────────────────── -->
    <div class="p-5">
      <!-- Tags -->
      <div class="flex flex-wrap gap-2 mb-3">
        <span
          v-for="tag in project.tags"
          :key="tag"
          class="
            inline-flex items-center
            px-2.5 py-0.5
            font-mono text-[11px] font-bold tracking-wide
            border-2 border-ink
          "
          :style="{ backgroundColor: tagColor(tag) }"
        >{{ tag }}</span>
      </div>

      <!-- 标题 / 副标题 -->
      <h3 class="font-display font-extrabold text-lg leading-tight text-ink mb-1 line-clamp-2">
        {{ project.title }}
      </h3>
      <p class="font-mono text-xs text-ink/60 mb-3 tracking-wide">
        {{ project.subtitle }}
      </p>

      <!-- 描述 -->
      <p class="text-sm text-ink/70 leading-relaxed line-clamp-3 mb-5">
        {{ project.description }}
      </p>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t-2 border-ink pt-3">
        <span class="font-mono text-xs text-ink/50">{{ project.date }}</span>

        <!-- 箭头按钮 — 有独立的硬阴影 -->
        <span
          class="
            w-8 h-8 flex items-center justify-center
            border-2 border-ink font-bold text-sm
            shadow-[2px_2px_0_0_#1A1A1A]
            transition-[transform,box-shadow] duration-150
            group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px]
          "
          :style="{ backgroundColor: accentColor }"
        >→</span>
      </div>
    </div>

    <!-- ── SVG hover 角括号装饰（GSAP 线绘动画） ────────────────────── -->
    <svg
      ref="svgDecor"
      class="pointer-events-none absolute inset-0 w-full h-full opacity-0 overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <!-- 左上角括号 -->
      <polyline
        ref="lineTL"
        points="0,28 0,0 28,0"
        stroke="#1A1A1A"
        stroke-width="3"
        fill="none"
        stroke-linecap="square"
      />
      <!-- 右下角括号 -->
      <polyline
        ref="lineBR"
        :points="`${W},${H - 28} ${W},${H} ${W - 28},${H}`"
        stroke="#1A1A1A"
        stroke-width="3"
        fill="none"
        stroke-linecap="square"
      />
    </svg>
  </article>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { gsap } from 'gsap'

import type { Project } from '@/types/project'
import { galleryFallbackRotating, coverRotateIndex, GALLERY_URLS } from '@/utils/cloudinaryFallbackPool'

const props = defineProps<{ project: Project }>()
defineEmits<{ (e: 'open', p: Project): void }>()

// ── 封面图（定时轮换） ────────────────────────────────────────────
// 构建每个项目专属的小轮换池：project.cover（若有）+ 2 张 gallery 图
// 随 coverRotateIndex 定时切换，实现刷新/每 8s 轮换效果
const rotatePool = computed<string[]>(() => {
  const hash = Array.from(props.project.id).reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  // 从 gallery 取 2 张与本项目 id 相关的图（不同偏移量，避免重复）
  const g1 = GALLERY_URLS[(hash) % GALLERY_URLS.length]
  const g2 = GALLERY_URLS[(hash + 7) % GALLERY_URLS.length]
  const g3 = GALLERY_URLS[(hash + 17) % GALLERY_URLS.length]
  const pool: string[] = []
  if (props.project.cover) pool.push(props.project.cover)
  pool.push(g1, g2, g3)
  return pool
})

const imgError = ref(false)
const imgSrc = computed(() => {
  const pool = rotatePool.value
  // coverRotateIndex 驱动轮换；imgError 时跳过当前图
  const base = Array.from(props.project.id).reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  const idx = (base + coverRotateIndex.value) % pool.length
  return pool[idx]
})

// imgError 时强制到下一张
const coverSrc = computed(() => {
  if (!imgError.value) return imgSrc.value
  const pool = rotatePool.value
  const base = Array.from(props.project.id).reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  // 跳过当前失败的图
  const failedIdx = (base + coverRotateIndex.value) % pool.length
  return pool[(failedIdx + 1) % pool.length]
})
const bothFailed = ref(false)

function onCoverError() {
  if (!imgError.value) {
    imgError.value = true
  } else {
    bothFailed.value = true
  }
}

// 轮换时重置 error 状态（新图可能有效）
computed(() => coverRotateIndex.value) // 追踪依赖
import { watch } from 'vue'
watch(coverRotateIndex, () => {
  imgError.value = false
  bothFailed.value = false
})

// ── 尺寸（用于 SVG 角括号坐标） ──────────────────────────────────
const W = ref(0)
const H = ref(0)
const cardRef  = ref<HTMLElement | null>(null)
const svgDecor = ref<SVGElement | null>(null)
const lineTL   = ref<SVGPolylineElement | null>(null)
const lineBR   = ref<SVGPolylineElement | null>(null)

onMounted(() => {
  if (!cardRef.value) return
  const ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    W.value = width
    H.value = height
  })
  ro.observe(cardRef.value)
})

// ── 颜色映射 ─────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  'Web3':                '#C084FC', // 孟菲斯紫
  'AI':                  '#60A5FA', // 电光蓝
  'Game Teardown':       '#FCD34D', // 明黄
  'Data & Biz Analysis': '#34D399', // 薄荷绿
  'Operations':          '#F87171', // 珊瑚粉
  'AIGC':                '#FB7185', // 玫瑰粉
  'WebGL2':              '#FFD600', // 孟菲斯亮黄 — Chaldeas 主色
  'FSR/CAS':             '#00E676', // 超分亮绿 — 与控制台色系对齐
  'Ray Marching':        '#FF6B35', // 工业橙红 — 光线步进能量色
}

function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? '#FAF8F5'
}

const accentColor = computed(
  () => TAG_COLORS[props.project.tags[0]] ?? '#FCD34D'
)

// ── GSAP hover 动画 ──────────────────────────────────────────────
function animateLine(el: SVGPolylineElement | null) {
  if (!el) return
  const len = el.getTotalLength?.() ?? 56
  gsap.fromTo(el,
    { strokeDasharray: len, strokeDashoffset: len },
    { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }
  )
}

function onEnter() {
  if (!svgDecor.value) return
  gsap.to(svgDecor.value, { opacity: 1, duration: 0.1 })
  animateLine(lineTL.value)
  animateLine(lineBR.value)
}

function onLeave() {
  if (!svgDecor.value) return
  gsap.to(svgDecor.value, { opacity: 0, duration: 0.2 })
}
</script>
