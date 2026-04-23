<template>
  <!-- ════════════════════════════════════════════
       游戏详情侧滑面板 (Brutalist 风格)
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="slide-panel">
      <div
        v-if="isOpen && selectedGame"
        class="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          @click="close"
        ></div>

        <!-- Panel Content -->
        <div
          class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-warm-white
                 border-[3px] border-ink shadow-hard
                 mx-4 flex flex-col"
        >
          <!-- Close Button -->
          <button
            @click="close"
            class="absolute top-3 right-3 z-10 w-10 h-10 bg-warm-white
                   border-[2px] border-ink flex items-center justify-center
                   hover:bg-ink hover:text-warm-white transition-colors duration-150"
            aria-label="Close"
          >✕</button>

          <!-- Header with Cover -->
          <div class="relative h-48 overflow-hidden border-b-[3px] border-ink">
            <!-- Cover Image -->
            <img
              v-if="selectedGame.coverUrl"
              :src="selectedGame.coverUrl"
              :alt="locale === 'en' ? selectedGame.titleEn : selectedGame.title"
              class="w-full h-full object-cover"
              @error="(e) => (e.currentTarget.style.display = 'none')"
            />
            <!-- Fallback Background -->
            <div
              v-else
              class="absolute inset-0"
              :style="{ background: selectedGame.accentColor + '28' }"
            ></div>
            <!-- Title Overlay -->
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-ink/90 to-ink/40">
              <div class="flex items-center gap-2 mb-1">
                <!-- Platform Badge -->
                <span
                  class="font-mono text-[9px] font-bold px-2 py-0.5 border border-warm-white/40
                         bg-warm-white/20 backdrop-blur-sm text-warm-white uppercase tracking-wider"
                >{{ selectedGame.platform }}</span>
              </div>
              <h2 class="font-display font-extrabold text-2xl text-warm-white leading-tight">
                {{ locale === 'en' ? selectedGame.titleEn : selectedGame.title }}
              </h2>
            </div>
          </div>

          <!-- Body -->
          <div class="p-5 space-y-5">
            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="(val, key) in selectedGame.stats"
                :key="key"
                class="border-[2px] border-ink/20 p-3 bg-warm-white"
              >
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block">{{ key }}</span>
                <span
                  class="font-display font-bold text-lg leading-none block mt-1"
                  :style="{ color: selectedGame.accentColor }"
                >{{ val }}</span>
              </div>
            </div>

            <!-- Player Info -->
            <div class="flex gap-4 border-[2px] border-ink/30 p-3 bg-warm-white">
              <div class="flex-1">
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block">NICKNAME</span>
                <span class="font-display font-bold text-base">{{ selectedGame.nickname }}</span>
              </div>
              <div class="flex-1">
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block">UID</span>
                <span class="font-mono text-base">{{ selectedGame.uid || '—' }}</span>
              </div>
            </div>

            <!-- Level & Playtime -->
            <div class="flex gap-4">
              <div class="flex-1 border-[2px] border-ink/20 p-3 bg-warm-white">
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block">LEVEL</span>
                <span class="font-display font-bold text-base">{{ locale === 'en' ? selectedGame.levelEn : selectedGame.level }}</span>
              </div>
              <div class="flex-1 border-[2px] border-ink/20 p-3 bg-warm-white">
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider block">PLAYTIME</span>
                <span class="font-display font-bold text-base">{{ locale === 'en' ? selectedGame.playtimeEn : selectedGame.playtime }}</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedGame.tags"
                :key="tag"
                class="font-mono text-[10px] px-2 py-1 border-[2px] border-ink/40
                       hover:border-ink transition-colors duration-150"
              >{{ tag }}</span>
            </div>

            <!-- Review Content -->
            <div v-if="selectedGame.reviewMarkdown" class="border-t-[2px] border-ink/20 pt-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="font-display font-bold text-sm uppercase tracking-wide">PM Insights</span>
                <span class="h-[2px] flex-1 bg-ink/20"></span>
              </div>

              <!-- Loading State -->
              <div v-if="reviewLoading" class="flex items-center justify-center py-8">
                <span class="font-mono text-xs text-ink/40 animate-pulse">Loading analysis...</span>
              </div>

              <!-- Error State -->
              <div v-else-if="reviewError" class="border-[2px] border-pastel-red/50 bg-pastel-red/10 p-4">
                <p class="font-mono text-xs text-ink/70 mb-1">{{ reviewError }}</p>
              </div>

              <!-- Rendered Markdown -->
              <div
                v-else-if="reviewContent"
                class="prose prose-sm prose-invert max-w-none
                       prose-headings:font-display prose-headings:font-bold prose-headings:text-ink
                       prose-p:font-mono prose-p:text-xs prose-p:leading-relaxed
                       prose-strong:text-ink prose-code:bg-ink/10 prose-code:px-1
                       prose-ul:list-disc prose-ul:pl-4 prose-li:font-mono prose-li:text-xs"
                v-html="renderedMarkdown"
              ></div>

              <!-- Fallback Summary -->
              <div v-else class="border-[2px] border-ink/20 p-4 bg-warm-white">
                <p class="font-mono text-xs text-ink/70">{{ selectedGame.reviewSummary }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'

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

// Review state
const reviewLoading = ref(false)
const reviewError = ref('')
const reviewContent = ref('')

// Rendered markdown
const renderedMarkdown = computed(() => {
  if (!reviewContent.value) return ''
  try {
    return marked.parse(reviewContent.value)
  } catch {
    return '<p>Failed to render markdown</p>'
  }
})

// Load review markdown
async function loadReview() {
  if (!props.selectedGame?.reviewMarkdown) {
    reviewContent.value = ''
    return
  }

  reviewLoading.value = true
  reviewError.value = ''

  try {
    const res = await fetch(props.selectedGame.reviewMarkdown)
    if (!res.ok) {
      throw new Error(`Failed to load review (${res.status})`)
    }
    const text = await res.text()
    reviewContent.value = text
  } catch (err: any) {
    console.error('[GameDetail] Failed to load review:', err)
    reviewError.value = err.message || 'Unable to load review'
    reviewContent.value = ''
  } finally {
    reviewLoading.value = false
  }
}

// Watch game changes
watch(() => props.selectedGame, (newGame) => {
  if (newGame) {
    loadReview()
  } else {
    reviewContent.value = ''
    reviewError.value = ''
  }
})

function close() {
  emit('close')
}
</script>

<style scoped>
/* Slide panel animation */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: opacity 0.3s ease;
}

.slide-panel-enter-active > div:last-child,
.slide-panel-leave-active > div:last-child {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
}

.slide-panel-enter-from > div:last-child,
.slide-panel-leave-to > div:last-child {
  transform: translateY(20px) scale(0.98);
}

/* Custom scrollbar */
:deep(.overflow-y-auto)::-webkit-scrollbar {
  width: 8px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: #F5F5DC;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
  background: #1A1A1A;
  border-radius: 0;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: #000;
}
</style>
