<template>
  <!-- ════════════════════════════════════════════
       全量库终端 — FullLibraryPortal (v7.9)
       全屏弹窗：Steam + 本地游戏，分类 Tab + 搜索 + 成就进度
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="portal">
      <div
        v-if="visible"
        class="portal-backdrop fixed inset-0 z-[9000] flex flex-col"
        role="dialog"
        aria-modal="true"
        :aria-label="locale === 'en' ? 'Full Game Library' : '全域游戏库'"
        @keydown.esc="$emit('close')"
      >
        <!-- ── 背景遮罩 ── -->
        <div
          class="absolute inset-0 bg-ink/80 backdrop-blur-[3px]"
          @click="$emit('close')"
          aria-hidden="true"
        ></div>

        <!-- ── 主面板 ── -->
        <div class="portal-panel relative z-10 m-4 md:m-8 flex flex-col border-[3px] border-ink bg-warm-beige shadow-[10px_10px_0_0_#1A1A1A] overflow-hidden max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-4rem)]">

          <!-- ── 顶栏 ── -->
          <div class="flex items-center gap-3 px-5 py-3 border-b-[3px] border-ink bg-ink text-warm-white flex-shrink-0">
            <!-- 标题图标 -->
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="flex-shrink-0" aria-hidden="true">
              <rect x="1" y="3" width="18" height="14" stroke="#FAF8F5" stroke-width="2.5"/>
              <line x1="1" y1="7" x2="19" y2="7" stroke="#FAF8F5" stroke-width="2"/>
              <circle cx="4.5" cy="5" r="1" fill="#FFD600"/>
              <circle cx="7.5" cy="5" r="1" fill="#00E5A0"/>
              <circle cx="10.5" cy="5" r="1" fill="#FF6B6B"/>
            </svg>
            <div class="flex-1 min-w-0">
              <span class="font-display font-black text-base tracking-tight">
                {{ locale === 'en' ? '[ FULL DATA LINK ]' : '[ 全域同步终端 ]' }}
              </span>
              <span class="hidden md:inline font-mono text-[9px] text-warm-white/40 ml-3 uppercase tracking-widest">
                {{ locale === 'en' ? 'FULL LIBRARY · ALL PLATFORMS' : '全量库 · 全平台同步' }}
              </span>
            </div>
            <!-- 加载中指示 -->
            <span
              v-if="ownedLoading"
              class="font-mono text-[8px] font-bold px-2 py-0.5 border border-warm-white/20 bg-warm-white/10 animate-pulse flex-shrink-0"
            >
              ⟳ SYNCING...
            </span>
            <!-- 数据来源 badge -->
            <span
              v-else
              class="font-mono text-[8px] font-bold px-2 py-0.5 border flex-shrink-0"
              :class="ownedGames.length > 0
                ? 'border-[#00E5A0]/60 text-[#00E5A0] bg-[#00E5A0]/10'
                : 'border-warm-white/20 text-warm-white/40 bg-warm-white/5'"
            >
              {{ ownedGames.length > 0 ? 'FULL · ' + ownedGames.length : 'RECENT ONLY' }}
            </span>
            <!-- 总数 badge -->
            <span class="font-mono text-[9px] font-bold px-2 py-0.5 border border-warm-white/20 bg-warm-white/10 flex-shrink-0">
              {{ filteredGames.length }} / {{ allGames.length }}
            </span>
            <!-- 关闭按钮 -->
            <button
              class="flex-shrink-0 w-7 h-7 border-[2px] border-warm-white/40 font-mono font-black text-xs
                     flex items-center justify-center
                     hover:bg-warm-white hover:text-ink transition-colors"
              @click="$emit('close')"
              :aria-label="locale === 'en' ? 'Close' : '关闭'"
            >✕</button>
          </div>

          <!-- ── 搜索 + Tab 栏 ── -->
          <div class="flex flex-col md:flex-row md:items-center gap-3 px-5 py-3 border-b-[3px] border-ink bg-warm-white flex-shrink-0">
            <!-- 搜索框 -->
            <div class="relative flex-1 min-w-0">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="5" cy="5" r="3.5" stroke="#1A1A1A" stroke-width="2"/>
                <line x1="8" y1="8" x2="11" y2="11" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <input
                v-model="searchQuery"
                type="search"
                class="w-full pl-8 pr-4 py-2 border-[3px] border-ink font-mono text-[13px] bg-warm-beige
                       focus:outline-none focus:border-[#2979FF] placeholder:text-ink/30"
                :placeholder="locale === 'en' ? 'Search games...' : '搜索游戏...'"
                autocomplete="off"
              />
            </div>

            <!-- 平台 Tab -->
            <div class="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
              <button
                v-for="tab in TABS"
                :key="tab.id"
                class="font-mono text-[10px] font-bold px-3 py-1.5 border-[2px] border-ink
                       uppercase tracking-wider transition-all duration-100"
                :class="activeTab === tab.id
                  ? 'bg-ink text-warm-white shadow-[2px_2px_0_0_#1A1A1A]'
                  : 'bg-warm-beige hover:bg-ink/8'"
                @click="activeTab = tab.id"
              >
                {{ locale === 'en' ? tab.labelEn : tab.label }}
                <span
                  class="ml-1 opacity-60"
                  :class="activeTab === tab.id ? 'opacity-100' : ''"
                >({{ tabCount(tab.id) }})</span>
              </button>
            </div>
          </div>

          <!-- ── 排序 + 分页控制工具栏 ── -->
          <div class="flex flex-wrap items-center gap-2 px-5 py-2 border-b border-ink/15 bg-warm-white/60 flex-shrink-0">
            <!-- 排序按钮 -->
            <span class="font-mono text-[8px] text-ink/30 uppercase tracking-widest">
              {{ locale === 'en' ? 'SORT' : '排序' }}
            </span>
            <button
              v-for="s in SORTS"
              :key="s.id"
              class="font-mono text-[9px] font-bold px-2 py-0.5 border border-ink/20 uppercase tracking-wider
                     transition-colors hover:border-ink"
              :class="sortBy === s.id ? 'bg-ink text-warm-white border-ink' : 'bg-transparent text-ink/50'"
              @click="sortBy = s.id"
            >{{ locale === 'en' ? s.labelEn : s.label }}</button>

            <!-- 分割线 -->
            <span class="w-px h-4 bg-ink/20 mx-1" aria-hidden="true"></span>

            <!-- 每页条数选择器 -->
            <span class="font-mono text-[8px] text-ink/30 uppercase tracking-widest">
              {{ locale === 'en' ? 'PER PAGE' : '每页' }}
            </span>
            <button
              v-for="n in PAGE_SIZES"
              :key="n"
              class="font-mono text-[9px] font-bold px-2 py-0.5 border uppercase tracking-wider
                     transition-all duration-100 relative"
              :class="pageSize === n
                ? 'bg-ink text-warm-white border-ink'
                : 'border-ink/20 text-ink/50 hover:border-ink hover:text-ink'"
              @click="setPageSize(n)"
            >
              {{ n }}
              <!-- 模式指示点 -->
              <span
                v-if="pageSize === n"
                class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-ink"
                :class="n > 10 ? 'bg-[#00E5A0]' : 'bg-memphis-yellow'"
                aria-hidden="true"
              ></span>
            </button>

            <!-- 模式 badge -->
            <span
              class="font-mono text-[8px] font-bold px-2 py-0.5 border uppercase tracking-widest transition-colors"
              :class="isScrollMode
                ? 'border-[#00E5A0]/50 text-[#00E5A0] bg-[#00E5A0]/10'
                : 'border-memphis-yellow/70 text-ink bg-memphis-yellow/20'"
            >
              {{ isScrollMode
                ? (locale === 'en' ? '⟳ SCROLL' : '⟳ 滚动制')
                : (locale === 'en' ? '◧ PAGE'   : '◧ 翻页制') }}
            </span>

            <div class="flex-1"></div>
            <span class="font-mono text-[8px] text-ink/25 uppercase tracking-widest">
              {{ locale === 'en' ? `${filteredGames.length} results` : `${filteredGames.length} 条结果` }}
            </span>
          </div>

          <!-- ── 游戏列表 ── -->
          <div class="flex-1 overflow-y-auto overscroll-contain portal-scroll" ref="listScrollEl">
            <!-- 空状态 -->
            <div
              v-if="filteredGames.length === 0"
              class="flex flex-col items-center justify-center py-24 gap-4"
            >
              <span class="font-display font-extrabold text-5xl text-ink/15">∅</span>
              <p class="font-mono text-sm text-ink/35">
                {{ locale === 'en' ? 'No games match your filter' : '没有符合条件的游戏' }}
              </p>
              <button
                class="font-mono text-[11px] font-bold px-4 py-2 border-[2px] border-ink hover:bg-ink hover:text-warm-white transition-colors"
                @click="searchQuery = ''; activeTab = 'all'"
              >{{ locale === 'en' ? 'CLEAR FILTERS' : '清除筛选' }}</button>
            </div>

            <!-- 游戏卡片行（翻页制：pagedGames；滚动制：filteredGames） -->
            <div
              v-else
              class="divide-y divide-ink/10"
            >
              <div
                v-for="game in displayedGames"
                :key="game.key"
                class="portal-row flex items-center gap-3 px-5 py-3 hover:bg-ink/5 transition-colors group"
              >
                <!-- 封面缩略图 -->
                <div class="w-16 h-10 flex-shrink-0 border-[2px] border-ink overflow-hidden relative bg-ink/5">
                  <img
                    v-if="game.cover"
                    :src="gameCoverSrc(game.key, game.cover)"
                    :alt="game.name"
                    class="w-full h-full object-cover"
                    @error="onCoverError(game.key, game.cover)"
                  />
                  <!-- 无封面色块（cover 字段本身为空时才显示） -->
                  <div
                    v-else
                    class="absolute inset-0 flex items-center justify-center"
                    :style="{ background: game.accentColor + '25' }"
                  >
                    <span class="font-mono text-[8px] font-black text-ink/30 uppercase">
                      {{ game.platform.slice(0, 3) }}
                    </span>
                  </div>
                </div>

                <!-- 游戏信息 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-display font-bold text-[14px] leading-snug truncate text-ink">
                      {{ locale === 'en' ? game.nameEn : game.name }}
                    </span>
                    <span
                      v-if="game.hasPmInsight"
                      class="flex-shrink-0 font-mono text-[7px] font-bold px-1.5 py-0.5 border border-ink/20 bg-pastel-yellow text-ink uppercase"
                    >PM</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <!-- 平台 Badge -->
                    <span
                      class="font-mono text-[8px] font-bold px-1.5 py-0 border uppercase"
                      :style="{ borderColor: game.accentColor, color: game.accentColor, background: game.accentColor + '18' }"
                    >{{ game.platform }}</span>
                    <!-- Tags -->
                    <span
                      v-for="tag in (game.tags ?? []).slice(0, 2)"
                      :key="tag"
                      class="font-mono text-[8px] text-ink/40 uppercase tracking-wider"
                    >{{ tag }}</span>
                  </div>
                </div>

                <!-- 时长 -->
                <div class="flex-shrink-0 text-right min-w-[52px]">
                  <span class="font-display font-extrabold text-lg leading-none" :style="{ color: game.accentColor }">
                    {{ game.hours > 0 ? game.hours + 'h' : '—' }}
                  </span>
                  <p class="font-mono text-[7px] text-ink/25 uppercase tracking-wider leading-none mt-0.5">
                    {{ locale === 'en' ? 'PLAYED' : '时长' }}
                  </p>
                </div>

                <!-- 成就进度（仅 Steam） -->
                <div
                  v-if="game.isSteam && game.achievement"
                  class="flex-shrink-0 w-20 hidden md:block"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-mono text-[7px] text-ink/30 uppercase">ACH</span>
                    <span class="font-mono text-[8px] font-bold" :style="{ color: game.accentColor }">
                      {{ game.achievement.pct }}%
                    </span>
                  </div>
                  <div class="h-1.5 border border-ink/20 overflow-hidden bg-ink/5">
                    <div
                      class="h-full transition-all duration-700"
                      :style="{ width: game.achievement.pct + '%', background: game.accentColor }"
                    ></div>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="flex-shrink-0 flex items-center gap-1">
                  <!-- Steam 商店链接 -->
                  <a
                    v-if="game.isSteam && game.appid"
                    :href="`https://store.steampowered.com/app/${game.appid}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-mono text-[9px] font-bold px-2 py-1 border-[2px] border-ink
                           bg-[#2979FF] text-warm-white hover:shadow-[3px_3px_0_0_#1A1A1A]
                           transition-shadow"
                    @click.stop
                    :aria-label="`Open ${game.name} on Steam`"
                  >↗</a>
                  <!-- 本地游戏：查看详情 -->
                  <button
                    v-if="!game.isSteam"
                    class="font-mono text-[9px] font-bold px-2 py-1 border-[2px] border-ink
                           hover:bg-ink hover:text-warm-white transition-colors"
                    @click.stop="$emit('openGame', game.rawGame)"
                    :aria-label="locale === 'en' ? 'View details' : '查看详情'"
                  >→</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ── 翻页制：分页导航 ── -->
          <div
            v-if="!isScrollMode && filteredGames.length > 0"
            class="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-ink/20 bg-warm-white/80"
          >
            <!-- 页码信息 -->
            <span class="font-mono text-[9px] text-ink/40 uppercase tracking-widest">
              {{ locale === 'en'
                ? `PAGE ${currentPage} / ${totalPages}  ·  ${pageStart}–${pageEnd} of ${filteredGames.length}`
                : `第 ${currentPage} / ${totalPages} 页  ·  ${pageStart}–${pageEnd} 共 ${filteredGames.length}` }}
            </span>

            <!-- 翻页按钮组 -->
            <div class="flex items-center gap-1">
              <!-- 首页 -->
              <button
                class="pager-btn"
                :disabled="currentPage === 1"
                @click="gotoPage(1)"
                :aria-label="locale === 'en' ? 'First page' : '第一页'"
              >«</button>
              <!-- 上一页 -->
              <button
                class="pager-btn"
                :disabled="currentPage === 1"
                @click="gotoPage(currentPage - 1)"
                :aria-label="locale === 'en' ? 'Previous page' : '上一页'"
              >‹</button>

              <!-- 页码数字（最多显示5个） -->
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="pager-ellipsis">…</span>
                <button
                  v-else
                  class="pager-btn"
                  :class="p === currentPage ? 'pager-active' : ''"
                  @click="gotoPage(p as number)"
                >{{ p }}</button>
              </template>

              <!-- 下一页 -->
              <button
                class="pager-btn"
                :disabled="currentPage === totalPages"
                @click="gotoPage(currentPage + 1)"
                :aria-label="locale === 'en' ? 'Next page' : '下一页'"
              >›</button>
              <!-- 末页 -->
              <button
                class="pager-btn"
                :disabled="currentPage === totalPages"
                @click="gotoPage(totalPages)"
                :aria-label="locale === 'en' ? 'Last page' : '最后页'"
              >»</button>
            </div>
          </div>

          <!-- ── 底栏 ── -->
          <div class="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-t-[3px] border-ink bg-ink/5">
            <span class="font-mono text-[9px] text-ink/30 uppercase tracking-widest">
              {{ locale === 'en' ? 'FULL LIBRARY SYNC · ALL PLATFORMS' : '全量库 · 全平台同步终端' }}
            </span>
            <div class="flex gap-2">
              <span class="w-2 h-2 bg-[#2979FF] border border-ink inline-block" aria-hidden="true"></span>
              <span class="w-2 h-2 bg-[#FF6B6B] border border-ink rounded-full inline-block" aria-hidden="true"></span>
              <span class="w-2 h-2 bg-[#FFD600] border border-ink inline-block rotate-45" aria-hidden="true"></span>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FULL_FALLBACK_POOL } from '@/utils/cloudinaryFallbackPool'

const { locale } = useI18n()

// ── 封面容错：key → fallback url（响应式方案）─────────────────────────────
const coverFallbackMap = ref<Record<string, string>>({})
const coverFailedSet   = ref<Set<string>>(new Set())

/**
 * 取封面 src：优先原图，失败后用随机 fallback（pool 中排除原图）
 */
function gameCoverSrc(key: string, originalCover: string): string {
  if (!coverFailedSet.value.has(key)) return originalCover
  return coverFallbackMap.value[key] ?? originalCover
}

function onCoverError(key: string, originalCover: string) {
  if (coverFailedSet.value.has(key)) return  // 已处理，避免循环

  // 从 pool 中随机取一张，排除原图避免重复失败
  const pool = FULL_FALLBACK_POOL.filter(u => u !== originalCover)
  const fallback = pool[Math.floor(Math.random() * pool.length)] ?? FULL_FALLBACK_POOL[0]

  // 响应式更新，触发 Vue 重新渲染
  coverFallbackMap.value = { ...coverFallbackMap.value, [key]: fallback }
  coverFailedSet.value   = new Set([...coverFailedSet.value, key])
}

// ── Props / Emits ──────────────────────────────────────────────────────────
interface SteamGame {
  appid: number
  name: string
  playtime_2weeks: number
  playtime_forever: number
  cover: string
  has_community_visible_stats?: boolean
}

interface LocalGame {
  id: string
  platform: string
  title: string
  titleEn: string
  coverUrl: string
  accentColor: string
  estimatedHours: number
  tags: string[]
  reviewMarkdown?: string
  [key: string]: any
}

interface AchievementData {
  total: number
  unlocked: number
  pct: number
}

const props = defineProps<{
  visible: boolean
  steamGames: SteamGame[]      // GamingView 传入的近期游戏（用作首屏快速展示）
  localGames: LocalGame[]
  steamAchievements: Record<number, AchievementData>
}>()

defineEmits<{
  close: []
  openGame: [game: LocalGame]
}>()

// ── 全量 Steam 库存（Portal 打开时自行 fetch）────────────────────────────
interface OwnedSteamGame {
  appid: number
  name: string
  playtime_forever: number
  playtime_2weeks: number
  rtime_last_played: number
  cover: string
}

const ownedGames      = ref<OwnedSteamGame[]>([])
const ownedLoading    = ref(false)
const ownedError      = ref('')
const ownedFetched    = ref(false)  // 只 fetch 一次

async function fetchOwnedGames() {
  if (ownedFetched.value || ownedLoading.value) return
  ownedLoading.value = true
  ownedError.value   = ''
  try {
    const res = await fetch('/api/steam-owned')
    if (res.ok) {
      const data = await res.json()
      ownedGames.value = data.games ?? []
      ownedFetched.value = true
    } else {
      ownedError.value = `HTTP ${res.status}`
    }
  } catch (e: any) {
    ownedError.value = e.message ?? 'Network error'
  } finally {
    ownedLoading.value = false
  }
}

// Portal 打开时触发全量数据加载
watch(() => props.visible, (v) => {
  if (v) fetchOwnedGames()
})

// ── Tabs 定义 ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'all',    label: '全部',   labelEn: 'All'    },
  { id: 'steam',  label: 'Steam',  labelEn: 'Steam'  },
  { id: 'mobile', label: '手游',   labelEn: 'Mobile' },
  { id: 'other',  label: '其他',   labelEn: 'Other'  },
]

