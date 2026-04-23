<template>
  <Teleport to="body">
    <Transition name="exp-slideover">
      <div
        v-if="visible && item"
        class="fixed inset-0 z-[100] flex items-stretch justify-end"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" @click="$emit('close')" />

        <!-- Panel -->
        <aside
          class="relative z-10 w-full sm:max-w-2xl bg-warm-white flex flex-col overflow-hidden"
          style="border-left: 3px solid #1A1A1A; box-shadow: -8px 0 0 0 #1A1A1A;"
        >
          <!-- Header -->
          <div
            class="flex items-start justify-between p-5 flex-shrink-0"
            style="border-bottom: 3px solid #1A1A1A;"
          >
            <div class="flex items-start gap-3 min-w-0 flex-1 pr-4">
              <!-- 色块 -->
              <span
                class="mt-1 w-4 h-4 flex-shrink-0 border-[3px] border-ink"
                :style="{ background: item.color ?? '#FFD600' }"
              ></span>
              <div class="min-w-0">
                <!-- Type tag -->
                <div
                  class="inline-flex items-center gap-1.5 border-2 border-ink px-2 py-0.5
                         font-mono text-[9px] font-bold mb-2"
                  :style="{ background: item.color ?? '#FFD600' }"
                >
                  {{ item.type ?? 'EXPERIENCE' }}
                </div>
                <h2 class="font-display font-extrabold text-xl leading-tight text-ink mb-0.5">
                  {{ item.title }}
                </h2>
                <p class="font-mono text-[11px] text-ink/60">
                  {{ item.organization }}
                  <span v-if="item.period"> · {{ item.period }}</span>
                </p>
              </div>
            </div>
            <!-- 关闭按钮 -->
            <button
              class="flex-shrink-0 w-10 h-10 flex items-center justify-center
                     font-display font-black text-xl
                     border-[3px] border-ink bg-warm-beige
                     shadow-[3px_3px_0_0_#1A1A1A]
                     hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]
                     active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                     transition-[transform,box-shadow] duration-150"
              @click="$emit('close')"
              aria-label="关闭"
            >×</button>
          </div>

          <!-- 顶部强调斜纹条 -->
          <div
            class="h-2 w-full flex-shrink-0"
            :style="{
              background: `repeating-linear-gradient(45deg,
                ${item.color ?? '#FFD600'} 0px, ${item.color ?? '#FFD600'} 6px,
                #1A1A1A 6px, #1A1A1A 12px)`
            }"
            aria-hidden="true"
          ></div>

          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">

            <!-- shortDesc -->
            <p
              v-if="item.shortDesc"
              class="font-mono text-sm text-ink/70 leading-relaxed border-l-[3px] pl-4"
              :style="{ borderColor: item.color ?? '#FFD600' }"
            >
              {{ item.shortDesc }}
            </p>

            <!-- Markdown 富文本 -->
            <div
              v-if="markdownHtml"
              class="prose prose-sm max-w-none"
              v-html="markdownHtml"
            />
            <div
              v-else-if="contentError"
              class="border-[2px] border-dashed border-ink/30 p-4 font-mono text-xs text-ink/40 text-center"
            >
              ⚠ 内容加载失败
            </div>

            <!-- Bullets -->
            <ul v-if="item.bullets?.length && !markdownHtml" class="space-y-3">
              <li
                v-for="(b, i) in item.bullets"
                :key="i"
                class="flex items-start gap-3"
              >
                <span
                  class="mt-[5px] flex-shrink-0 w-2.5 h-2.5 border-[2px] border-ink"
                  :style="{ background: item.color ?? '#FFD600' }"
                ></span>
                <span class="font-mono text-sm text-ink/80 leading-relaxed">{{ b }}</span>
              </li>
            </ul>

            <!-- Tags -->
            <div
              v-if="item.tags?.length"
              class="flex flex-wrap gap-2"
              style="border-top: 2px solid #1A1A1A20; padding-top: 12px;"
            >
              <span
                v-for="(t, i) in item.tags"
                :key="i"
                class="px-2.5 py-0.5 font-mono text-[10px] font-bold border-[2px] border-ink"
                :style="{ background: item.color ?? '#FFD600' }"
              >{{ t }}</span>
            </div>

            <!-- Media（B站 / 图片） -->
            <div
              v-if="item.media?.length"
              class="space-y-4"
              style="border-top: 3px solid #1A1A1A; padding-top: 20px;"
            >
              <h3 class="font-display font-bold text-base text-ink">
                {{ 'Media' }}
              </h3>
              <template v-for="(m, mi) in item.media" :key="mi">
                <div v-if="m.type === 'bilibili'" class="aspect-video border-[3px] border-ink overflow-hidden">
                  <iframe
                    :src="bilibiliEmbed(m.url)"
                    class="w-full h-full"
                    allowfullscreen
                    frameborder="0"
                  />
                </div>
                <div v-else-if="m.type === 'image'" class="border-[3px] border-ink overflow-hidden">
                  <img :src="m.url" :alt="m.caption ?? ''" class="w-full object-cover" />
                  <p v-if="m.caption" class="font-mono text-[10px] text-ink/50 px-3 py-2 border-t-[2px] border-ink/20">
                    {{ m.caption }}
                  </p>
                </div>
              </template>
            </div>

            <!-- 外部链接 -->
            <div
              v-if="item.links?.length"
              class="flex flex-wrap gap-3"
              style="border-top: 3px solid #1A1A1A; padding-top: 20px;"
            >
              <a
                v-for="(link, li) in item.links"
                :key="li"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="px-4 py-2 font-mono text-xs font-bold
                       border-[3px] border-ink bg-ink text-warm-white
                       shadow-[4px_4px_0_0_#FFD600]
                       hover:shadow-[2px_2px_0_0_#FFD600] hover:translate-x-[2px] hover:translate-y-[2px]
                       active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                       transition-[transform,box-shadow] duration-150 inline-block"
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

<script setup lang="ts">
import { ref, watch } from 'vue'
import { marked } from 'marked'

export interface ExperienceMedia {
  type: 'bilibili' | 'image'
  url: string
  caption?: string
}

export interface ExperienceLink {
  label: string
  url: string
}

export interface ExperienceItem {
  id: string
  type?: string              // 显示在 tag 上，如 "EDUCATION" / "INTERNSHIP"
  title: string              // 卡片主标题（公司/学校名）
  organization?: string      // 机构/公司（header 副标题）
  role?: string              // 职位/学位
  period?: string
  color?: string             // 强调色
  shortDesc?: string         // 一句话简介
  content_path?: string      // Markdown 文件路径（可选）
  bullets?: string[]         // Bullet 列表（无 content_path 时显示）
  tags?: string[]
  media?: ExperienceMedia[]
  links?: ExperienceLink[]
}

const props = defineProps<{
  item: ExperienceItem | null
  visible: boolean
}>()

defineEmits<{ close: [] }>()

const markdownHtml = ref('')
const contentError = ref(false)

watch(() => [props.visible, props.item], async ([vis, item]) => {
  const it = item as ExperienceItem | null
  if (!vis || !it) {
    markdownHtml.value = ''
    contentError.value = false
    return
  }
  if (it.content_path) {
    contentError.value = false
    try {
      const res = await fetch(it.content_path)
      const ct = res.headers.get('content-type') ?? ''
      if (!res.ok || ct.includes('text/html')) {
        contentError.value = true
        return
      }
      const md = await res.text()
      if (md.trimStart().startsWith('<!')) {
        contentError.value = true
        return
      }
      markdownHtml.value = await marked.parse(md)
    } catch {
      contentError.value = true
    }
  } else {
    markdownHtml.value = ''
  }
}, { immediate: true })

function bilibiliEmbed(url: string) {
  const m = url.match(/BV[\w]+/)
  return m ? `https://player.bilibili.com/player.html?bvid=${m[0]}&autoplay=0` : url
}
</script>

<style scoped>
.exp-slideover-enter-active,
.exp-slideover-leave-active {
  transition: opacity 0.25s ease;
}
.exp-slideover-enter-active aside,
.exp-slideover-leave-active aside {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.exp-slideover-enter-from { opacity: 0; }
.exp-slideover-leave-to   { opacity: 0; }
.exp-slideover-enter-from aside { transform: translateX(100%); }
.exp-slideover-leave-to   aside { transform: translateX(100%); }

/* prose 基础样式 */
:deep(.prose h3) {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-weight: 800;
  font-size: 15px;
  margin-bottom: 8px;
  color: #1A1A1A;
}
:deep(.prose p) {
  font-size: 13px;
  line-height: 1.7;
  color: #1A1A1A90;
  margin-bottom: 10px;
}
:deep(.prose ul) {
  padding-left: 20px;
  list-style-disc;
  font-size: 13px;
  color: #1A1A1A80;
  line-height: 1.6;
}
:deep(.prose strong) {
  font-weight: 700;
  color: #1A1A1A;
}
:deep(.prose a) {
  color: #2979FF;
  text-decoration: underline;
}
</style>
