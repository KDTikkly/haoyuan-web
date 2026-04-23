<template>
  <!--
    AIVideoPlayer.vue
    「解剖式」AI 工作流视频播放器
    左侧: 自定义视频播放器  |  右侧: 时间轴工作流节点同步高亮
    Memphis × Brutalist 设计语言
  -->
  <div
    class="border-[3px] border-ink bg-warm-beige shadow-[8px_8px_0_0_#1A1A1A]
           flex flex-col lg:flex-row overflow-hidden"
  >
    <!-- ── 左侧：视频播放器 ── -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Video wrapper -->
      <div class="relative bg-ink overflow-hidden" style="aspect-ratio: 16/9;">
        <video
          ref="videoEl"
          :src="src"
          class="w-full h-full object-contain"
          @timeupdate="onTimeUpdate"
          @loadedmetadata="onMetadata"
          @play="playing = true"
          @pause="playing = false"
          @ended="playing = false"
        />

        <!-- Big play overlay (initial state) -->
        <div
          v-if="!started"
          class="absolute inset-0 flex items-center justify-center cursor-pointer"
          @click="togglePlay"
        >
          <div
            class="w-20 h-20 border-[3px] border-warm-white bg-memphis-yellow
                   flex items-center justify-center
                   shadow-[5px_5px_0_0_rgba(255,255,255,0.4)]
                   hover:scale-105 transition-transform"
          >
            <svg viewBox="0 0 24 24" class="w-10 h-10 fill-ink ml-1">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        <!-- Current node overlay badge -->
        <Transition name="badge-pop">
          <div
            v-if="currentNode && started"
            class="absolute top-3 left-3 flex items-center gap-2
                   border-[3px] border-ink px-3 py-1.5
                   shadow-[3px_3px_0_0_#1A1A1A]"
            :style="{ backgroundColor: currentNode.color ?? '#FFD600' }"
          >
            <span class="font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
              {{ currentNode.tool }}
            </span>
          </div>
        </Transition>
      </div>

      <!-- Controls bar -->
      <div class="flex-shrink-0 border-t-[3px] border-ink px-4 py-3 bg-ink flex flex-col gap-2">
        <!-- Progress bar -->
        <div
          class="relative w-full h-3 border-2 border-warm-white/30 cursor-pointer bg-warm-white/10 overflow-hidden"
          @click="seekTo"
          ref="progressBar"
        >
          <!-- Chapter markers -->
          <div
            v-for="node in timeline"
            :key="node.id"
            class="absolute top-0 bottom-0 w-[3px]"
            :style="{
              left: duration ? (node.startTime / duration * 100) + '%' : '0%',
              backgroundColor: node.color ?? '#FFD600',
            }"
          />
          <!-- Fill -->
          <div
            class="absolute top-0 left-0 bottom-0 bg-memphis-yellow transition-[width] duration-100"
            :style="{ width: duration ? (currentTime / duration * 100) + '%' : '0%' }"
          />
        </div>

        <!-- Buttons row -->
        <div class="flex items-center gap-3">
          <!-- Play/Pause -->
          <button
            class="w-8 h-8 border-2 border-warm-white/40 flex items-center justify-center
                   text-warm-white hover:bg-warm-white/10 transition-colors"
            @click="togglePlay"
          >
            <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
              <path v-if="!playing" d="M8 5v14l11-7z"/>
              <path v-else d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>

          <!-- Speed -->
          <button
            class="font-mono text-[10px] text-warm-white/60 border border-warm-white/20 px-2 py-0.5
                   hover:text-warm-white hover:border-warm-white/60 transition-colors"
            @click="cycleSpeed"
          >{{ speed }}×</button>

          <!-- Time display -->
          <span class="font-mono text-xs text-warm-white/60 ml-auto">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── 右侧：工作流时间轴 ── -->
    <div
      class="w-full lg:w-72 xl:w-80 border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-ink
             flex flex-col bg-warm-white overflow-hidden"
    >
      <!-- Panel header -->
      <div class="flex-shrink-0 px-4 py-3 border-b-[3px] border-ink bg-warm-beige flex items-center gap-2">
        <div class="w-3 h-3 bg-memphis-yellow border border-ink rotate-45"></div>
        <span class="font-mono text-xs font-bold uppercase tracking-wider">AI Workflow</span>
        <span class="ml-auto font-mono text-[10px] text-ink/40">{{ timeline.length }} nodes</span>
      </div>

      <!-- Nodes list -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <button
          v-for="(node, idx) in timeline"
          :key="node.id"
          class="group w-full text-left border-[3px] border-ink p-3
                 transition-all duration-200 cursor-pointer
                 flex items-start gap-3"
          :class="activeNodeId === node.id
            ? 'shadow-[4px_4px_0_0_#1A1A1A] -translate-x-[1px] -translate-y-[1px]'
            : 'shadow-none hover:shadow-[3px_3px_0_0_#1A1A1A] hover:-translate-x-[1px] hover:-translate-y-[1px]'"
          :style="{ backgroundColor: activeNodeId === node.id ? (node.color ?? '#FFD600') : '' }"
          @click="jumpToNode(node)"
        >
          <!-- Index badge -->
          <div
            class="flex-shrink-0 w-6 h-6 border-2 border-ink flex items-center justify-center
                   font-mono text-[10px] font-bold"
            :style="{ backgroundColor: node.color ?? '#FFD600' }"
          >{{ idx + 1 }}</div>

          <!-- Node info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-1">
              <span class="font-display font-bold text-sm leading-tight">{{ node.tool }}</span>
              <span class="flex-shrink-0 font-mono text-[10px] text-ink/50 mt-0.5">
                {{ formatTime(node.startTime) }}
              </span>
            </div>
            <p v-if="node.description" class="font-sans text-xs text-ink/60 mt-0.5 leading-relaxed">
              {{ node.description }}
            </p>
            <!-- Tags -->
            <div v-if="node.tags?.length" class="flex flex-wrap gap-1 mt-1.5">
              <span
                v-for="tag in node.tags"
                :key="tag"
                class="font-mono text-[9px] border border-ink px-1.5 py-0.5 bg-warm-beige"
              >{{ tag }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TimelineNode {
  id: string
  startTime: number        // seconds from start
  endTime?: number         // optional end, defaults to next node's start
  tool: string             // e.g. "Midjourney v6"
  description?: string
  color?: string           // background tint, defaults to memphis-yellow
  tags?: string[]          // e.g. ["prompt engineering", "img2img"]
}

interface Props {
  src: string              // video URL
  timeline?: TimelineNode[]
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  timeline: () => [],
  autoplay: false,
})