const SORTS = [
  { id: 'hours',    label: '时长',    labelEn: 'Hours'    },
  { id: 'name',     label: '名称',    labelEn: 'Name'     },
  { id: 'platform', label: '平台',    labelEn: 'Platform' },
]

const activeTab   = ref('all')
const searchQuery = ref('')
const sortBy      = ref<'hours' | 'name' | 'platform'>('hours')

// ── 统一游戏列表 ─────────────────────────────────────────────────────────────
interface UnifiedGame {
  key: string
  name: string
  nameEn: string
  platform: string
  hours: number
  cover: string
  accentColor: string
  tags: string[]
  isSteam: boolean
  appid?: number
  hasPmInsight: boolean
  achievement?: AchievementData
  rawGame?: LocalGame
}

// Steam 游戏来源：全量 > 近期（作为初始展示）
const steamSource = computed<(SteamGame | OwnedSteamGame)[]>(() =>
  ownedGames.value.length > 0 ? ownedGames.value : props.steamGames
)

const allGames = computed((): UnifiedGame[] => {
  const steam: UnifiedGame[] = steamSource.value.map(g => ({
    key: `steam-${g.appid}`,
    name: g.name,
    nameEn: g.name,
    platform: 'Steam',
    hours: Math.round(g.playtime_forever / 60),
    cover: g.cover,
    accentColor: '#2979FF',
    tags: [],
    isSteam: true,
    appid: g.appid,
    hasPmInsight: false,
    achievement: props.steamAchievements[g.appid],
  }))

  const local: UnifiedGame[] = props.localGames.map(g => ({
    key: `local-${g.id}`,
    name: g.title,
    nameEn: g.titleEn || g.title,
    platform: g.platform,
    hours: g.estimatedHours ?? 0,
    cover: g.coverUrl,
    accentColor: g.accentColor ?? '#A78BFA',
    tags: g.tags ?? [],
    isSteam: false,
    hasPmInsight: !!(g.reviewMarkdown && g.reviewMarkdown.trim()),
    rawGame: g,
  }))

  return [...steam, ...local]
})

