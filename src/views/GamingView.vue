<template>
  <div class="max-w-6xl mx-auto px-6 py-16">

    <!-- ── Page Header ── -->
    <div class="mb-16 border-b-[3px] border-ink pb-8">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-yellow">
        <span class="w-2 h-2 bg-ink"></span>
        {{ $t('gaming.badge') }}
      </div>
      <h1 class="font-display font-extrabold text-5xl mb-3">{{ $t('gaming.title') }}</h1>
      <p class="font-mono text-sm text-ink/60 tracking-widest uppercase">
        {{ $t('gaming.subtitle') }}
      </p>
    </div>

    <!-- ── Stats bar ── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="border-[3px] border-ink p-4 bg-warm-beige shadow-[4px_4px_0_0_#1A1A1A] flex flex-col gap-1"
      >
        <span class="font-mono text-[10px] text-ink/40 uppercase tracking-wider">
          {{ locale === 'en' ? stat.labelEn : stat.label }}
        </span>
        <span class="font-display font-extrabold text-3xl" :style="{ color: stat.color }">
          {{ stat.value }}
        </span>
      </div>
    </div>

    <!-- ── Steam Recent Games ── -->
    <div class="mb-20">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-10 h-10 border-[3px] border-ink flex items-center justify-center font-bold text-lg
                    bg-ink text-warm-white shadow-[4px_4px_0_0_#1A1A1A]">
          ▶
        </div>
        <div>
          <h2 class="font-display font-extrabold text-2xl leading-tight">
            {{ locale === 'en' ? 'Steam · Recently Played' : 'Steam · 近期游戏' }}
          </h2>
          <p class="font-mono text-xs text-ink/50 tracking-widest uppercase mt-0.5">
            {{ locale === 'en' ? 'Live data via Steam Web API' : '通过 Steam Web API 实时获取' }}
          </p>
        </div>
        <div class="flex-1 h-[3px] bg-ink"></div>
      </div>

      <!-- Loading -->
      <div v-if="steamLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="border-[3px] border-ink h-40 animate-pulse bg-warm-beige shadow-[4px_4px_0_0_#1A1A1A]" />
      </div>

      <!-- Error — Memphis 风格脱机模式卡片 -->
      <div
        v-else-if="steamError"
        class="border-[3px] border-ink bg-warm-beige shadow-[8px_8px_0_0_#1A1A1A] p-0 overflow-hidden"
      >
        <!-- 顶部警告条纹 -->
        <div
          class="h-3 w-full"
          style="background: repeating-linear-gradient(45deg, #FFD600 0px, #FFD600 8px, #1A1A1A 8px, #1A1A1A 16px)"
          aria-hidden="true"
        ></div>

        <div class="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <!-- 图标 -->
          <div class="flex-shrink-0 w-16 h-16 border-[3px] border-ink bg-memphis-yellow
                      flex items-center justify-center shadow-[4px_4px_0_0_#1A1A1A]">
            <span class="text-2xl font-black font-display text-ink leading-none">!</span>
          </div>

          <!-- 文案 -->
          <div class="flex-1 min-w-0">
            <div class="inline-flex items-center gap-1.5 border-2 border-ink px-2 py-0.5
                        font-mono text-[10px] font-bold bg-memphis-coral text-ink mb-2">
              <span class="w-1.5 h-1.5 bg-ink rounded-full"></span>
              {{ locale === 'en' ? 'OFFLINE MODE' : '脱机模式' }}
            </div>
            <h3 class="font-display font-extrabold text-lg leading-tight mb-1">
              {{ locale === 'en' ? 'Steam Data Unavailable' : 'Steam 数据获取失败' }}
            </h3>
            <p class="font-mono text-xs text-ink/60 leading-relaxed mb-4">
              {{ locale === 'en'
                ? 'Could not fetch live Steam data. Check API configuration or try again later.'
                : '无法获取 Steam 实时数据，请检查 API 配置或稍后重试。'
              }}
            </p>
            <!-- 错误详情（折叠） -->
            <details class="group">
              <summary class="font-mono text-[10px] text-ink/50 cursor-pointer hover:text-ink
                             select-none inline-flex items-center gap-1 uppercase tracking-wider">
                <span class="group-open:rotate-90 transition-transform duration-150 inline-block">▶</span>
                {{ locale === 'en' ? 'Error detail' : '错误详情' }}
              </summary>
              <code class="mt-2 block text-[11px] font-mono text-memphis-coral
                           border-l-[3px] border-memphis-coral pl-3 leading-relaxed break-all">
                {{ steamError }}
              </code>
            </details>
          </div>

          <!-- 重试按钮 -->
          <button
            @click="loadSteamData"
            class="flex-shrink-0 px-4 py-2 font-mono text-xs font-bold
                   border-[3px] border-ink bg-ink text-warm-white
                   shadow-[4px_4px_0_0_#FFD600]
                   hover:shadow-[2px_2px_0_0_#FFD600] hover:translate-x-[2px] hover:translate-y-[2px]
                   active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                   transition-[transform,box-shadow] duration-150"
          >
            {{ locale === 'en' ? '↻ Retry' : '↻ 重试' }}
          </button>
        </div>

        <!-- 底部排查提示 -->
        <div class="border-t-[3px] border-ink px-6 py-3 bg-ink/5">
          <p class="font-mono text-[10px] text-ink/50 leading-relaxed">
            {{ locale === 'en'
              ? 'Checklist: ① Set STEAM_API_KEY & STEAM_ID in Vercel Env Vars  ② Set Steam profile & game details to Public  ③ Verify STEAM_ID is a 17-digit SteamID64'
              : '排查清单：① 在 Vercel 环境变量中配置 STEAM_API_KEY 和 STEAM_ID  ② Steam 个人资料及游戏详情均设为"公开"  ③ STEAM_ID 应为 17 位纯数字 SteamID64'
            }}
          </p>
        </div>
      </div>

      <!-- Games -->
      <div v-else-if="steamGames.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="game in steamGames"
          :key="game.appid"
          class="relative border-[3px] border-ink bg-warm-beige overflow-hidden
                 shadow-[4px_4px_0_0_#1A1A1A]
                 transition-[transform,box-shadow] duration-200
                 hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          <!-- Game cover -->
          <div class="border-b-[3px] border-ink overflow-hidden">
            <img
              :src="game.cover"
              :alt="game.name"
              class="w-full h-24 object-cover"
              @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
            />
          </div>
          <div class="p-3">
            <h4 class="font-display font-bold text-sm leading-tight mb-2 line-clamp-2">{{ game.name }}</h4>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] text-ink/50 uppercase">
                {{ locale === 'en' ? '2 Weeks' : '近两周' }}
              </span>
              <span class="font-display font-extrabold text-base text-memphis-coral">
                {{ Math.round(game.playtime_2weeks / 60 * 10) / 10 }}h
              </span>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="font-mono text-[10px] text-ink/50 uppercase">
                {{ locale === 'en' ? 'Total' : '总计' }}
              </span>
              <span class="font-mono text-[10px] text-ink/70">
                {{ Math.round(game.playtime_forever / 60) }}h
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- No data placeholder -->
      <div v-else class="py-8 text-center border-[3px] border-dashed border-ink/40">
        <p class="font-mono text-sm text-ink/50">
          {{ locale === 'en' ? 'No recent Steam data available.' : '暂无近期 Steam 游玩数据。' }}
        </p>
      </div>
    </div>

    <!-- ── Genre Sections (4 categories) ── -->
    <div class="space-y-20">
      <section v-for="category in categories" :key="category.id">

        <!-- Category Header -->
        <div class="flex items-center gap-4 mb-8">
          <div
            class="w-12 h-12 border-[3px] border-ink flex items-center justify-center font-bold text-xl
                   shadow-[4px_4px_0_0_#1A1A1A] transition-[transform,box-shadow] duration-150
                   hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            :style="{ backgroundColor: category.color }"
          >{{ category.icon }}</div>
          <div>
            <h2 class="font-display font-extrabold text-2xl leading-tight">
              {{ locale === 'en' ? category.titleEn : category.title }}
            </h2>
            <p class="font-mono text-xs text-ink/50 tracking-widest uppercase mt-0.5">
              {{ locale === 'en' ? category.genreEn : category.genre }}
            </p>
          </div>
          <!-- Memphis accent stripe -->
          <div class="flex-1 h-[3px]" :style="{ background: category.color }"></div>
        </div>

        <!-- Games Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="game in category.games"
            :key="game.name"
            class="game-card group relative border-[3px] border-ink bg-warm-beige overflow-hidden
                   shadow-[5px_5px_0_0_#1A1A1A]
                   transition-[transform,box-shadow] duration-200
                   hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px]"
          >
            <!-- Cartridge notch top-right -->
            <div
              class="absolute top-0 right-0 w-10 h-10 border-b-[3px] border-l-[3px] border-ink z-[2]"
              :style="{ background: category.color }"
              aria-hidden="true"
            ></div>

            <!-- Hover inversion overlay -->
            <div
              class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100
                     transition-opacity duration-200 z-[1]"
              :style="{ backgroundColor: category.color + '18' }"
              aria-hidden="true"
            >
              <!-- Scattered Memphis pixels -->
              <span
                v-for="(dot, di) in category.pixels"
                :key="di"
                class="absolute w-3 h-3 border border-ink/25 rotate-45"
                :style="{ left: dot.x, top: dot.y, background: dot.c }"
              ></span>
            </div>

            <!-- Card content -->
            <div class="relative z-[3] p-5 h-full flex flex-col">
              <!-- Top row: rank badge + hours -->
              <div class="flex items-center justify-between mb-4 pr-8">
                <div
                  class="px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-ink"
                  :style="{ backgroundColor: category.color }"
                >
                  {{ game.rank ?? (locale === 'en' ? 'PLAYED' : '已游玩') }}
                </div>
                <span class="font-display font-extrabold text-xl" :style="{ color: category.color === '#FFD600' ? '#1A1A1A' : category.color }">
                  {{ game.hours }}
                </span>
              </div>

              <!-- Game name + sub -->
              <div class="mb-3">
                <h3 class="font-display font-extrabold text-lg leading-tight mb-0.5">
                  {{ game.name }}
                </h3>
                <p class="font-mono text-xs text-ink/50">{{ game.sub }}</p>
              </div>

              <!-- Insight (bottom, flexible) -->
              <div class="mt-auto pt-4 border-t-2 border-ink/15">
                <p class="text-xs text-ink/65 leading-relaxed italic">
                  {{ locale === 'en' ? game.insightEn : game.insight }}
                </p>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>

    <!-- ── Bottom CTA ── -->
    <div class="mt-24 border-t-[3px] border-ink pt-12 flex flex-col items-center text-center gap-6">
      <div class="font-mono text-xs text-ink/40 uppercase tracking-widest">
        {{ locale === 'en' ? 'Gaming × Product × Business' : '游戏 × 产品 × 商业' }}
      </div>
      <p class="font-display font-bold text-xl max-w-lg text-ink/75">
        {{ locale === 'en'
          ? 'Games are the most honest laboratories of human behavior — everything I learned playing, I applied building.'
          : '游戏是人类行为最诚实的实验室——我在游戏中学到的一切，都用在了产品构建上。'
        }}
      </p>
      <RouterLink
        to="/projects"
        class="
          px-6 py-2.5 font-mono text-sm font-bold
          border-[3px] border-ink
          shadow-[4px_4px_0_0_#1A1A1A]
          hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
          active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
          transition-[transform,box-shadow] duration-150
          bg-memphis-yellow
        "
      >
        {{ locale === 'en' ? 'See the Projects →' : '查看项目 →' }}
      </RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'
const { locale } = useI18n()

// ── Steam Data ──
interface SteamGame {
  appid: number
  name: string
  playtime_2weeks: number
  playtime_forever: number
  cover: string
  icon: string | null
}

const steamGames = ref<SteamGame[]>([])
const steamLoading = ref(true)
const steamError = ref('')

async function loadSteamData() {
  steamLoading.value = true
  steamError.value = ''
  try {
    const res = await fetch('/api/steam')
    let data: any = {}
    try {
      data = await res.json()
    } catch {
      throw new Error(`HTTP ${res.status} — invalid JSON response`)
    }
    if (!res.ok || data.error) {
      // 将后端的结构化错误映射为用户友好的提示
      const codeMap: Record<string, string> = {
        MISSING_KEY: locale.value === 'en'
          ? '[MISSING_KEY] STEAM_API_KEY not set in Vercel Env Vars'
          : '[MISSING_KEY] Vercel 环境变量中未配置 STEAM_API_KEY',
        MISSING_ID: locale.value === 'en'
          ? '[MISSING_ID] STEAM_ID not set in Vercel Env Vars'
          : '[MISSING_ID] Vercel 环境变量中未配置 STEAM_ID',
        INVALID_ID_FORMAT: locale.value === 'en'
          ? '[INVALID_ID] STEAM_ID must be a 17-digit SteamID64'
          : '[INVALID_ID] STEAM_ID 应为 17 位纯数字 SteamID64',
        STEAM_AUTH_ERROR: locale.value === 'en'
          ? '[AUTH] Steam API key invalid, or profile/game details are Private'
          : '[AUTH] Steam API Key 无效，或个人资料/游戏详情为私密',
        STEAM_API_ERROR: locale.value === 'en'
          ? `[STEAM_API] HTTP ${data.steamStatus ?? res.status}`
          : `[STEAM_API] Steam 返回 HTTP ${data.steamStatus ?? res.status}`,
        NETWORK_ERROR: locale.value === 'en'
          ? '[NETWORK] Cannot reach Steam API from Vercel'
          : '[NETWORK] Vercel 无法连接到 Steam API',
      }
      const msg = data.code && codeMap[data.code]
        ? codeMap[data.code]
        : (data.error ?? `HTTP ${res.status}`)
      throw new Error(msg)
    }
    steamGames.value = data.recentGames ?? []
  } catch (e: any) {
    steamError.value = e.message ?? (locale.value === 'en' ? 'Unknown error' : '未知错误')
  } finally {
    steamLoading.value = false
  }
}

onMounted(loadSteamData)

const stats = [
  { label: '总时长', labelEn: 'Total Hours', value: '5800h+', color: '#FF6B6B' },
  { label: '游玩品类', labelEn: 'Genres', value: '4+', color: '#2979FF' },
  { label: '代表作品', labelEn: 'Key Titles', value: '10+', color: '#A78BFA' },
  { label: '产品洞察', labelEn: 'PM Insights', value: '∞', color: '#FFD600' },
]

const categories = [
  {
    id: 'fps',
    icon: '🎯',
    color: '#FF6B6B',
    title: 'FPS 竞技',
    titleEn: 'FPS Competitive',
    genre: '第一人称射击 / 战术竞技',
    genreEn: 'First-Person Shooter / Tactical',
    pixels: [
      { x: '4%', y: '8%', c: '#FFD600' },
      { x: '82%', y: '60%', c: '#2979FF' },
      { x: '10%', y: '75%', c: '#A78BFA' },
      { x: '70%', y: '12%', c: '#00E5A0' },
    ],
    games: [
      {
        name: 'CS:GO / CS2',
        sub: 'Valve · 2012',
        hours: '2000h+',
        rank: 'SMFC',
        insight: '信息差决定胜负——经济控制与侧路信息是比枪法更稀缺的资源。',
        insightEn: 'Information asymmetry wins rounds — economy management and flank intel are scarcer resources than aim.',
      },
      {
        name: '三角洲行动',
        sub: 'Tencent · 2024',
        hours: '600h+',
        rank: '钻石+',
        insight: '国产 FPS 用"战场经济"重构了竞技留存逻辑，付费点巧妙嵌入核心循环。',
        insightEn: 'Delta Force reinvented competitive retention via "battlefield economy" — monetization is elegantly embedded in the core loop.',
      },
      {
        name: 'Valorant',
        sub: 'Riot · 2020',
        hours: '400h+',
        rank: 'Gold',
        insight: 'Riot 将英雄技能抽象成可学习的信息变量，降低了高段位的随机性天花板。',
        insightEn: 'Riot abstracted agent abilities into learnable information variables, reducing variance ceiling at high ranks.',
      },
    ],
  },
  {
    id: 'gacha',
    icon: '✦',
    color: '#FFD600',
    title: '深度养成 / ARPG',
    titleEn: 'Deep RPG / Live-Service',
    genre: '手游养成 / 开放世界 ARPG',
    genreEn: 'Mobile Gacha / Open-World ARPG',
    pixels: [
      { x: '7%', y: '5%', c: '#FF6B6B' },
      { x: '78%', y: '10%', c: '#7C4DFF' },
      { x: '5%', y: '80%', c: '#00E5A0' },
      { x: '85%', y: '75%', c: '#2979FF' },
    ],
    games: [
      {
        name: 'FGO',
        sub: 'TYPE-MOON · 2015',
        hours: '1200h+',
        rank: '全从者',
        insight: 'FGO 用叙事价值代替数值竞争，证明 IP 情感资产可以长期拮抗付费疲惫。',
        insightEn: 'FGO substitutes narrative value for numeric competition, proving IP emotional equity can sustainably counteract gacha fatigue.',
      },
      {
        name: '崩铁 / 星穹铁道',
        sub: 'HoYoverse · 2023',
        hours: '400h+',
        rank: 'MoC 满星',
        insight: 'MoC 的 DPS 验证机制将玩家数值焦虑精确转化为周期性付费冲动——教科书级漏斗设计。',
        insightEn: 'MoC\'s DPS gating precisely converts player power anxiety into periodic spending impulses — textbook funnel design.',
      },
      {
        name: '明日方舟',
        sub: 'Hypergryph · 2019',
        hours: '300h+',
        rank: '理智满格',
        insight: '低付费依赖 + 高技术上限让 AK 成为国产手游最成功的"技术壁垒"护城河案例。',
        insightEn: 'Low pay-to-win + high skill ceiling makes AK the most successful "technical moat" case study in Chinese mobile gaming.',
      },
    ],
  },
  {
    id: 'slg',
    icon: '◆',
    color: '#2979FF',
    title: 'SLG / 4X 策略',
    titleEn: 'SLG / 4X Strategy',
    genre: '回合制策略 / 即时经营',
    genreEn: 'Turn-Based Strategy / RTS',
    pixels: [
      { x: '6%', y: '10%', c: '#FFD600' },
      { x: '86%', y: '8%', c: '#FF6B6B' },
      { x: '12%', y: '82%', c: '#A78BFA' },
      { x: '76%', y: '78%', c: '#00E5A0' },
    ],
    games: [
      {
        name: '文明 VI',
        sub: 'Firaxis · 2016',
        hours: '500h+',
        rank: '神级 60%胜率',
        insight: '科技树优先级排序本质就是产品 Roadmap——资源约束下的长期规划与短期战术切换。',
        insightEn: 'Tech tree prioritization is product roadmap in disguise — long-term planning vs. short-term tactical pivots under resource constraints.',
      },
      {
        name: 'Total War: Warhammer',
        sub: 'SEGA · 2016',
        hours: '200h+',
        rank: 'VH',
        insight: '多战线资源调度的压力测试：每次决策都是帕累托最优的博弈而非最优解。',
        insightEn: 'Multi-front resource scheduling stress test: every decision is a Pareto trade-off, never a clean optimum.',
      },
      {
        name: '海岛奇兵',
        sub: 'Supercell · 2014',
        hours: '100h+',
        rank: 'T50',
        insight: 'Supercell 用简化的资源循环设计出了最高效的 D1/D7/D30 留存漏斗之一。',
        insightEn: 'Supercell engineered one of the most efficient D1/D7/D30 retention funnels through simplified resource cycle design.',
      },
    ],
  },
  {
    id: 'avg',
    icon: '📖',
    color: '#A78BFA',
    title: 'AVG / 叙事冒险',
    titleEn: 'AVG / Narrative Adventure',
    genre: '视觉小说 / 文字冒险 / 叙事游戏',
    genreEn: 'Visual Novel / Text Adventure',
    pixels: [
      { x: '5%', y: '6%', c: '#FFD600' },
      { x: '80%', y: '14%', c: '#FF6B6B' },
      { x: '8%', y: '78%', c: '#2979FF' },
      { x: '83%', y: '72%', c: '#00E5A0' },
    ],
    games: [
      {
        name: 'Fate/stay night',
        sub: 'TYPE-MOON · 2004',
        hours: '200h+',
        rank: 'ALL TRUE END',
        insight: '三条路线的信息渐进揭露是叙事设计最精妙的"解锁门槛"——也是用户分层运营的隐喻。',
        insightEn: 'Three-route progressive disclosure is narrative design\'s most elegant "unlock gate" — a metaphor for tiered user engagement.',
      },
      {
        name: 'Danganronpa 系列',
        sub: 'Spike Chunsoft · 2010',
        hours: '150h+',
        rank: 'ALL CASES',
        insight: '在叙事约束内构建推理闭环——产品边界内的创意约束往往催生最有意思的解决方案。',
        insightEn: 'Closed-loop deduction within narrative constraints — creative limitations within product boundaries often yield the most interesting solutions.',
      },
      {
        name: '极乐迪斯科',
        sub: 'ZA/UM · 2019',
        hours: '80h+',
        rank: 'Communism',
        insight: 'Disco Elysium 证明了对话树可以是世界观密度最高的载体——文案即产品体验。',
        insightEn: 'Disco Elysium proves dialogue trees can be the densest worldbuilding medium — copywriting IS the product experience.',
      },
    ],
  },
]
</script>
