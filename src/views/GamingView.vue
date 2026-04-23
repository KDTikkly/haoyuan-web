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

          <!-- 几何形状背景锚点（视觉中心装饰） -->
          <span
            class="absolute bottom-3 right-3 opacity-10 pointer-events-none"
            aria-hidden="true"
          >
            <svg
              v-if="idx % 3 === 0"
              width="56" height="56" viewBox="0 0 56 56"
            ><circle cx="28" cy="28" r="24" :fill="stat.color" stroke="#1A1A1A" stroke-width="3"/></svg>
            <svg
              v-else-if="idx % 3 === 1"
              width="56" height="56" viewBox="0 0 56 56"
            ><rect x="4" y="4" width="48" height="48" :fill="stat.color" stroke="#1A1A1A" stroke-width="3"/></svg>
            <svg
              v-else
              width="56" height="56" viewBox="0 0 56 56"
            ><polygon points="28,4 52,52 4,52" :fill="stat.color" stroke="#1A1A1A" stroke-width="3"/></svg>
          </span>

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
           Section 1：☁️ CLOUD SYNCED（原：平台直连库）
      ════════════════════════════════════════════ -->
      <div v-if="steamGames.length > 0 || steamLoading" class="mb-16">
        <!-- Section 大标题 -->
        <div class="flex items-center gap-4 mb-6">
          <h2 class="flex items-center gap-3 font-display font-extrabold text-3xl md:text-4xl tracking-tight border-[3px] border-ink px-4 py-2 bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]">
            <!-- 云朵图标：3px 黑边，memphis-blue 填充 -->
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon flex-shrink-0" aria-hidden="true">
              <path d="M8 22C4.5 22 2 19.5 2 16C2 13 4 10.5 7 10C7.5 6 10.5 3 14.5 3C17 3 19.2 4.2 20.6 6C21.4 5.4 22.4 5 23.5 5C26.5 5 29 7.5 29 10.5C29 10.7 29 10.9 28.98 11.1C30.5 11.7 32 13.2 32 15.5C32 18.5 29.5 21 26.5 21L8 22Z" fill="#2979FF" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/>
              <line x1="14" y1="22" x2="14" y2="27" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="18" y1="22" x2="18" y2="27" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="22" y1="22" x2="22" y2="27" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            {{ locale === 'en' ? '[ CLOUD SYNCED ]' : '[ 云端链路 ]' }}
          </h2>
          <div class="flex-1 h-[4px] bg-ink"></div>
          <span class="font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-ink bg-[#2979FF] text-warm-white uppercase tracking-wider animate-pulse">
            STEAM · API
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
                v-if="game.cover && !steamCoverFailed[game.appid]"
                :src="game.cover"
                :alt="game.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                @error="onSteamCoverError(game.appid)"
              />
              <!-- cover失败时：随机图库图片 -->
              <img
                v-else-if="steamCoverFailed[game.appid] && steamFallbackImages[game.appid]"
                :src="steamFallbackImages[game.appid]"
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
            <div class="p-4 flex flex-col h-full">
              <h3 class="font-display font-bold text-xl tracking-tight leading-tight mb-1 line-clamp-2">
                {{ game.name }}
              </h3>
              <!-- 点状分割线：区分标题与统计数据 -->
              <div class="w-full border-b border-dashed border-ink/20 mb-3"></div>

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
           Section 2：💾 LOCAL ARCHIVE（原：本地全栖战绩）
      ════════════════════════════════════════════ -->
      <div v-if="localGames.length > 0 || gamesLoading" class="mb-16">
        <!-- Section 大标题 -->
        <div class="flex items-center gap-4 mb-6">
          <h2 class="flex items-center gap-3 font-display font-extrabold text-3xl md:text-4xl tracking-tight border-[3px] border-ink px-4 py-2 bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]">
            <!-- 3.5 寸磁盘图标：厚重黑边，紫色填充 -->
            <svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon flex-shrink-0" aria-hidden="true">
              <rect x="2" y="1" width="24" height="28" stroke="#1A1A1A" stroke-width="2.5"/>
              <rect x="6" y="1" width="14" height="10" fill="#A78BFA" stroke="#1A1A1A" stroke-width="2"/>
              <rect x="16" y="2" width="3" height="7" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="1.5"/>
              <rect x="7" y="16" width="14" height="10" rx="2" fill="#A78BFA" stroke="#1A1A1A" stroke-width="2"/>
              <circle cx="14" cy="21" r="3" fill="#1A1A1A"/>
              <circle cx="14" cy="21" r="1.2" fill="#FAF8F5"/>
            </svg>
            {{ locale === 'en' ? '[ LOCAL ARCHIVE ]' : '[ 本地存档 ]' }}
          </h2>
          <div class="flex-1 h-[4px] bg-ink"></div>
          <span class="font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-ink bg-[#A78BFA] text-warm-white uppercase tracking-wider">
            OFFLINE · JSON
          </span>
        </div>

        <!-- 本地游戏卡片网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GameCard
            v-for="game in localGames"
            :key="game.id"
            :game="game"
            @click="selectedGame = $event"
          />
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
import GameCard from '@/components/GameCard.vue'

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
//  Steam 封面图 fallback（随机图库）
// ════════════════════════════════════════════
const steamCoverFailed = ref<Record<number, boolean>>({})
const steamFallbackImages = ref<Record<number, string>>({})

// 图库图片列表（在 onMounted 里从 gallery-index.json 加载）
let galleryImages: string[] = []

async function loadGalleryIndex() {
  try {
    const res = await fetch('/data/gallery-index.json')
    if (res.ok) galleryImages = await res.json()
  } catch { /* 静默失败 */ }
}

function getRandomGalleryImage(): string {
  if (!galleryImages.length) return ''
  const idx = Math.floor(Math.random() * galleryImages.length)
  return `/assets/gallery/${encodeURIComponent(galleryImages[idx])}`
}

function onSteamCoverError(appid: number) {
  steamCoverFailed.value[appid] = true
  if (!steamFallbackImages.value[appid]) {
    steamFallbackImages.value[appid] = getRandomGalleryImage()
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


// ════════════════════════════════════════════
//  初始化：并发加载所有数据，任意失败不阻断其他
// ════════════════════════════════════════════
onMounted(() => {
  Promise.allSettled([
    loadGalleryIndex(),
    loadSteamData(),
    loadLocalGames(),
  ])
})
</script>

<style scoped>
/* ── Brutalist SVG 图标规范 ── */
.brutalist-icon {
  display: inline-block;
  vertical-align: middle;
  filter: drop-shadow(2px 2px 0px #1A1A1A);
}

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