// ── 过滤 + 排序 ──────────────────────────────────────────────────────────────
const MOBILE_KEYWORDS = ['HoYoverse', 'Kuro', '米哈游', '库洛', 'Mobile', 'iOS', 'Android']

const filteredGames = computed(() => {
  let list = allGames.value

  if (activeTab.value === 'steam') {
    list = list.filter(g => g.isSteam)
  } else if (activeTab.value === 'mobile') {
    list = list.filter(g => !g.isSteam && MOBILE_KEYWORDS.some(k => g.platform.includes(k)))
  } else if (activeTab.value === 'other') {
    list = list.filter(g => !g.isSteam && !MOBILE_KEYWORDS.some(k => g.platform.includes(k)))
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.nameEn.toLowerCase().includes(q) ||
      g.platform.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  return [...list].sort((a, b) => {
    if (sortBy.value === 'hours')    return b.hours - a.hours
    if (sortBy.value === 'name')     return (locale.value === 'en' ? a.nameEn : a.name).localeCompare(locale.value === 'en' ? b.nameEn : b.name)
    if (sortBy.value === 'platform') return a.platform.localeCompare(b.platform)
    return 0
  })
})

// ── Tab 计数 ─────────────────────────────────────────────────────────────────
function tabCount(tabId: string): number {
  if (tabId === 'all')    return allGames.value.length
  if (tabId === 'steam')  return allGames.value.filter(g => g.isSteam).length
  if (tabId === 'mobile') return allGames.value.filter(g => !g.isSteam && MOBILE_KEYWORDS.some(k => g.platform.includes(k))).length
  if (tabId === 'other')  return allGames.value.filter(g => !g.isSteam && !MOBILE_KEYWORDS.some(k => g.platform.includes(k))).length
  return 0
}

// ── 分页 / 滚动 复合系统 ──────────────────────────────────────────────────
const PAGE_SIZES = [5, 10, 15, 20] as const
type PageSize = typeof PAGE_SIZES[number]

const pageSize     = ref<PageSize>(10)
const currentPage  = ref(1)
const listScrollEl = ref<HTMLElement | null>(null)

/** 响应式窗口宽度，用于手机端判断 */
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

/** 手机端（< md = 768px）始终滚动制；pageSize > 10 也滚动制 */
const isScrollMode = computed(() => {
  if (windowWidth.value < 768) return true
  return pageSize.value > 10
})

function setPageSize(n: PageSize) {
  pageSize.value    = n
  currentPage.value = 1
  listScrollEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

// 筛选/排序变化时重置页码
watch([() => searchQuery.value, () => activeTab.value, () => sortBy.value], () => {
  currentPage.value = 1
  listScrollEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredGames.value.length / pageSize.value))
)
const pageStart = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const pageEnd   = computed(() => Math.min(currentPage.value * pageSize.value, filteredGames.value.length))

/** 翻页制：当前页切片；滚动制：全量 */
const displayedGames = computed(() => {
  if (isScrollMode.value) return filteredGames.value
  const start = (currentPage.value - 1) * pageSize.value
  return filteredGames.value.slice(start, start + pageSize.value)
})

function gotoPage(p: number) {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value))
  listScrollEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 省略页码算法：≤7 页全显示，>7 页显示首/末/当前±1，中间补 '...' */
