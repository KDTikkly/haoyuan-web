<template>
  <!--
    GamingProfile.vue
    复古街机卡带风格 × 孟菲斯几何 — Gaming Experience 专属模块
  -->
  <section class="mt-20 border-t-[3px] border-ink pt-12">

    <!-- Section Header -->
    <div class="mb-12">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-yellow">
        <span class="w-2 h-2 bg-ink"></span>
        {{ $t('gaming.badge') }}
      </div>
      <h2 class="font-display font-extrabold text-4xl mb-2">{{ $t('gaming.title') }}</h2>
      <p class="font-mono text-sm text-ink/60 tracking-widest uppercase">{{ $t('gaming.subtitle') }}</p>
    </div>

    <!-- Cards Grid -->
    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="game in games"
        :key="game.id"
        class="gaming-card group relative border-[3px] border-ink bg-warm-beige overflow-hidden
               shadow-[5px_5px_0_0_#1A1A1A]
               transition-[transform,box-shadow,background] duration-200
               hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
      >
        <!-- Cartridge notch decoration (top-right corner cut) -->
        <div
          class="absolute top-0 right-0 w-8 h-8 border-b-[3px] border-l-[3px] border-ink"
          :style="{ background: game.color }"
          aria-hidden="true"
        ></div>

        <!-- Genre Badge -->
        <div class="px-5 pt-5 pb-0">
          <div
            class="inline-flex items-center gap-2 border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold mb-4"
            :style="{ background: game.color }"
          >
            <span>{{ game.genre }}</span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="px-5 pb-5">
          <!-- Game Title + Icon -->
          <div class="flex items-start gap-3 mb-3">
            <!-- Pixel-art style icon block -->
            <div
              class="flex-shrink-0 w-10 h-10 border-[3px] border-ink flex items-center justify-center font-bold text-lg
                     transition-transform duration-200 group-hover:rotate-12"
              :style="{ background: game.iconBg }"
            >{{ game.icon }}</div>
            <div>
              <h3 class="font-display font-extrabold text-lg leading-tight">{{ game.title }}</h3>
              <p class="font-mono text-xs text-ink/50 mt-0.5">{{ game.representatives.join(' · ') }}</p>
            </div>
          </div>

          <!-- Stats row -->
          <div class="flex items-center gap-4 my-4 py-3 border-y-2 border-ink/15">
            <div class="flex flex-col">
              <span class="font-mono text-[10px] text-ink/40 uppercase tracking-wider">{{ $t('gaming.hours_label') }}</span>
              <span class="font-display font-extrabold text-2xl leading-none" :style="{ color: game.color === '#FFD600' ? '#1A1A1A' : game.color }">
                {{ game.hours }}
              </span>
            </div>
            <!-- Achievement bar -->
            <div class="flex-1">
              <div class="font-mono text-[10px] text-ink/40 uppercase tracking-wider mb-1.5">{{ $t('gaming.achievement_label') }}</div>
              <div class="w-full h-2.5 border-2 border-ink bg-warm-white overflow-hidden">
                <div
                  class="h-full transition-[width] duration-700"
                  :style="{ width: game.achievement + '%', background: game.color }"
                ></div>
              </div>
              <div class="font-mono text-[10px] text-ink/50 mt-1">{{ game.achievementLabel }}</div>
            </div>
          </div>

          <!-- Insight -->
          <div class="mt-3 flex items-start gap-2">
            <span class="flex-shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/40 pt-0.5">
              {{ $t('gaming.insight_label') }} ›
            </span>
            <p class="text-sm text-ink/75 leading-relaxed italic">{{ game.insight }}</p>
          </div>
        </div>

        <!-- Hover overlay — Memphis pixel blocks burst -->
        <div
          class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-hidden="true"
        >
          <span
            v-for="(dot, i) in game.pixels"
            :key="i"
            class="absolute w-3 h-3 border border-ink/30"
            :style="{ left: dot.x, top: dot.y, background: dot.c, transform: 'rotate(45deg)' }"
          ></span>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()

// ── Gaming data (bilingual via computed or reactive locale) ──
interface GameEntry {
  id: string
  genre: string
  genreEn: string
  icon: string
  iconBg: string
  color: string
  title: string
  titleEn: string
  representatives: string[]
  hours: string
  achievement: number       // 0–100 progress
  achievementLabel: string
  achievementLabelEn: string
  insight: string
  insightEn: string
  pixels: { x: string; y: string; c: string }[]
}

import { computed } from 'vue'

const rawGames: GameEntry[] = [
  {
    id: 'fps',
    genre: 'FPS / 战术竞技',
    genreEn: 'FPS / Tactical Shooter',
    icon: '🎯',
    iconBg: '#FF6B6B',
    color: '#FF6B6B',
    title: 'FPS 竞技',
    titleEn: 'FPS Competitive',
    representatives: ['CS:GO', '三角洲行动', 'Valorant'],
    hours: '3000h+',
    achievement: 82,
    achievementLabel: 'CSGO SMFC 段位 · 三角洲钻石+',
    achievementLabelEn: 'CSGO SMFC · Delta Force Diamond+',
    insight: '排名天花板的核心是信息差与资源控制，而非纯机械技术——这与产品运营中的用户分层策略高度同构。',
    insightEn: 'The ceiling in ranked play is information asymmetry and resource control, not raw mechanics — structurally identical to user-segmentation strategies in product ops.',
    pixels: [
      { x: '5%', y: '8%', c: '#FFD600' },
      { x: '88%', y: '15%', c: '#2979FF' },
      { x: '12%', y: '80%', c: '#00E5A0' },
      { x: '75%', y: '72%', c: '#FF6B6B' },
    ],
  },
  {
    id: 'gacha',
    genre: '深度养成 / 手游',
    genreEn: 'Deep RPG / Mobile Gacha',
    icon: '✦',
    iconBg: '#FFD600',
    color: '#FFD600',
    title: '养成手游',
    titleEn: 'Live-Service Gacha',
    representatives: ['FGO', '崩铁', '明日方舟'],
    hours: '2000h+',
    achievement: 95,
    achievementLabel: 'FGO 全从者 / 崩铁 MoC 满星',
    achievementLabelEn: 'FGO All Servants Clear · HSR MoC Full Stars',
    insight: 'Gacha 的本质是通过"可变奖励"制造峰值情绪——留存漏斗设计比任何赛季 BP 都更精密。深度玩家即天然的付费用户原型。',
    insightEn: 'Gacha fundamentally manufactures peak emotions via variable-reward loops — its retention funnel architecture is more sophisticated than any seasonal battle pass. Power users are natural paying-user archetypes.',
    pixels: [
      { x: '10%', y: '5%', c: '#FF6B6B' },
      { x: '80%', y: '10%', c: '#7C4DFF' },
      { x: '8%', y: '75%', c: '#FFD600' },
      { x: '82%', y: '78%', c: '#00E5A0' },
    ],
  },
  {
    id: 'slg',
    genre: '策略 / SLG',
    genreEn: 'Strategy / SLG',
    icon: '◆',
    iconBg: '#2979FF',
    color: '#2979FF',
    title: '策略经营',
    titleEn: 'Strategy & Management',
    representatives: ['文明6', 'Total War', '海岛奇兵'],
    hours: '800h+',
    achievement: 70,
    achievementLabel: '文明6 神级难度胜率 60%+',
    achievementLabelEn: 'Civ VI Deity Win Rate 60%+',
    insight: 'SLG 教会我"多线程资源调度"：同时管理短期战术与长期科技树，正是 Roadmap 优先级排序的游戏化版本。',
    insightEn: 'SLG teaches multi-threaded resource scheduling: balancing short-term tactics against long-term tech trees is the gamified equivalent of product roadmap prioritization.',
    pixels: [
      { x: '6%', y: '10%', c: '#FFD600' },
      { x: '85%', y: '8%', c: '#FF6B6B' },
      { x: '15%', y: '82%', c: '#2979FF' },
      { x: '78%', y: '80%', c: '#7C4DFF' },
    ],
  },
]

const games = computed(() =>
  rawGames.map(g => ({
    ...g,
    genre: locale.value === 'en' ? g.genreEn : g.genre,
    title: locale.value === 'en' ? g.titleEn : g.title,
    achievementLabel: locale.value === 'en' ? g.achievementLabelEn : g.achievementLabel,
    insight: locale.value === 'en' ? g.insightEn : g.insight,
  }))
)
</script>
