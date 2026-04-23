<template>
  <!-- ════════════════════════════════════════════
       游戏详情侧滑面板 — Memphis Brutalist 升级版 (v2.0)
       - 从右侧滑入，真实侧滑动效
       - Stats 网格：带顶部彩条 + 3px 黑边 + 硬阴影
       - 全量渲染 stats 对象 + reviewMarkdown
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="slide-panel">
      <div
        v-if="isOpen && selectedGame"
        class="fixed inset-0 z-[100] flex"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-ink/50"
          @click="close"
        ></div>

        <!-- Side Panel — 从右侧滑入 -->
        <div
          class="relative ml-auto w-full max-w-xl h-full overflow-y-auto bg-warm-white
                 border-l-[3px] border-ink shadow-[-8px_0_0_0_#1A1A1A]
                 flex flex-col"
        >
          <!-- ─── 顶部彩条装饰 ─── -->
          <div
            class="h-[6px] w-full flex-shrink-0"
            :style="{ background: selectedGame.accentColor }"
          ></div>

          <!-- ─── Header with Cover ─── -->
          <div class="relative h-52 overflow-hidden border-b-[3px] border-ink flex-shrink-0">
            <!-- 游戏封面图 -->
            <img
              v-if="selectedGame.coverUrl && !bannerFailed"
              :src="selectedGame.coverUrl"
              :alt="selectedGame.titleEn || selectedGame.title"
              class="w-full h-full object-cover"
              @error="bannerFailed = true"
            />
            <!-- Fallback：Memphis 几何图案 -->
            <MemphisCover v-else :game-id="selectedGame.id" />
            <!-- Title Overlay -->
            <div class="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-ink/95 to-transparent">
              <div class="flex items-center gap-2 mb-1.5">
                <span
                  class="font-mono text-[9px] font-bold px-2 py-0.5
                         border border-warm-white/40 text-warm-white uppercase tracking-wider"
                  :style="{ background: selectedGame.accentColor + '80' }"
                >{{ selectedGame.platform }}</span>
                <span
                  v-if="selectedGame.reviewMarkdown"
                  class="font-mono text-[9px] font-bold px-2 py-0.5
                         bg-pastel-yellow border border-ink text-ink uppercase tracking-wider"
                >PM INSIGHT</span>
              </div>
              <h2 class="font-display font-extrabold text-2xl text-warm-white leading-tight drop-shadow">
                {{ locale === 'en' ? selectedGame.titleEn : selectedGame.title }}
              </h2>
            </div>
            <!-- Close Button -->
            <button
              @click="close"
              class="absolute top-3 right-3 w-10 h-10 bg-warm-white
                     border-[3px] border-ink flex items-center justify-center
                     hover:bg-ink hover:text-warm-white
                     shadow-[3px_3px_0_0_#1A1A1A] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                     transition-all duration-100 font-bold text-sm"
              aria-label="Close"
            >✕</button>
          </div>

          <!-- ─── Body ─── -->
          <div class="p-5 flex flex-col gap-5 flex-1">

            <!-- UID & Nickname 一行 -->
            <div class="flex gap-3">
              <div class="flex-1 border-[3px] border-ink p-3 bg-warm-white shadow-[4px_4px_0_0_#1A1A1A]">
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block mb-0.5">NICKNAME</span>
                <span class="font-display font-bold text-base">{{ selectedGame.nickname || '—' }}</span>
              </div>
              <div class="flex-1 border-[3px] border-ink p-3 bg-warm-white shadow-[4px_4px_0_0_#1A1A1A]">
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block mb-0.5">UID</span>
                <span class="font-mono text-base">{{ selectedGame.uid || '—' }}</span>
              </div>
            </div>

            <!-- Level & Playtime 一行 -->
            <div class="flex gap-3">
              <div
                class="flex-1 border-[3px] border-ink p-3 bg-warm-white shadow-[4px_4px_0_0_#1A1A1A] relative overflow-hidden"
              >
                <span
                  class="absolute top-0 left-0 right-0 h-[3px]"
                  :style="{ background: selectedGame.accentColor }"
                ></span>
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block mb-0.5 mt-1">LEVEL</span>
                <span class="font-display font-bold text-base" :style="{ color: selectedGame.accentColor }">
                  {{ locale === 'en' ? selectedGame.levelEn : selectedGame.level }}
                </span>
              </div>
              <div
                class="flex-1 border-[3px] border-ink p-3 bg-warm-white shadow-[4px_4px_0_0_#1A1A1A] relative overflow-hidden"
              >
                <span
                  class="absolute top-0 left-0 right-0 h-[3px]"
                  :style="{ background: selectedGame.accentColor }"
                ></span>
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block mb-0.5 mt-1">PLAYTIME</span>
                <span class="font-display font-bold text-base" :style="{ color: selectedGame.accentColor }">
                  {{ locale === 'en' ? selectedGame.playtimeEn : selectedGame.playtime }}
                </span>
              </div>
            </div>

            <!-- ═══ 硬核战绩网格（核心升级区域）═══ -->
            <div>
              <div class="flex items-center gap-3 mb-3">
                <span class="font-display font-bold text-sm uppercase tracking-wide">
                  {{ locale === 'en' ? 'Combat Stats' : '硬核战绩' }}
                </span>
                <div class="flex-1 h-[2px] bg-ink"></div>
                <span
                  class="font-mono text-[8px] font-bold px-1.5 py-0.5 border-[2px] border-ink uppercase"
                  :style="{ background: selectedGame.accentColor + '25', color: selectedGame.accentColor }"
                >{{ Object.keys(selectedGame.stats ?? {}).length }} FIELDS</span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div
                  v-for="(val, key) in selectedGame.stats"
                  :key="key"
                  class="border-[3px] border-ink bg-warm-white shadow-[4px_4px_0_0_#1A1A1A]
                         relative overflow-hidden"
                  :class="hasDetail(val as string) ? 'cursor-pointer' : ''"
                  @click="hasDetail(val as string) && toggleStat(key as string)"
                >
                  <!-- 顶部彩色标记条 -->
                  <span
                    class="absolute top-0 left-0 right-0 h-[3px]"
                    :style="{ background: selectedGame.accentColor }"
                  ></span>

                  <!-- 主行：label + 值 + 展开箭头 -->
                  <div class="p-3 flex items-start justify-between gap-1">
                    <div class="min-w-0">
                      <span class="font-mono text-[8px] text-ink/40 uppercase leading-tight tracking-widest block mt-1 mb-1 truncate">
                        {{ key }}
                      </span>
                      <span
                        class="font-display font-bold text-sm leading-snug block truncate"
                        :style="{ color: selectedGame.accentColor }"
                      >{{ (val as string).split(/\s*[/|]\s*/)[0] }}</span>
                    </div>
                    <!-- 有明细才显示展开箭头 -->
                    <span
                      v-if="hasDetail(val as string)"
                      class="font-mono text-[10px] font-bold mt-2 flex-shrink-0 transition-transform duration-200 text-ink/50"
                      :class="expandedStats.has(key as string) ? 'rotate-180' : ''"
                    >▾</span>
                  </div>

                  <!-- 三级明细展开区域 -->
                  <Transition name="stat-expand">
                    <div
                      v-if="hasDetail(val as string) && expandedStats.has(key as string)"
                      class="stat-detail border-t-[2px] border-ink/20 bg-ink/[0.035]
                             shadow-inner-custom px-3 pb-3 pt-2 flex flex-col gap-1.5"
                    >
                      <div
                        v-for="item in parseDetail(val as string)"
                        :key="item.label"
                        class="flex items-center justify-between gap-2"
                      >
                        <span class="font-mono text-[7.5px] text-ink/45 uppercase tracking-wide truncate flex-1">
                          {{ item.label }}
                        </span>
                        <span
                          class="font-display font-bold text-[11px] flex-shrink-0"
                          :style="{ color: selectedGame.accentColor }"
                        >{{ item.val }}</span>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedGame.tags"
                :key="tag"
                class="font-mono text-[10px] font-bold px-2.5 py-1 border-[2px] border-ink uppercase tracking-wider
                       hover:border-ink transition-colors duration-150"
                :style="{ background: selectedGame.accentColor + '18', color: selectedGame.accentColor }"
              >{{ tag }}</span>
            </div>

            <!-- PM Insight 区域 -->
            <div v-if="selectedGame.reviewMarkdown" class="border-t-[3px] border-ink pt-5">
              <div class="flex items-center gap-3 mb-4">
                <span
                  class="font-display font-bold text-sm uppercase tracking-wide px-3 py-1
                         border-[3px] border-ink bg-pastel-yellow shadow-[3px_3px_0_0_#1A1A1A]"
                >PM INSIGHTS</span>
                <div class="flex-1 h-[2px] bg-ink/30"></div>
              </div>

              <!-- Loading -->
              <div v-if="reviewLoading" class="flex items-center justify-center py-10">
                <span class="font-mono text-xs text-ink/40 animate-pulse tracking-widest uppercase">
                  Loading analysis...
                </span>
              </div>

              <!-- Error -->
              <div
                v-else-if="reviewError"
                class="border-[3px] border-pastel-red bg-pastel-red/10 p-4 shadow-[3px_3px_0_0_#FF6B6B]"
              >
                <p class="font-mono text-xs text-ink/70">{{ reviewError }}</p>
              </div>

              <!-- Rendered Markdown -->
              <div
                v-else-if="reviewContent"
                class="pm-content prose prose-sm max-w-none
                       prose-headings:font-display prose-headings:font-bold prose-headings:text-ink
                       prose-p:font-mono prose-p:text-xs prose-p:leading-relaxed prose-p:text-ink/80
                       prose-strong:text-ink prose-strong:font-bold
                       prose-code:bg-ink/10 prose-code:px-1 prose-code:font-mono
                       prose-ul:list-disc prose-ul:pl-4 prose-li:font-mono prose-li:text-xs prose-li:text-ink/80"
                v-html="renderedMarkdown"
              ></div>

              <!-- Fallback Summary -->
              <div
                v-else
                class="border-[3px] border-ink/20 p-4 bg-warm-white shadow-[3px_3px_0_0_#1A1A1A22]"
              >
                <p class="font-mono text-xs text-ink/70 leading-relaxed">{{ selectedGame.reviewSummary }}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import MemphisCover from '@/components/MemphisCover.vue'

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

interface Props {
  isOpen: boolean
  selectedGame: LocalGame | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const { locale } = useI18n()

const reviewLoading = ref(false)
const reviewError   = ref('')
const reviewContent = ref('')
const bannerFailed  = ref(false)

// ── 三级折叠：记录哪些 stat key 处于展开状态 ─────────────────────────────────
const expandedStats = reactive<Set<string>>(new Set())

function toggleStat(key: string) {
  if (expandedStats.has(key)) expandedStats.delete(key)
  else expandedStats.add(key)
}

/** 判断某个 stat 值是否包含分隔符（/ 或 | 或换行），可展开为明细 */
function hasDetail(val: string): boolean {
  return /[/|\\n]/.test(String(val))
}

/** 将分隔符拆成明细行：`Steam: 450h / Mobile: 200h` → [{label:'Steam', val:'450h'}, ...] */
function parseDetail(val: string): { label: string; val: string }[] {
  return String(val)
    .split(/\s*[/|]\s*/)
    .filter(Boolean)
    .map(part => {
      const idx = part.indexOf(':')
      if (idx > -1) return { label: part.slice(0, idx).trim(), val: part.slice(idx + 1).trim() }
      return { label: '—', val: part.trim() }
    })
}

const renderedMarkdown = computed(() => {
  if (!reviewContent.value) return ''
  try {
    return marked.parse(reviewContent.value)
  } catch {
    return '<p>Failed to render markdown</p>'
  }
})

async function loadReview() {
  if (!props.selectedGame?.reviewMarkdown) {
    reviewContent.value = ''
    return
  }
  reviewLoading.value = true
  reviewError.value   = ''
  try {
    const res = await fetch(props.selectedGame.reviewMarkdown)
    if (!res.ok) throw new Error(`Failed to load review (${res.status})`)
    reviewContent.value = await res.text()
  } catch (err: any) {
    reviewError.value   = err.message || 'Unable to load review'
    reviewContent.value = ''
  } finally {
    reviewLoading.value = false
  }
}

watch(() => props.selectedGame, (newGame) => {
  bannerFailed.value  = false
  expandedStats.clear()          // 路由/游戏切换时重置折叠状态
  if (newGame) {
    loadReview()
  } else {
    reviewContent.value = ''
    reviewError.value   = ''
  }
})

function close() {
  emit('close')
}
</script>

<style scoped>
/* ── 三级 Stats 折叠展开动画 ── */
.stat-expand-enter-active {
  transition: max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  overflow: hidden;
}
.stat-expand-leave-active {
  transition: max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease;
  overflow: hidden;
}
.stat-expand-enter-from,
.stat-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.stat-expand-enter-to,
.stat-expand-leave-from {
  max-height: 200px;
  opacity: 1;
}

/* 内阴影模拟（CSS box-shadow inset） */
.shadow-inner-custom {
  box-shadow: inset 0 2px 6px rgba(26, 26, 26, 0.08);
}

/* ── 页面切换动画 ── */
.slide-panel-enter-active {
  transition: opacity 0.25s ease;
}
.slide-panel-leave-active {
  transition: opacity 0.2s ease;
}

/* Backdrop */
.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
}

/* 面板本身从右滑入 */
.slide-panel-enter-active .ml-auto {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-panel-leave-active .ml-auto {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-panel-enter-from .ml-auto,
.slide-panel-leave-to .ml-auto {
  transform: translateX(100%);
}

/* 自定义滚动条 */
.slide-panel-enter-active ::-webkit-scrollbar,
.ml-auto::-webkit-scrollbar {
  width: 6px;
}
.ml-auto::-webkit-scrollbar-track {
  background: #F5F5DC;
}
.ml-auto::-webkit-scrollbar-thumb {
  background: #1A1A1A;
}
.ml-auto::-webkit-scrollbar-thumb:hover {
  background: #000;
}

/* PM content prose 样式覆盖 */
.pm-content :deep(h1),
.pm-content :deep(h2),
.pm-content :deep(h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  padding-bottom: 4px;
  border-bottom: 2px solid #1A1A1A20;
}
.pm-content :deep(p) {
  margin-bottom: 0.75rem;
}
.pm-content :deep(ul) {
  margin-bottom: 0.75rem;
}
.pm-content :deep(li) {
  margin-bottom: 0.25rem;
}
</style>
