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
      <!-- cover 优先；失败后自动换 gallery 随机图（seed=project.id，与 SlideOver 一致） -->
      <img
        :src="coverSrc"
        :alt="project.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        @error="onCoverError"
      />

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
import { galleryFallbackRotating } from '@/utils/cloudinaryFallbackPool'

const props = defineProps<{ project: Project }>()
defineEmits<{ (e: 'open', p: Project): void }>()

// ── 封面图 ──────────────────────────────────────────────────────
// 优先使用 cover；cover 缺失或失败时用全局轮换图（每 8s 自动切换）
// galleryFallbackRotating 依赖全局 coverRotateIndex（reactive），
// computed 自动追踪 → Card 与 SlideOver 在同一轮换周期内保持同一张
const coverFailed = ref(false)

const coverSrc = computed(() => {
  if (!coverFailed.value && props.project.cover) return props.project.cover
  return galleryFallbackRotating(props.project.id)
})
function onCoverError() { coverFailed.value = true }

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
