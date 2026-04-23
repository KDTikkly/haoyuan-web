<template>
  <div class="max-w-6xl mx-auto px-6 py-16">

    <!-- ── Page Header ── -->
    <div class="mb-16 border-b-[3px] border-ink pb-8">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-blue text-warm-white">
        <span class="w-2 h-2 rounded-full bg-warm-white"></span>
        {{ $t('projects.badge') }}
      </div>
      <h1 class="font-display font-extrabold text-5xl mb-3">{{ $t('projects.title') }}</h1>
      <p class="font-mono text-sm text-ink/60 tracking-widest uppercase">
        {{ $t('projects.subtitle') }}
      </p>
    </div>

    <!-- ── Filter Pills + Sort Toggle ── -->
    <div class="flex flex-wrap items-center gap-3 mb-10">
      <button
        v-for="tag in allTags"
        :key="tag"
        class="
          px-4 py-1.5
          font-mono text-xs font-bold tracking-wide uppercase
          border-2 border-ink
          transition-[transform,box-shadow,background-color] duration-150
        "
        :class="activeTag === tag
          ? 'bg-ink text-warm-beige shadow-none translate-x-[3px] translate-y-[3px]'
          : 'bg-warm-beige text-ink shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'"
        @click="toggleTag(tag)"
      >{{ tag }}</button>

      <!-- Divider -->
      <span class="w-px h-5 bg-ink/20 hidden sm:block"></span>

      <!-- Sort toggle -->
      <button
        class="
          flex items-center gap-1.5
          px-4 py-1.5
          font-mono text-xs font-bold tracking-wide uppercase
          border-2 border-ink
          transition-[transform,box-shadow,background-color] duration-150
          shadow-[3px_3px_0_0_#1A1A1A]
          hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]
          active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
        "
        :class="sortByDate ? 'bg-memphis-yellow text-ink' : 'bg-warm-beige text-ink'"
        @click="sortByDate = !sortByDate"
      >
        <span>{{ sortByDate ? '↓ 最新优先' : '默认排序' }}</span>
      </button>
    </div>

    <!-- ── Loading Skeleton ── -->
    <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="n in 4"
        :key="n"
        class="border-[3px] border-ink shadow-[5px_5px_0_0_#1A1A1A] h-72 animate-pulse bg-warm-beige"
      />
    </div>

    <!-- ── Error ── -->
    <div v-else-if="error" class="py-16 text-center border-[3px] border-dashed border-ink">
      <p class="font-mono text-sm text-ink/60">⚠ {{ $t('projects.error') }}：{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 border-2 border-ink font-mono text-xs shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-[transform,box-shadow] duration-150"
        @click="loadProjects"
      >{{ $t('projects.retry') }}</button>
    </div>

    <!-- ── Grid ── -->
    <TransitionGroup
      v-else
      name="cards"
      tag="div"
      class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      <ProjectCard
        v-for="p in filtered"
        :key="p.id"
        :project="p"
        @open="activeProject = p"
      />
    </TransitionGroup>

    <!-- ── Empty State ── -->
    <div
      v-if="!loading && !error && filtered.length === 0"
      class="py-24 text-center border-[3px] border-dashed border-ink"
    >
      <p class="font-mono text-ink/60">No projects found for "{{ activeTag }}".</p>
    </div>

    <ProjectSlideOver
      :project="activeProject"
      :visible="!!activeProject"
      @close="activeProject = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectCard from '@/components/ProjectCard.vue'
import ProjectSlideOver from '@/components/ProjectSlideOver.vue'
import { fetchProjects } from '@/api/projectService'
import type { Project } from '@/types/project'

const { locale } = useI18n()

const projects      = ref<Project[]>([])
const loading       = ref(true)
const error         = ref('')
const activeTag     = ref('All')
const activeProject = ref<Project | null>(null)
const sortByDate    = ref(false)

// Toggle：再次点击已激活的 tag 时回退到 All
function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? 'All' : tag
}

const allTags = computed(() => {
  const tags = new Set<string>(['All'])
  projects.value.forEach(p => p.tags.forEach(t => tags.add(t)))
  return [...tags]
})

const filtered = computed(() => {
  let list = activeTag.value === 'All'
    ? projects.value
    : projects.value.filter(p => p.tags.includes(activeTag.value))
  if (sortByDate.value) {
    list = [...list].sort((a, b) => {
      const da = (a as any).date ?? ''
      const db = (b as any).date ?? ''
      return db.localeCompare(da) // newest first
    })
  }
  return list
})

async function loadProjects() {
  loading.value = true
  error.value = ''
  try {
    projects.value = await fetchProjects()
  } catch (e: any) {
    error.value = e?.message ?? '未知错误'
  } finally {
    loading.value = false
  }
}

onMounted(loadProjects)

// Re-fetch when locale changes
watch(locale, loadProjects)
</script>

<style scoped>
.cards-enter-active { transition: all 0.3s ease; }
.cards-leave-active { transition: all 0.2s ease; position: absolute; }
.cards-enter-from   { opacity: 0; transform: translateY(12px) scale(0.95); }
.cards-leave-to     { opacity: 0; transform: scale(0.95); }
</style>