const visiblePages = computed((): (number | '...')[] => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n) }
  add(1)
  if (cur > 3)        pages.push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) add(p)
  if (cur < total - 2) pages.push('...')
  add(total)
  return pages
})

</script>

<style scoped>
/* ── 背景遮罩渐入 ── */
.portal-enter-active,
.portal-leave-active {
  transition: opacity 0.22s ease;
}
.portal-enter-active .portal-panel,
.portal-leave-active .portal-panel {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease;
}
.portal-enter-from {
  opacity: 0;
}
.portal-enter-from .portal-panel {
  transform: scale(0.96) translateY(16px);
  opacity: 0;
}
.portal-leave-to {
  opacity: 0;
}
.portal-leave-to .portal-panel {
  transform: scale(0.97) translateY(8px);
  opacity: 0;
}

/* ── 滚动区域：隐藏滚动条 ── */
.portal-scroll {
  scrollbar-width: thin;
  scrollbar-color: #1A1A1A20 transparent;
}
.portal-scroll::-webkit-scrollbar {
  width: 4px;
}
.portal-scroll::-webkit-scrollbar-thumb {
  background: #1A1A1A25;
  border-radius: 0;
}

/* ── 行 hover ── */
.portal-row {
  transition: background 0.1s ease;
}

/* ── 翻页按钮 ── */
.pager-btn {
  @apply font-mono text-[10px] font-bold w-7 h-7 flex items-center justify-center
         border-[2px] border-ink/20 text-ink/50
         hover:border-ink hover:text-ink hover:bg-ink/5
         transition-all duration-100 disabled:opacity-20 disabled:cursor-not-allowed
         disabled:hover:border-ink/20 disabled:hover:bg-transparent;
}
.pager-active {
  @apply bg-ink text-warm-white border-ink !important;
}
.pager-ellipsis {
  @apply font-mono text-[10px] text-ink/30 w-6 flex items-center justify-center select-none;
}
</style>
