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
        v-if="game.coverUrl && !imgFailed"
        :src="game.coverUrl"
        :alt="game.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        @error="handleImageError"
      />

      <!-- ── Memphis 随机占位层（加载失败 或 无 URL 时显示）── -->
      <div
        v-else
        class="cover-fallback w-full h-full relative overflow-hidden"
        :style="{ background: fallbackBg }"
        aria-label="Image unavailable"
      >
        <!-- 几何图案 SVG 层 -->
        <svg
          class="absolute inset-0 w-full h-full"
          viewBox="0 0 320 192"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <!-- 根据 patternSeed 选不同几何图形组合 -->

          <!-- 模式 0：散落方块 + 圆 -->
          <g v-if="patternSeed === 0">
            <rect x="20" y="18" width="40" height="40" :fill="shapeColor1" stroke="#1A1A1A" stroke-width="3"/>
            <circle cx="240" cy="50" r="36" :fill="shapeColor2" stroke="#1A1A1A" stroke-width="3"/>
            <rect x="180" y="120" width="80" height="32" :fill="shapeColor3" stroke="#1A1A1A" stroke-width="2.5"/>
            <polygon points="60,140 100,100 140,140" :fill="shapeColor1" stroke="#1A1A1A" stroke-width="2.5"/>
            <circle cx="290" cy="160" r="18" :fill="shapeColor2" stroke="#1A1A1A" stroke-width="2"/>
            <rect x="8" y="100" width="20" height="20" :fill="shapeColor3" stroke="#1A1A1A" stroke-width="2"/>
          </g>

          <!-- 模式 1：斜纹条 + 三角组合 -->
          <g v-else-if="patternSeed === 1">
            <polygon points="0,0 80,0 0,80" :fill="shapeColor1" stroke="#1A1A1A" stroke-width="3"/>
            <polygon points="320,0 320,96 224,0" :fill="shapeColor2" stroke="#1A1A1A" stroke-width="3"/>
            <rect x="110" y="60" width="100" height="6" :fill="shapeColor3" stroke="none"/>
            <rect x="110" y="78" width="100" height="6" :fill="shapeColor3" stroke="none"/>
            <rect x="110" y="96" width="100" height="6" :fill="shapeColor3" stroke="none"/>
            <circle cx="160" cy="148" r="30" :fill="shapeColor1" stroke="#1A1A1A" stroke-width="3"/>
            <polygon points="280,140 320,100 320,192 280,192" :fill="shapeColor2" stroke="#1A1A1A" stroke-width="2"/>
          </g>

          <!-- 模式 2：重叠圆圈 -->
          <g v-else-if="patternSeed === 2">
            <circle cx="80" cy="80" r="60" :fill="shapeColor1 + 'CC'" stroke="#1A1A1A" stroke-width="3"/>
            <circle cx="160" cy="100" r="55" :fill="shapeColor2 + 'CC'" stroke="#1A1A1A" stroke-width="3"/>
            <circle cx="240" cy="80" r="50" :fill="shapeColor3 + 'CC'" stroke="#1A1A1A" stroke-width="3"/>
            <rect x="0" y="158" width="320" height="34" :fill="shapeColor1" stroke="#1A1A1A" stroke-width="2.5"/>
          </g>

          <!-- 模式 3：网格点阵 -->
          <g v-else>
            <rect x="0" y="0" width="320" height="192" fill="none"/>
            <template v-for="row in 4" :key="row">
              <template v-for="col in 8" :key="col">
                <circle
                  :cx="col * 40 - 20"
                  :cy="row * 48 - 24"
                  r="6"
                  :fill="(row + col) % 2 === 0 ? shapeColor1 : shapeColor2"
                  stroke="#1A1A1A"
                  stroke-width="1.5"
                />
              </template>
            </template>
            <rect x="80" y="60" width="160" height="72" :fill="shapeColor3 + 'DD'" stroke="#1A1A1A" stroke-width="3"/>
          </g>
        </svg>

        <!-- IMAGE LOST 像素问号层 -->
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <!-- 像素风问号 SVG（3px 黑边，带白色填充） -->
          <svg
            width="52" height="60" viewBox="0 0 52 60"
            fill="none" xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            class="drop-shadow-[3px_3px_0px_#1A1A1A]"
          >
            <!-- 像素问号：手绘块状字形 -->
            <rect x="14" y="2"  width="24" height="8"  fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2"/>
            <rect x="34" y="10" width="10" height="12" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2"/>
            <rect x="22" y="22" width="12" height="8"  fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2"/>
            <rect x="22" y="30" width="12" height="8"  fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2"/>
            <!-- 空白间隔行（视觉停顿） -->
            <rect x="22" y="46" width="12" height="12" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2"/>
          </svg>
          <span
            class="font-mono text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5
                   border-[2px] border-ink bg-warm-white/90 shadow-[2px_2px_0_0_#1A1A1A]"
          >NO IMAGE</span>
        </div>
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

// ── 图片容错状态 ─────────────────────────────────────────────────────────────
const imgFailed = ref(false)

/**
 * handleImageError
 * 当封面图加载失败时触发，切换到 Memphis 随机占位图。
 * 使用 game.id 作为随机种子，保证同一游戏的占位图固定不变（避免每次刷新不同）。
 */
function handleImageError() {
  imgFailed.value = true
}

// ── Memphis 随机占位色池 ──────────────────────────────────────────────────────
/**
 * 4 组 Memphis 经典配色，每组 [背景色, 图形色1, 图形色2, 图形色3]
 * 确定性随机：用 game.id 字符串 charCode 之和取模，保证同一游戏始终相同占位风格
 */
const MEMPHIS_PALETTES = [
  // 黄黑红（经典）
  { bg: '#FFD600', c1: '#FF3D3D', c2: '#1A1A1A', c3: '#FAF8F5' },
  // 蓝白橙
  { bg: '#2979FF', c1: '#FF9100', c2: '#FAF8F5', c3: '#00E5A0' },
  // 珊瑚+薄荷
  { bg: '#FF6B6B', c1: '#00E5A0', c2: '#FAF8F5', c3: '#FFD600' },
  // 深墨+粉
  { bg: '#1A1A1A', c1: '#FF6B6B', c2: '#FFD600', c3: '#2979FF' },
  // 薄荷绿
  { bg: '#00E5A0', c1: '#FF3D3D', c2: '#1A1A1A', c3: '#FFD600' },
  // 淡紫
  { bg: '#C77DFF', c1: '#FFD600', c2: '#1A1A1A', c3: '#FAF8F5' },
]

/** 用 game.id 的字符编码总和生成确定性"随机"索引 */
function hashId(id: string): number {
  return Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

const paletteIdx = computed(() => hashId(props.game.id) % MEMPHIS_PALETTES.length)
const palette = computed(() => MEMPHIS_PALETTES[paletteIdx.value])

const patternSeed = computed(() => (hashId(props.game.id) >> 2) % 4)

const fallbackBg = computed(() => palette.value.bg)
const shapeColor1 = computed(() => palette.value.c1)
const shapeColor2 = computed(() => palette.value.c2)
const shapeColor3 = computed(() => palette.value.c3)
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
