<template>
  <!-- ════════════════════════════════════════════
       游戏卡片 — Memphis Brutalist 风格 (v7.5)
       - 封面加载失败时：随机 Memphis 彩色占位图（SVG 图案 + 色块）
       - 边框 3px + 硬阴影强制保留
  ════════════════════════════════════════════ -->
  <div
    class="card-root border-[3px] border-ink bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]
           hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
           transition-all duration-150 group cursor-pointer overflow-hidden"
    @click="$emit('click', game)"
  >
    <!-- ─── Cover 区域 ─── -->
    <div class="relative h-48 overflow-hidden border-b-[3px] border-ink">

      <!-- 正常封面图 -->
      <img
        v-if="!imgFailed"
        :src="game.coverUrl || fallbackCloudUrl"
        :alt="game.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        @error="handleImageError"
      />

      <!-- ── 云端备用图（加载失败时随机替换为已上传的云端封面）── -->
      <img
        v-else
        :src="fallbackCloudUrl"
        :alt="game.title + ' - fallback'"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        @error="handleFallbackError"
      />

      <!-- ── 最终兜底：仅当云端备用图也失败时显示 ── -->
      <div
        v-if="bothFailed"
        class="absolute inset-0 cover-fallback w-full h-full flex items-center justify-center"
        :style="{ background: fallbackBg }"
        aria-label="Image unavailable"
      >
        <span
          class="font-mono text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5
                 border-[2px] border-ink bg-warm-white/90 shadow-[2px_2px_0_0_#1A1A1A]"
        >NO IMAGE</span>
      </div>

      <!-- Platform Badge -->
      <span
        class="absolute top-2 right-2 font-mono text-[8px] font-bold px-1.5 py-0.5
               border border-warm-white/30 uppercase tracking-wider z-10"
        :style="{ background: game.accentColor, color: '#1A1A1A' }"
      >{{ game.platform }}</span>

      <!-- PM Insight Indicator -->
      <span
        v-if="game.reviewMarkdown"
        class="absolute bottom-2 left-2 font-mono text-[8px] font-bold px-2 py-0.5
               bg-pastel-yellow border border-ink text-ink uppercase tracking-wider z-10"
      >PM INSIGHT</span>
    </div>

    <!-- ─── 卡片内容区 ─── -->
    <div class="p-4 flex flex-col">
      <h3 class="font-display font-bold text-base leading-tight mb-1 line-clamp-1">
        {{ locale === 'en' ? game.titleEn : game.title }}
      </h3>

      <!-- Tags -->
      <div class="flex flex-wrap gap-1 mb-3">
        <span
          v-for="tag in (game.tags ?? []).slice(0, 3)"
          :key="tag"
          class="font-mono text-[7px] font-bold px-1.5 py-0.5 border border-ink/20 uppercase tracking-wider"
          :style="{ background: game.accentColor + '18', color: game.accentColor }"
        >{{ tag }}</span>
      </div>

      <!-- Stats 数据块 -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <div
          v-for="(val, key) in game.stats"
          :key="key"
          class="flex flex-col gap-0.5 relative pl-2"
        >
          <span
            class="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
            :style="{ background: game.accentColor + '88' }"
          ></span>
          <span class="font-mono text-[7.5px] text-ink/35 uppercase leading-tight tracking-wide truncate">
            {{ key }}
          </span>
          <span
            class="font-display font-bold text-[11px] leading-tight truncate"
            :style="{ color: game.accentColor }"
          >{{ (val as string).split(/\s*[/|]\s*/)[0] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

// ── 类型 ────────────────────────────────────────────────────────────────────
interface LocalGame {
  id: string
  platform: string
  title: string
  titleEn: string
  nickname: string
  uid: string
  level: string
  levelEn: string
  playtime: string
  playtimeEn: string
  estimatedHours: number
  coverUrl: string
  accentColor: string
  stats: Record<string, string>
  tags: string[]
  reviewMarkdown: string
  reviewSummary: string
}

const props = defineProps<{ game: LocalGame }>()
defineEmits<{ click: [game: LocalGame] }>()

const { locale } = useI18n()

// ── 云端备用图 URL 池（已上传至 Cloudinary 的封面，加载失败时随机替换）──────
const CLOUD_FALLBACK_URLS = [
  'https://res.cloudinary.com/dvt7tc1z2/image/upload/v1776961284/portfolio/games/zzz.jpg',
  'https://res.cloudinary.com/dvt7tc1z2/image/upload/v1776961280/portfolio/games/bh3.png',
  'https://res.cloudinary.com/dvt7tc1z2/image/upload/v1776961283/portfolio/games/ww.jpg',
  'https://res.cloudinary.com/dvt7tc1z2/image/upload/v1776961281/portfolio/games/hsr.png',
]

/** 用 game.id 的字符编码总和生成确定性"随机"索引 */
function hashId(id: string): number {
  return Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

// ── 图片容错状态 ─────────────────────────────────────────────────────────────
const imgFailed = ref(false)   // 原始图失败
const bothFailed = ref(false)  // 云端备用图也失败

/**
 * 原始封面加载失败 → 切换到云端备用图（从 URL 池中随机选一张，排除自身 URL）
 */
function handleImageError() {
  imgFailed.value = true
}

/**
 * 云端备用图也加载失败 → 显示最终兜底色块
 */
function handleFallbackError() {
  bothFailed.value = true
}

/**
 * 确定性随机选取备用 URL：排除与原始 coverUrl 相同的项，保证替换有效
 */
const fallbackCloudUrl = computed(() => {
  const pool = CLOUD_FALLBACK_URLS.filter(u => u !== props.game.coverUrl)
  const candidates = pool.length > 0 ? pool : CLOUD_FALLBACK_URLS
  const idx = hashId(props.game.id) % candidates.length
  return candidates[idx]
})

// ── 最终兜底背景色（仅 bothFailed 时使用）────────────────────────────────────
const FALLBACK_COLORS = ['#FFD600', '#2979FF', '#FF6B6B', '#00E5A0', '#C77DFF', '#1A1A1A']
const fallbackBg = computed(() => FALLBACK_COLORS[hashId(props.game.id) % FALLBACK_COLORS.length])
</script>

<style scoped>
/* 占位层内阴影，增强层次感 */
.cover-fallback {
  box-shadow: inset 0 0 0 3px #1A1A1A;
}

/* 图片加载失败后卡片保持完整的硬阴影（父层已定义，无需重声明） */
.card-root {
  /* 确保阴影由父层 Tailwind 类管理，此处只做 will-change 优化 */
  will-change: transform, box-shadow;
}
</style>
