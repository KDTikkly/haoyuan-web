<template>
  <!--
    CustomCursor.vue
    全局自定义孟菲斯光标 — 正常态：黑边圆点 / Hover 卡片：放大变星形含 VIEW 文字
    挂载于 App.vue 根层，通过 provide/inject 或全局 CSS class 控制
  -->
  <Teleport to="body">
    <div
      ref="dot"
      class="cursor-dot"
      :class="{ 'is-hover': isHover }"
      aria-hidden="true"
    >
      <!-- VIEW 文字 — only visible on hover -->
      <span class="cursor-label">{{ isEn ? 'VIEW' : '查看' }}</span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const isEn = ref(locale.value === 'en')

const dot = ref<HTMLElement | null>(null)
const isHover = ref(false)

let raf = 0
let mx = 0, my = 0
let cx = 0, cy = 0

function onMove(e: MouseEvent) {
  mx = e.clientX
  my = e.clientY
}

function loop() {
  // Smooth follow
  cx += (mx - cx) * 0.18
  cy += (my - cy) * 0.18
  if (dot.value) {
    dot.value.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`
  }
  raf = requestAnimationFrame(loop)
}

function onHoverIn() {
  isHover.value = true
  gsap.to(dot.value, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' })
}
function onHoverOut() {
  isHover.value = false
  gsap.to(dot.value, { scale: 1, duration: 0.2, ease: 'power2.out' })
}

onMounted(() => {
  // Hide default cursor globally
  document.documentElement.style.cursor = 'none'

  window.addEventListener('mousemove', onMove)
  raf = requestAnimationFrame(loop)

  // Observe all interactive elements
  const targets = () => document.querySelectorAll(
    'a, button, [data-cursor-hover], .gaming-card, .project-card'
  )

  function attach() {
    targets().forEach(el => {
      el.addEventListener('mouseenter', onHoverIn)
      el.addEventListener('mouseleave', onHoverOut)
    })
  }

  attach()

  // Re-attach when DOM changes (route navigation)
  const observer = new MutationObserver(() => attach())
  observer.observe(document.body, { childList: true, subtree: true })

  // Sync locale
  const stopWatch = setInterval(() => {
    isEn.value = locale.value === 'en'
  }, 300)

  onUnmounted(() => {
    document.documentElement.style.cursor = ''
    window.removeEventListener('mousemove', onMove)
    cancelAnimationFrame(raf)
    observer.disconnect()
    clearInterval(stopWatch)
  })
})
</script>

<style>
/* Global: hide default cursor everywhere */
*, *::before, *::after {
  cursor: none !important;
}
</style>

<style scoped>
.cursor-dot {
  /* Fixed positioning, pointer-events off */
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  pointer-events: none;
  will-change: transform;

  /* Base: Memphis circle with border */
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #1A1A1A;
  border: 2px solid #FAF8F5;
  box-shadow: 0 0 0 2px #1A1A1A;

  display: flex;
  align-items: center;
  justify-content: center;

  transition:
    width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-radius 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

/* Hover state: enlarge → octagon-ish shape (clip-path star polygon) */
.cursor-dot.is-hover {
  width: 64px;
  height: 64px;
  border-radius: 0;
  background: #1A1A1A;
  border: 3px solid #FAF8F5;
  box-shadow: 0 0 0 3px #1A1A1A;

  /* 8-pointed star via clip-path */
  clip-path: polygon(
    50% 0%, 65% 15%, 100% 15%, 85% 35%,
    100% 50%, 85% 65%, 100% 85%, 65% 85%,
    50% 100%, 35% 85%, 0% 85%, 15% 65%,
    0% 50%, 15% 35%, 0% 15%, 35% 15%
  );
}

.cursor-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 800;
  color: #FAF8F5;
  letter-spacing: 0.08em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s 0.1s ease;
  white-space: nowrap;
}

.cursor-dot.is-hover .cursor-label {
  opacity: 1;
}
</style>
