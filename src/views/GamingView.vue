<template>
  <div class="min-h-screen pt-20 pb-16 px-6">
    <div class="max-w-6xl mx-auto">

      <!-- ════════════════════════════════════════════
           页面标题
      ════════════════════════════════════════════ -->
      <div class="mb-12">
        <h1 class="font-display font-extrabold text-5xl md:text-6xl tracking-tight mb-4">
          {{ locale === 'en' ? 'Gaming Ecosystem' : '硬核游戏生态' }}
        </h1>
        <p class="font-mono text-sm text-ink/60 max-w-xl leading-relaxed">
          {{ locale === 'en'
            ? 'Multi-platform gaming journey: Steam library + HoYoverse/Kuro games deep dive analysis.'
            : '多平台游戏之旅：Steam 库存 + 米哈游/库洛游戏深度拆解。'
          }}
        </p>
      </div>

      <!-- ════════════════════════════════════════════
           实时数据看板（4 个 Brutalist 统计卡片）
      ════════════════════════════════════════════ -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        <div
          v-for="(stat, idx) in statsDisplay"
          :key="stat.labelEn"
          class="border-[3px] border-ink p-5 bg-warm-white shadow-[6px_6px_0_0_#1A1A1A]
                 flex flex-col gap-1.5 relative overflow-hidden group
                 transition-[transform,box-shadow] duration-150
                 hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px]"
        >
          <!-- 顶部色块装饰 -->
          <span
            class="absolute top-0 left-0 w-full h-[3px] transition-all duration-300 group-hover:h-[5px]"
            :style="{ background: stat.color }"
            aria-hidden="true"
          ></span>

          <!-- 标签行 + 数据来源 badge -->
          <div class="flex items-center justify-between pt-1.5">
            <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider">
              {{ locale === 'en' ? stat.labelEn : stat.label }}
            </span>
            <span
              class="font-mono text-[7px] font-bold px-1 py-0.5 border border-ink/20"
              :style="{ background: stat.color + '28', color: stat.color }"
            >{{ stat.source }}</span>
          </div>

          <!-- 加载骨架 -->
          <div v-if="stat.loading" class="flex items-end gap-1 h-12">
            <span class="font-display font-extrabold text-4xl animate-pulse bg-ink/10 rounded w-20 h-10 inline-block"></span>
          </div>

          <!-- CountUp 数值 + 趋势箭头 -->
          <div v-else class="flex items-end gap-2 leading-none">
            <span
              :ref="(el) => setStatRef(idx, el)"
              class="font-display font-extrabold text-4xl leading-none tabular-nums"
              :style="{ color: stat.color }"
            >{{ stat.value }}</span>
            <span
              v-if="stat.trend"
              class="font-mono text-xs font-bold mb-0.5 opacity-70"
              :style="{ color: stat.color }"
            >{{ stat.trend }}</span>
          </div>

          <!-- 描述 + 子标签 -->
          <span class="font-mono text-[8.5px] text-ink/35 uppercase tracking-widest leading-tight">
            {{ locale === 'en' ? stat.descEn : stat.desc }}
          </span>

          <!-- 底部装饰线（hover 展开） -->
          <span
            class="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-300"
            :style="{ background: stat.color }"
            aria-hidden="true"
          ></span>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           Steam 错误提示
      ════════════════════════════════════════════ -->
      <Transition name="fade-in">
        <div
          v-if="steamError"
          class="border-[3px] border-pastel-red bg-pastel-red/10 p-4 mb-8 flex items-start gap-3"
        >
          <span class="text-pastel-red text-xl">⚠️</span>
          <div>
            <p class="font-display font-bold text-sm mb-1">
              {{ locale === 'en' ? 'Steam Data Unavailable' : 'Steam 数据不可用' }}
            </p>
            <p class="font-mono text-xs text-ink/70">{{ steamError }}</p>
          </div>
        </div>
      </Transition>

      <!-- ════════════════════════════════════════════
           Section 1：平台直连库 (Steam Library)
      ════════════════════════════════════════════ -->
      <div v-if="steamGames.length > 0 || steamLoading" class="mb-16">
        <!-- Section 大标题 -->
        <div class="flex items-center gap-4 mb-6">
          <h2 class="font-display font-extrabold text-3xl md:text-4xl tracking-tight border-[3px] border-ink px-4 py-2 bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]">
            {{ locale === 'en' ? 'Steam Library' : '平台直连库' }}
          </h2>
          <div class="flex-1 h-[3px] bg-ink"></div>
          <span class="font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-ink bg-[#2979FF] text-warm-white uppercase tracking-wider">
            STEAM
          </span>
        </div>

        <!-- Steam 加载骨架 -->
        <div v-if="steamLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="n in 3"
            :key="`skel-${n}`"
            class="border-[3px] border-ink bg-warm-beige h-[340px] animate-pulse"
          ></div>
        </div>

        <!-- Steam 卡片网格（仅展示，无点击事件） -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="game in steamGames.slice(0, 6)"
            :key="`steam-${game.appid}`"
            class="border-[3px] border-ink bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]
                   hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
                   transition-all duration-150 group overflow-hidden cursor-default"
          >
            <!-- Cover -->
            <div class="relative h-44 overflow-hidden border-b-[3px] border-ink">
              <img
                v-if="game.cover"
                :src="game.cover"
                :alt="game.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full bg-[#2979FF]/20 flex items-center justify-center">
                <span class="font-display font-bold text-3xl text-ink/30">STEAM</span>
              </div>
              <!-- Platform Badge -->
              <span class="absolute top-2 right-2 font-mono text-[8px] font-bold px-1.5 py-0.5
                             bg-ink text-warm-white border border-warm-white/30">
                STEAM
              </span>
            </div>

            <!-- Content -->
            <div class="p-4 flex flex-col">
              <h3 class="font-display font-bold text-base leading-tight mb-3 line-clamp-2">
                {{ game.name }}
              </h3>

              <!-- Stats -->
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-0.5 relative pl-2">
                  <span class="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF6B6B]"></span>
                  <span class="font-mono text-[7.5px] text-ink/35 uppercase tracking-wide">近两周</span>
                  <span class="font-display font-bold text-sm text-[#FF6B6B]">
                    {{ (game.playtime_2weeks / 60).toFixed(1) }}h
                  </span>
                </div>
                <div class="flex flex-col gap-0.5 relative pl-2">
                  <span class="absolute left-0 top-0 bottom-0 w-[2px] bg-[#2979FF]"></span>
                  <span class="font-mono text-[7.5px] text-ink/35 uppercase tracking-wide">总时长</span>
                  <span class="font-display font-bold text-sm text-[#2979FF]">
                    {{ (game.playtime_forever / 60).toFixed(1) }}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           Section 2：本地全栖战绩 (Manual Archives)
      ════════════════════════════════════════════ -->
      <div v-if="localGames.length > 0 || gamesLoading" class="mb-16">
        <!-- Section 大标题 -->
        <div class="flex items-center gap-4 mb-6">
          <h2 class="font-display font-extrabold text-3xl md:text-4xl tracking-tight border-[3px] border-ink px-4 py-2 bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]">
            {{ locale === 'en' ? 'Manual Archives' : '本地全栖战绩' }}
          </h2>
          <div class="flex-1 h-[3px] bg-ink"></div>
          <span class="font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-ink bg-[#A78BFA] text-warm-white uppercase tracking-wider">
            LOCAL
          </span>
        </div>

        <!-- 本地游戏卡片网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="game in localGames"
            :key="game.id"
            class="border-[3px] border-ink bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]
                   hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
                   transition-all duration-150 group cursor-pointer overflow-hidden"
            @click="selectedGame = game"
          >
            <!-- Cover — 高清官方原画 -->
            <div
              class="relative h-48 overflow-hidden border-b-[3px] border-ink"
              :class="coverFailed[game.id] ? 'bg-warm-white' : ''"
            >
              <img
                v-if="game.coverUrl && !coverFailed[game.id]"
                :src="game.coverUrl"
                :alt="game.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                @error="coverFailed[game.id] = true"
              />
              <!-- Fallback：图片加载失败或无 coverUrl 时显示彩色色块 -->
              <div
                v-else
                class="w-full h-full flex items-center justify-center"
                :style="{ background: game.accentColor + '22' }"
              >
                <span
                  class="font-display font-bold text-4xl tracking-tight select-none"
                  :style="{ color: game.accentColor + '55' }"
                >{{ (game.titleEn || game.title).slice(0, 3).toUpperCase() }}</span>
              </div>
              <!-- Platform Badge -->
              <span
                class="absolute top-2 right-2 font-mono text-[8px] font-bold px-1.5 py-0.5
                       border border-warm-white/30 uppercase tracking-wider z-10"
                :style="{ background: game.accentColor, color: '#1A1A1A' }"
              >
                {{ game.platform }}
              </span>
              <!-- PM Insight Indicator -->
              <span
                v-if="game.reviewMarkdown"
                class="absolute bottom-2 left-2 font-mono text-[8px] font-bold px-2 py-0.5
                       bg-pastel-yellow border border-ink text-ink uppercase tracking-wider z-10"
              >
                PM INSIGHT
              </span>
            </div>

            <!-- Content -->
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

              <!-- 精细 stats 数据块 -->
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
                  <span class="font-mono text-[7.5px] text-ink/35 uppercase leading-tight tracking-wide truncate">{{ key }}</span>
                  <span
                    class="font-display font-bold text-[11px] leading-tight truncate"
                    :style="{ color: game.accentColor }"
                  >{{ val }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           Empty State（两个数据源均为空）
      ════════════════════════════════════════════ -->
      <Transition name="fade-in">
        <div
          v-if="!steamLoading && !gamesLoading && steamGames.length === 0 && localGames.length === 0"
          class="text-center py-20"
        >
          <span class="font-display font-extrabold text-6xl text-ink/20">∅</span>
          <p class="font-mono text-sm text-ink/40 mt-4">
            {{ locale === 'en' ? 'No games data available' : '暂无游戏数据' }}
          </p>
        </div>
      </Transition>
    </div>

    <!-- ════════════════════════════════════════════
         游戏详情侧滑面板
    ════════════════════════════════════════════ -->
    <GameDetailPanel
      :is-open="!!selectedGame"
      :selected-game="selectedGame"
      @close="selectedGame = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import gsap from 'gsap'
import GameDetailPanel from '@/components/GameDetailPanel.vue'

const { locale } = useI18n()

// ════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════
interface SteamGame {
  appid: number
  name: string
  playtime_2weeks: number
  playtime_forever: number
  cover: string
  icon: string | null
}

interface OwnedStats {
  totalGames: number
  totalHours: number
  estimatedValue: number
}

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

// ════════════════════════════════════════════
//  Steam 数据
// ════════════════════════════════════════════
const steamGames   = ref<SteamGame[]>([])
const ownedStats   = ref<OwnedStats | null>(null)
const steamLoading = ref(true)
const steamError   = ref('')

async function loadSteamData() {
  steamLoading.value = true
  steamError.value   = ''
  try {
    const res = await fetch('/api/steam')
    let data: any = {}
    try { data = await res.json() } catch {
      throw new Error(`HTTP ${res.status} — invalid JSON response`)
    }
    if (!res.ok || data.error) {
      const codeMap: Record<string, string> = {
        MISSING_KEY:       locale.value === 'en' ? '[MISSING_KEY] STEAM_API_KEY not set' : '[MISSING_KEY] 未配置 STEAM_API_KEY',
        MISSING_ID:        locale.value === 'en' ? '[MISSING_ID] STEAM_ID not set'       : '[MISSING_ID] 未配置 STEAM_ID',
        INVALID_ID_FORMAT: locale.value === 'en' ? '[INVALID_ID] Must be 17-digit SteamID64' : '[INVALID_ID] 应为 17 位 SteamID64',
        STEAM_AUTH_ERROR:  locale.value === 'en' ? '[AUTH] Invalid key or private profile' : '[AUTH] Key 无效或资料私密',
        NETWORK_ERROR:     locale.value === 'en' ? '[NETWORK] Cannot reach Steam API' : '[NETWORK] 无法连接 Steam API',
      }
      const msg = data.code && codeMap[data.code] ? codeMap[data.code] : (data.error ?? `HTTP ${res.status}`)
      throw new Error(msg)
    }
    steamGames.value = data.recentGames ?? []
    if (data.ownedStats) ownedStats.value = data.ownedStats
  } catch (e: any) {
    steamError.value = e.message ?? (locale.value === 'en' ? 'Unknown error' : '未知错误')
  } finally {
    steamLoading.value = false
  }
}

// ════════════════════════════════════════════
//  本地 JSON 游戏数据
// ════════════════════════════════════════════
const localGames   = ref<LocalGame[]>([])
const gamesLoading = ref(true)

async function loadLocalGames() {
  try {
    const res = await fetch('/data/gaming.json')
    if (res.ok) localGames.value = await res.json()
  } catch { /* 静默失败 */ } finally {
    gamesLoading.value = false
  }
}

// ════════════════════════════════════════════
//  双源聚合 — computed 统计
// ════════════════════════════════════════════

/** 总时长：Steam 总时长(h) + 本地 JSON estimatedHours 总和 */
/** Fallback：Steam 失败时纯用本地数据，显示 'Local' 作为来源 */
const totalHours = computed(() => {
  // 优先使用 Steam 数据，失败则 fallback 到 0（仅用本地数据）
  const steamH = ownedStats.value?.totalHours ?? 0
  // 本地数据始终累加
  const localH = localGames.value.reduce((s, g) => s + (g.estimatedHours ?? 0), 0)
  return Math.round(steamH + localH)
})

/** 游玩品类（唯一 tags 去重计数） */
const totalGenres = computed(() => {
  const set = new Set<string>()
  localGames.value.forEach(g => g.tags?.forEach(t => t && set.add(t.trim())))
  // Steam 游戏暂无 tag 返回，使用固定已知类型补充
  ;['FPS', 'Strategy', 'Visual Novel', 'Gacha', 'Action RPG', 'Open World', 'Turn-based RPG'].forEach(t => set.add(t))
  return set.size
})

/** 代表作品：Steam 入库 + 本地 JSON 数量 */
const totalGamesCount = computed(() => {
  const steamOwned = ownedStats.value ? ownedStats.value.totalGames : 0
  return steamOwned + localGames.value.length
})

/** 产品洞察：reviewMarkdown 不为空的数量 */
/** 逻辑：检查 reviewMarkdown 字段是否存在且非空字符串 */
const insightCount = computed(() =>
  localGames.value.filter(g => {
    const md = g.reviewMarkdown
    return md && typeof md === 'string' && md.trim().length > 0
  }).length
)

// ════════════════════════════════════════════
//  看板数据（统一 computed）
// ════════════════════════════════════════════
const statsDisplay = computed(() => [
  {
    label: '总时长',
    labelEn: 'Total Hours',
    desc: 'Steam + 手游累计',
    descEn: 'Steam + Mobile Combined',
    // 优先显示本地数据（即使 Steam 失败），避免显示 '—'
    value: totalHours.value > 0 ? `${totalHours.value.toLocaleString()}h` : (localGames.value.length > 0 ? `${localGames.value.reduce((s, g) => s + (g.estimatedHours ?? 0), 0).toLocaleString()}h` : '—'),
    numericTarget: totalHours.value,
    suffix: 'h',
    color: '#FF6B6B',
    // loading 仅在完全无数据时显示，本地数据加载完成即停止 loading
    loading: gamesLoading.value && localGames.value.length === 0,
    // 根据是否有 Steam 数据显示来源
    source: ownedStats.value ? 'Mixed' : 'Local',
    trend: totalHours.value > 0 ? '↗' : undefined,
  },
  {
    label: '游玩品类',
    labelEn: 'Genres',
    desc: '跨平台品类去重',
    descEn: 'Unique Across Platforms',
    value: `${totalGenres.value}+`,
    numericTarget: totalGenres.value,
    suffix: '+',
    color: '#2979FF',
    loading: false,
    source: 'Mixed',
  },
  {
    label: '代表作品',
    labelEn: 'Total Games',
    desc: 'Steam 入库 + 手游',
    descEn: 'Steam Owned + Mobile',
    value: totalGamesCount.value > 0 ? `${totalGamesCount.value}` : (localGames.value.length > 0 ? `${localGames.value.length}` : '—'),
    numericTarget: totalGamesCount.value,
    suffix: '',
    color: '#A78BFA',
    // loading 仅在完全无数据时显示
    loading: gamesLoading.value && localGames.value.length === 0,
    source: ownedStats.value ? 'Mixed' : 'Local',
  },
  {
    label: '深度拆解',
    labelEn: 'PM Insights',
    desc: '完成产品拆解报告',
    descEn: 'Teardown Reports Done',
    // 显示实际数量，0 也显示（不显示 '—'）
    value: `${insightCount.value}`,
    numericTarget: insightCount.value,
    suffix: '',
    color: '#FFD600',
    loading: false,
    source: 'Local',
  },
])

// ════════════════════════════════════════════
//  GSAP CountUp 动画
// ════════════════════════════════════════════
const statNumEls = ref<Map<number, HTMLElement>>(new Map())

function setStatRef(idx: number, el: HTMLElement | null) {
  if (el) {
    statNumEls.value.set(idx, el)
  } else {
    statNumEls.value.delete(idx)
  }
}

function runCountUp() {
  nextTick(() => {
    statsDisplay.value.forEach((stat, i) => {
      const el = statNumEls.value.get(i)
      if (!el || stat.loading || stat.numericTarget === 0) return
      const obj = { val: 0 }
      gsap.to(obj, {
        val: stat.numericTarget,
        duration: 1.4,
        ease: 'power2.out',
        delay: i * 0.12,
        onUpdate() {
          if (el) el.textContent = Math.round(obj.val).toLocaleString() + stat.suffix
        }
      })
    })
  })
}

// 监听数据加载完成，触发 CountUp
watch([steamLoading, gamesLoading], ([sL, gL]) => {
  if (!sL && !gL) {
    runCountUp()
  }
})

// ════════════════════════════════════════════
//  侧滑面板状态
// ════════════════════════════════════════════
const selectedGame = ref<LocalGame | null>(null)

// 封面图加载失败状态（key: game.id）
const coverFailed = ref<Record<string, boolean>>({})

// ════════════════════════════════════════════
//  初始化
// ════════════════════════════════════════════
onMounted(() => {
  loadSteamData()
  loadLocalGames()
})
</script>

<style scoped>
/* Fade in animation */
.fade-in-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-in-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-in-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
