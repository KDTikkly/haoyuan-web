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

            <!-- ── Volumetric Optics Portal (Web3 / Cosmolyra only) ──────── -->
            <!--
              降维反差设计：
              外层严格保持 3px 黑色硬边框 + 硬偏移阴影（二维 Memphis 语言）
              内层 canvas 是体积雾 Ray Marching（高维光学观察口）
              两者对立共存，形成 PDM 架构的核心视觉张力。
            -->
            <div
              v-if="isWeb3Project"
              ref="volContainerRef"
              class="
                relative overflow-hidden
                border-[3px] border-ink
                shadow-[5px_5px_0_0_#1A1A1A]
                bg-black
              "
              style="height: 220px;"
              aria-label="Cosmolyra ZK-Physics volumetric render"
            >
              <!-- ZK-Physics 状态标注 — 二维 Memphis 标签浮于三维体积雾之上 -->
              <div class="
                absolute top-3 left-3 z-10
                flex items-center gap-1.5
                px-2 py-1
                border-2 border-ink bg-memphis-yellow
                font-mono text-[10px] font-bold tracking-widest uppercase
                select-none pointer-events-none
              ">
                <span
                  class="w-1.5 h-1.5 rounded-full bg-ink animate-pulse"
                  style="animation-duration: 1.4s;"
                />
                ZK-PHYSICS · LIVE
              </div>

              <!-- 右上角 Dispersion 数值读出 -->
              <div class="
                absolute top-3 right-3 z-10
                px-2 py-1
                border-2 border-ink bg-black/70
                font-mono text-[10px] font-bold tracking-widest uppercase text-white
                select-none pointer-events-none
              ">
                Ω {{ zkDispersionDisplay }}
              </div>

              <!-- 底部光强条 — 二维进度条映射三维光柱强度 -->
              <div class="
                absolute bottom-0 left-0 right-0 z-10
                h-[3px] bg-ink/20
                border-t-[1px] border-ink/30
              ">
                <div
                  class="h-full bg-memphis-yellow transition-all duration-300"
                  :style="{ width: (zkIntensity / 3.0 * 100).toFixed(1) + '%' }"
                />
              </div>
            </div>

            <!-- Cover -->
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import { coverRotateIndex, GALLERY_URLS } from '@/utils/cloudinaryFallbackPool'
import { VolumetricEngine } from '@/utils/VolumetricEngine.js'

const props = defineProps({
  project: { type: Object, default: null },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

// ── 封面图（与 ProjectCard 同步轮换）─────────────────────────────
// 构建与 ProjectCard 完全相同的 rotatePool，确保 Card 与 SlideOver 显示同一张
const rotatePool = computed(() => {
  if (!props.project) return []
  const hash = Array.from(props.project.id).reduce((a, c) => a + c.charCodeAt(0), 0)
  const g1 = GALLERY_URLS[(hash) % GALLERY_URLS.length]
  const g2 = GALLERY_URLS[(hash + 7) % GALLERY_URLS.length]
  const g3 = GALLERY_URLS[(hash + 17) % GALLERY_URLS.length]
  const pool = []
  if (props.project.cover) pool.push(props.project.cover)
  pool.push(g1, g2, g3)
  return pool
})

const imgError = ref(false)
watch(() => props.project?.id, () => { imgError.value = false })

const coverSrc = computed(() => {
  if (!props.project) return null
  const pool = rotatePool.value
  if (!pool.length) return null
  const base = Array.from(props.project.id).reduce((a, c) => a + c.charCodeAt(0), 0)
  if (!imgError.value) {
    return pool[(base + coverRotateIndex.value) % pool.length]
  }
  // 图片失败时跳到下一张
  const failedIdx = (base + coverRotateIndex.value) % pool.length
  return pool[(failedIdx + 1) % pool.length]
})

function onCoverError() { imgError.value = true }

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

// ── Volumetric Engine (Cosmolyra / Web3 观察口) ───────────────────
/**
 * 仅在带有 'Web3' tag 的项目中激活体积引擎。
 * Cosmolyra 是当前唯一的 Web3 项目，其他项目不触发 WebGL 上下文。
 */
const isWeb3Project = computed(() =>
  !!props.project?.tags?.includes('Web3')
)

const volContainerRef = ref(null)   // 挂载目标 DOM 节点
let   volEngine       = null        // VolumetricEngine 实例
let   zkInterval      = null        // ZK-Physics 波动定时器

// ZK-Physics 状态 — 对外暴露给模板的响应式读数
const zkIntensity        = ref(1.0)   // 0.2 ~ 3.0，驱动 uLightIntensity
const zkDispersionDisplay = computed(() =>
  zkIntensity.value.toFixed(2)
)

/**
 * mountVolumetric()
 * 挂载引擎并启动 ZK-Physics 波动模拟。
 * 波动公式：
 *   base    = 慢速正弦 (周期 8s, 振幅 0.6)
 *   pulse   = 快速窄峰  (周期 2s, 幂函数锐化) — 模拟 ZK 验证事件
 *   noise   = Math.random() 微扰 ±0.12
 *   结果钳位到 [0.2, 3.0]
 */
function mountVolumetric() {
  if (!volContainerRef.value || volEngine) return

  try {
    volEngine = new VolumetricEngine(volContainerRef.value)
    volEngine.mount()

    // 初始参数 — Cosmolyra 宇宙蓝紫雾
    volEngine.updateParameters({
      lightIntensity: 1.0,
      fogDensity:     0.38,
      fogColor:       '#7c3aed',   // 深紫
      dispersion:     0.22,
    })

    // ZK-Physics 波动驱动：每 120ms 一帧（≈8fps 的参数流，远低于渲染帧率）
    let t = 0
    zkInterval = setInterval(() => {
      t += 0.12   // 时间步长（秒）

      // 主正弦：慢呼吸感（周期 ≈8s）
      const base  = Math.sin(t * 0.785) * 0.6 + 1.2

      // ZK 验证脉冲：每 2s 一次锐峰（模拟链上验证瞬间）
      const pulse = Math.pow(Math.max(0, Math.sin(t * 3.14)), 6) * 1.4

      // 微扰噪声
      const noise = (Math.random() - 0.5) * 0.24

      // 合并 + 钳位
      const intensity = Math.min(3.0, Math.max(0.2, base + pulse + noise))
      zkIntensity.value = intensity

      // 色散随强度轻微联动（脉冲时产生更强棱镜效果）
      const dispersion = 0.18 + (intensity - 1.0) * 0.08

      // 雾色随脉冲从深紫向冷白漂移（丁达尔光柱增强）
      const r = Math.round(124 + pulse * 40)
      const g = Math.round(58  + pulse * 60)
      const b = Math.round(237)
      const fogColor = `rgb(${r},${g},${b})`

      volEngine?.updateParameters({ lightIntensity: intensity, dispersion, fogColor })
    }, 120)
  } catch (e) {
    console.warn('[ProjectSlideOver] VolumetricEngine mount failed:', e)
    volEngine = null
  }
}

function destroyVolumetric() {
  if (zkInterval) { clearInterval(zkInterval); zkInterval = null }
  if (volEngine)  { volEngine.destroy();        volEngine  = null }
  zkIntensity.value = 1.0
}

// 监听面板开关 + 项目切换，按需启动/销毁引擎
watch(
  () => [props.visible, props.project?.id],
  async ([visible, id], [prevVisible, prevId]) => {
    // 关闭或切换项目 → 先销毁
    if (!visible || id !== prevId) destroyVolumetric()

    // 打开且是 Web3 项目 → 等 DOM 刷新后挂载
    if (visible && isWeb3Project.value) {
      // nextTick 等价：requestAnimationFrame 确保 v-if 已渲染
      requestAnimationFrame(() => {
        requestAnimationFrame(() => mountVolumetric())
      })
    }
  }
)

// 组件销毁时彻底清理
onUnmounted(destroyVolumetric)

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
