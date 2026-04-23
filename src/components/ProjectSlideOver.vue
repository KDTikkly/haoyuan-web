<template>
  <!-- Project detail slide-over / fullscreen modal -->
  <Teleport to="body">
    <Transition name="slideover">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-stretch justify-end"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" @click="close" />

        <!-- Panel -->
        <aside
          class="relative z-10 w-full sm:max-w-2xl bg-warm-white border-l-3 border-ink
                 flex flex-col overflow-hidden"
          style="box-shadow: -8px 0 0 0 #1A1A1A;"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b-3 border-ink flex-shrink-0">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in project?.tags"
                :key="tag"
                class="pill text-xs bg-warm-beige"
              >{{ tag }}</span>
            </div>
            <button
              class="btn-hard w-10 h-10 p-0 text-xl leading-none"
              @click="close"
              aria-label="Close"
            >×</button>
          </div>

          <!-- Scrollable content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Title -->
            <h2 class="font-display font-bold text-3xl leading-snug text-ink">
              {{ project?.title }}
            </h2>
            <p class="font-mono text-sm text-ink-light">{{ project?.subtitle }}</p>

            <!-- Cover：优先 cover，失败则用 galleryImage -->
            <div v-if="coverSrc" class="border-3 border-ink overflow-hidden">
              <img
                :src="coverSrc"
                :alt="project?.title"
                class="w-full object-cover"
                @error="onCoverError"
              />
            </div>

            <!-- Description -->
            <p class="text-base leading-relaxed text-ink-light">{{ project?.description }}</p>

            <!-- Markdown content -->
            <div
              v-if="markdownHtml"
              class="prose prose-sm max-w-none border-t-3 border-ink pt-6"
              v-html="markdownHtml"
            />
            <!-- Content load error -->
            <div
              v-else-if="contentError"
              class="border-t-3 border-ink pt-6 border-[3px] border-dashed border-ink/40 p-6 font-mono text-sm text-ink/50 text-center"
            >
              ⚠ 内容加载失败，请检查 Markdown 文件是否存在。
            </div>

            <!-- Media embeds -->
            <div v-if="project?.media?.length" class="space-y-4 border-t-3 border-ink pt-6">
              <h3 class="font-display font-bold text-lg">媒体 / Media</h3>
              <template v-for="item in project.media" :key="item.url">
                <div v-if="item.type === 'bilibili'" class="aspect-video border-3 border-ink overflow-hidden">
                  <iframe
                    :src="bilibiliEmbed(item.url)"
                    class="w-full h-full"
                    allowfullscreen
                    frameborder="0"
                  />
                </div>
                <div v-else-if="item.type === 'image'" class="border-3 border-ink overflow-hidden">
                  <img :src="item.url" class="w-full object-cover" />
                </div>
              </template>
            </div>

            <!-- External links -->
            <div v-if="project?.external_links?.length" class="flex flex-wrap gap-3 border-t-3 border-ink pt-6">
              <a
                v-for="link in project.external_links"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-hard px-4 py-2 text-sm"
              >
                {{ link.label }} ↗
              </a>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  project: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

// ── 封面图 fallback ──────────────────────────────────────────────
const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
const coverFailed = ref(false)

// 重置 coverFailed 当项目切换时
watch(() => props.project?.id, () => { coverFailed.value = false })

const coverSrc = computed(() => {
  if (!props.project) return null
  if (!coverFailed.value && props.project.cover) {
    return apiBase + props.project.cover
  }
  if (props.project.galleryImage) {
    return `/assets/gallery/${encodeURIComponent(props.project.galleryImage)}`
  }
  return null
})

function onCoverError() {
  coverFailed.value = true
}

const markdownHtml = ref('')
const contentError = ref(false)

watch(() => [props.visible, props.project], async ([vis, proj]) => {
  if (!vis || !proj) { markdownHtml.value = ''; contentError.value = false; return }
  if (proj.content_path) {
    contentError.value = false
    try {
      const res = await fetch(proj.content_path)
      // Guard: ensure response is actually Markdown/plain text, not an HTML fallback
      const contentType = res.headers.get('content-type') ?? ''
      if (!res.ok || contentType.includes('text/html')) {
        contentError.value = true
        markdownHtml.value = ''
        return
      }
      const md = await res.text()
      // Secondary guard: if the response starts with <!DOCTYPE it's an HTML fallback
      if (md.trimStart().startsWith('<!')) {
        contentError.value = true
        markdownHtml.value = ''
        return
      }
      markdownHtml.value = await marked.parse(md)
    } catch {
      contentError.value = true
      markdownHtml.value = ''
    }
  }
}, { immediate: true })

function close() { emit('close') }

function bilibiliEmbed(url) {
  // Convert bilibili watch URL to embed URL
  const match = url.match(/BV[\w]+/)
  return match ? `https://player.bilibili.com/player.html?bvid=${match[0]}&autoplay=0` : url
}
</script>

<style scoped>
.slideover-enter-active, .slideover-leave-active {
  transition: opacity 0.25s ease;
}
.slideover-enter-active aside, .slideover-leave-active aside {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.slideover-enter-from { opacity: 0; }
.slideover-leave-to   { opacity: 0; }
.slideover-enter-from aside { transform: translateX(100%); }
.slideover-leave-to   aside { transform: translateX(100%); }
</style>