// ── State ──────────────────────────────────────────────────────────────────────
const videoEl = ref<HTMLVideoElement | null>(null)
const progressBar = ref<HTMLElement | null>(null)
const playing = ref(false)
const started = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const speed = ref(1)
const SPEEDS = [0.5, 1, 1.5, 2]

// ── Computed ───────────────────────────────────────────────────────────────────
const activeNodeId = computed(() => {
  const t = currentTime.value
  for (let i = props.timeline.length - 1; i >= 0; i--) {
    if (t >= props.timeline[i].startTime) return props.timeline[i].id
  }
  return null
})

const currentNode = computed(() =>
  props.timeline.find(n => n.id === activeNodeId.value) ?? null
)

// ── Methods ────────────────────────────────────────────────────────────────────
function togglePlay() {
  if (!videoEl.value) return
  started.value = true
  if (playing.value) {
    videoEl.value.pause()
  } else {
    videoEl.value.play()
  }
}

function onTimeUpdate() {
  if (videoEl.value) currentTime.value = videoEl.value.currentTime
}

function onMetadata() {
  if (videoEl.value) duration.value = videoEl.value.duration
}

function seekTo(e: MouseEvent) {
  if (!progressBar.value || !videoEl.value || !duration.value) return
  const rect = progressBar.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  videoEl.value.currentTime = ratio * duration.value
  started.value = true
}

function jumpToNode(node: TimelineNode) {
  if (!videoEl.value) return
  videoEl.value.currentTime = node.startTime
  started.value = true
  if (!playing.value) videoEl.value.play()
}

function cycleSpeed() {
  const idx = SPEEDS.indexOf(speed.value)
  speed.value = SPEEDS[(idx + 1) % SPEEDS.length]
  if (videoEl.value) videoEl.value.playbackRate = speed.value
}

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Auto-scroll active node into view
watch(activeNodeId, (id) => {
  if (!id) return
  const el = document.querySelector(`[data-node-id="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})
</script>

<style scoped>
.badge-pop-enter-active { transition: all 0.2s ease-out; }
.badge-pop-leave-active { transition: all 0.15s ease-in; }
.badge-pop-enter-from  { opacity: 0; transform: translateY(-6px) scale(0.9); }
.badge-pop-leave-to    { opacity: 0; transform: translateY(-6px) scale(0.9); }
</style>
