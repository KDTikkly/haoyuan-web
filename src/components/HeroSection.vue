<template>
  <!--
    HeroSection.vue  v2.0
    - GSAP ScrambleText slogan entry (custom implementation, no paid plugin needed)
    - ScrollTrigger parallax on Memphis geometry shapes
    - Mouse parallax overlay
    - All GSAP instances cleaned up on unmount
  -->
  <section
    ref="sectionEl"
    class="relative h-screen grid-bg flex flex-col items-center justify-center overflow-hidden px-6"
  >

    <!-- ── Interactive SVG Memphis geometry canvas ── -->
    <svg
      ref="svgCanvas"
      class="pointer-events-none absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g ref="dotGrid" opacity="0.25">
        <circle v-for="(d, i) in dotGridPts" :key="`d${i}`" :cx="d.x" :cy="d.y" r="3" fill="#1A1A1A" />
      </g>

      <circle ref="shapeCircle" cx="80%" cy="20%" r="90"
              fill="none" stroke="#FFD600" stroke-width="4" opacity="0.7" />
      <path ref="shapeHalf" d="M120,480 A80,80 0 0,1 280,480 Z"
            fill="#FF6B6B" opacity="0.55" />
      <polygon ref="shapeTri" points="1140,675 1275,855 1005,855"
               fill="none" stroke="#2979FF" stroke-width="3" opacity="0.6" />
      <path ref="shapeWave"
            d="M-40,200 Q80,150 200,200 Q320,250 440,200 Q560,150 680,200 Q800,250 920,200 Q1040,150 1160,200 Q1280,250 1400,200"
            fill="none" stroke="#00E5A0" stroke-width="3" stroke-dasharray="12 8" opacity="0.45" />
      <rect ref="sq1" x="15%" y="60%" width="22" height="22" fill="#7C4DFF" stroke="#1A1A1A" stroke-width="2" opacity="0.6" />
      <rect ref="sq2" x="60%" y="12%" width="16" height="16" fill="#FFD600" stroke="#1A1A1A" stroke-width="2" opacity="0.7" />
      <g ref="shapeX" :transform="`translate(${vw * 0.88}, ${vh * 0.65})`">
        <line x1="-15" y1="0" x2="15" y2="0" stroke="#FF4081" stroke-width="3" />
        <line x1="0" y1="-15" x2="0" y2="15" stroke="#FF4081" stroke-width="3" />
      </g>
    </svg>

    <!-- ── Mouse parallax overlay shapes ── -->
    <div ref="parallaxLayer" class="pointer-events-none absolute inset-0 hidden sm:block" style="will-change:transform;">
      <div ref="floatCircle"
           class="absolute top-[18%] right-[8%] w-28 h-28 rounded-full border-4 border-memphis-yellow bg-transparent"
           style="will-change:transform;" />
      <div ref="floatSquare"
           class="absolute bottom-[22%] left-[6%] w-16 h-16 border-4 border-ink bg-memphis-blue"
           style="will-change:transform; transform:rotate(20deg);" />
      <div ref="floatTriDot"
           class="absolute top-[55%] right-[18%] w-8 h-8 rounded-full bg-memphis-coral border-[3px] border-ink"
           style="will-change:transform;" />
    </div>

    <!-- ── Hero copy ── -->
    <!-- Mobile: centered stack | md+: two-column split with center divider -->
    <div ref="heroContent" class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8
                                   flex flex-col items-center
                                   md:flex-row md:items-center md:gap-0"
         style="opacity:0;">

      <!-- ══ LEFT: identity + headline + CTA ══ -->
      <div class="flex-1 min-w-0 text-center md:text-left md:pr-10 lg:pr-16">

        <!-- Avatar + eyebrow row：横向紧凑布局 -->
        <div class="flex items-center justify-center md:justify-start gap-3 mb-5">
          <img
            src="/assets/images/avatar.jpg"
            alt="avatar"
            class="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-ink shadow-[4px_4px_0_0_#FFD600] object-cover object-top flex-shrink-0"
          />
          <div class="flex flex-col items-start gap-1">
            <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs bg-warm-white">
              <span class="w-1.5 h-1.5 rounded-full bg-memphis-mint animate-pulse"></span>
              {{ $t('hero.badge') }}
            </div>
            <span class="font-mono text-[10px] text-ink/40 uppercase tracking-widest">
              {{ locale === 'en' ? 'Product × AI × Games' : '产品 × AI × 游戏' }}
            </span>
          </div>
        </div>

        <!-- Main heading — ScrambleText targets -->
        <h1 class="font-display font-bold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.92] tracking-tight text-ink mb-4">
          <span ref="sloganLine1" class="block" style="opacity:0;">{{ $t('hero.line1') }}</span>
          <span class="block" style="opacity:0;" ref="sloganLine2">{{ $t('hero.line2') }}</span>
          <span class="block relative">
            <span ref="sloganLine3" class="relative z-10" style="opacity:0;">{{ $t('hero.line3') }}</span>
            <span ref="underlineBar" class="absolute -bottom-1 left-0 right-0 h-[5px] bg-memphis-yellow" style="scaleX:0;transform-origin:left;"></span>
          </span>
        </h1>

        <!-- Sub-headline -->
        <p ref="subText" class="font-sans text-sm sm:text-base lg:text-lg text-ink-light max-w-sm mx-auto md:mx-0 leading-relaxed mb-6" style="opacity:0;">
          {{ $t('hero.sub1') }}<br/>{{ $t('hero.sub2') }}
        </p>

        <!-- CTAs + 快速入口 -->
        <div ref="ctaRow" class="flex flex-wrap gap-3 justify-center md:justify-start mb-4" style="opacity:0;">
          <RouterLink to="/projects" class="btn-hard px-5 py-2.5 text-sm bg-ink text-warm-white">
            {{ $t('hero.cta_projects') }}
          </RouterLink>
          <RouterLink to="/resume" class="btn-hard px-5 py-2.5 text-sm">
            {{ $t('hero.cta_resume') }}
          </RouterLink>
        </div>

        <!-- 快捷标签导航（仅手机端显示，md+ 在右侧面板有技能云） -->
        <div class="flex flex-wrap gap-1.5 justify-center md:hidden mt-2">
          <span
            v-for="tag in techTags.slice(0,5)" :key="tag.label"
            class="inline-flex items-center border-2 border-ink px-2.5 py-1
                   font-mono text-[10px] font-bold tracking-wide cursor-default select-none"
            :style="{ background: tag.bg }"
          >{{ tag.label }}</span>
        </div>
      </div>

      <!-- ── 中轴分隔线（md+可见） ── -->
      <div class="hidden md:flex flex-col items-center self-stretch justify-center px-1 flex-shrink-0">
        <div class="w-[3px] bg-ink/15 flex-1 my-4"></div>
        <div class="flex flex-col gap-1.5 my-1">
          <span class="w-2.5 h-2.5 bg-memphis-yellow border border-ink inline-block rotate-45"></span>
          <span class="w-2.5 h-2.5 bg-memphis-coral border border-ink rounded-full inline-block"></span>
          <span class="w-2.5 h-2.5 bg-memphis-blue border border-ink inline-block"></span>
        </div>
        <div class="w-[3px] bg-ink/15 flex-1 my-4"></div>
      </div>

      <!-- ══ RIGHT: info panel（md+ 可见） ══ -->
      <div ref="infoPanelEl" class="hidden md:flex flex-col gap-4 w-72 lg:w-80 xl:w-88 flex-shrink-0 md:pl-8 lg:pl-12" style="opacity:0;">

        <!-- Stat chips：紧凑三列 -->
        <div class="grid grid-cols-3 gap-2">
          <div v-for="stat in heroStats" :key="stat.label"
               class="border-[3px] border-ink px-2 py-3 bg-warm-beige flex flex-col items-center gap-0.5
                      shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-[1px_1px_0_0_#1A1A1A]
                      hover:translate-x-[2px] hover:translate-y-[2px]
                      transition-[transform,box-shadow] duration-150 cursor-default select-none">
            <span class="font-display font-extrabold text-xl leading-none" :style="{ color: stat.color }">
              {{ stat.value }}
            </span>
            <span class="font-mono text-[9px] text-ink/50 uppercase tracking-widest text-center leading-tight">
              {{ stat.label }}
            </span>
          </div>
        </div>

        <!-- Tech tag cloud：更紧凑 -->
        <div>
          <div class="font-mono text-[9px] text-ink/40 uppercase tracking-widest mb-2">
            {{ locale === 'en' ? 'Tech Stack' : '技术栈' }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in techTags" :key="tag.label"
              class="inline-flex items-center border-2 border-ink px-2.5 py-1
                     font-mono text-[10px] font-bold tracking-wide
                     hover:bg-ink hover:text-warm-white transition-colors duration-150 cursor-default select-none"
              :style="{ background: tag.bg }"
            >{{ tag.label }}</span>
          </div>
        </div>

        <!-- Currently section：更紧凑 -->
        <div class="border-[3px] border-ink bg-warm-beige/80 shadow-[3px_3px_0_0_#1A1A1A] overflow-hidden">
          <div class="flex items-center gap-2 px-3 py-2 border-b-2 border-ink/20 bg-ink/[0.03]">
            <span class="w-1.5 h-1.5 rounded-full bg-memphis-mint animate-pulse"></span>
            <span class="font-mono text-[9px] text-ink/50 uppercase tracking-widest">
              {{ locale === 'en' ? 'Currently' : '当前状态' }}
            </span>
          </div>
          <ul class="px-3 py-2.5 space-y-1.5">
            <li v-for="item in currentlyItems" :key="item"
                class="flex items-start gap-2 font-mono text-[11px] text-ink/70 leading-snug">
              <span class="mt-1 flex-shrink-0 w-1.5 h-1.5 border border-ink bg-memphis-yellow inline-block"></span>
              {{ item }}
            </li>
          </ul>
        </div>

        <!-- 快速入口（仅 lg+ 展示额外的链接行） -->
        <div class="hidden lg:grid grid-cols-2 gap-2">
          <RouterLink
            v-for="shortcut in quickLinks" :key="shortcut.to"
            :to="shortcut.to"
            class="flex items-center gap-2 border-2 border-ink px-3 py-2
                   font-mono text-[10px] font-bold
                   hover:bg-ink hover:text-warm-white transition-colors duration-100"
          >
            <span v-html="shortcut.icon" aria-hidden="true"></span>
            {{ locale === 'en' ? shortcut.labelEn : shortcut.label }}
            <span class="ml-auto text-ink/30">→</span>
          </RouterLink>
        </div>

      </div>
    </div>

    <!-- ── Scroll hint ── -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 font-mono text-xs text-ink-light">
      <span>{{ $t('hero.scroll') }}</span>
      <span class="w-1.5 h-6 border-2 border-ink relative overflow-hidden">
        <span class="absolute top-0 left-0 right-0 h-2 bg-ink animate-bounce"></span>
      </span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useI18n } from 'vue-i18n'

gsap.registerPlugin(ScrollTrigger)

const { t, locale } = useI18n()
const { width: vw, height: vh } = useWindowSize()

// ── Refs ──────────────────────────────────────────────────────────────
const sectionEl    = ref(null)
const heroContent  = ref(null)
const infoPanelEl  = ref(null)
const sloganLine1  = ref(null)
const sloganLine2  = ref(null)
const sloganLine3  = ref(null)
const underlineBar = ref(null)
const subText      = ref(null)
const ctaRow       = ref(null)
const shapeCircle  = ref(null)
const shapeHalf    = ref(null)
const shapeTri     = ref(null)
const shapeWave    = ref(null)
const shapeX       = ref(null)
const sq1          = ref(null)
const sq2          = ref(null)
const floatCircle  = ref(null)
const floatSquare  = ref(null)
const floatTriDot  = ref(null)

// ── Info panel data ───────────────────────────────────────────────────
const heroStats = computed(() => [
  { value: '8+', label: locale.value === 'en' ? 'Projects' : '项目',      color: '#FFD600' },
  { value: '3+', label: locale.value === 'en' ? 'Years Exp' : '年经验',   color: '#2979FF' },
  { value: '5K+', label: locale.value === 'en' ? 'Code Hrs' : '代码时长', color: '#00E5A0' },
])

const techTags = [
  { label: 'Vue 3',        bg: '#E8F5E9' },
  { label: 'Python',       bg: '#E3F2FD' },
  { label: 'LLM Agent',    bg: '#FFF9C4' },
  { label: 'Go',           bg: '#E0F7FA' },
  { label: 'AIGC',         bg: '#FCE4EC' },
  { label: 'LSTM',         bg: '#EDE7F6' },
  { label: 'Web3',         bg: '#FFF3E0' },
  { label: 'Game Design',  bg: '#F3E5F5' },
]

const currentlyItems = computed(() =>
  locale.value === 'en'
    ? ['Building AI-powered portfolio tools', 'Open to Product / AI roles', 'Exploring LLM Agent architectures']
    : ['构建 AI 驱动的作品集工具', '寻求产品 / AI 方向岗位', '探索 LLM Agent 系统架构']
)

// 快捷入口（右下角 lg+ 显示）
const quickLinks = [
  {
    to: '/projects',
    label: '作品集',
    labelEn: 'Projects',
    icon: `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="5" width="8" height="8" stroke="currentColor" stroke-width="2.5"/><rect x="5" y="1" width="8" height="8" stroke="currentColor" stroke-width="2.5" fill="#FAF8F5"/></svg>`,
  },
  {
    to: '/gaming',
    label: '游戏',
    labelEn: 'Gaming',
    icon: `<svg width="14" height="11" viewBox="0 0 18 14" fill="none"><path d="M4 3 L14 3 L14 9 L13 11 L5 11 L4 9 Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><line x1="5.5" y1="5" x2="5.5" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3.5" y1="7" x2="7.5" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="13.5" cy="6" r="1.3" stroke="currentColor" stroke-width="1.8"/></svg>`,
  },
  {
    to: '/experience',
    label: '经历',
    labelEn: 'Experience',
    icon: `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" stroke="currentColor" stroke-width="2.5"/><path d="M4 4V3C4 2 5 1 7 1C9 1 10 2 10 3V4" stroke="currentColor" stroke-width="2.5"/></svg>`,
  },
  {
    to: '/resume',
    label: '简历',
    labelEn: 'Resume',
    icon: `<svg width="10" height="12" viewBox="0 0 12 14" fill="none"><rect x="1" y="1" width="10" height="12" stroke="currentColor" stroke-width="2.5"/><line x1="3" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="2"/><line x1="3" y1="8" x2="7" y2="8" stroke="currentColor" stroke-width="2"/></svg>`,
  },
]

// Dot grid
const dotGridPts = []
for (let x = 0; x <= 1600; x += 80)
  for (let y = 0; y <= 900; y += 80)
    dotGridPts.push({ x, y })

// ── ScrambleText (custom, no paid plugin) ─────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&'

function scrambleText(el, finalText, duration = 0.9, delay = 0) {
  if (!el) return
  const frames = Math.round(duration * 60)
  const revealAt = (i) => Math.floor((i / finalText.length) * frames * 0.7)
  let frame = 0
  const start = performance.now() + delay * 1000

  // Make element visible
  gsap.set(el, { opacity: 1 })

  function tick(now) {
    if (now < start) { requestAnimationFrame(tick); return }
    frame++
    let result = ''
    for (let i = 0; i < finalText.length; i++) {
      if (finalText[i] === ' ' || finalText[i] === '.') {
        result += finalText[i]
      } else if (frame >= revealAt(i)) {
        result += finalText[i]
      } else {
        result += CHARS[Math.floor(Math.random() * CHARS.length)]
      }
    }
    el.textContent = result
    if (frame < frames) requestAnimationFrame(tick)
    else el.textContent = finalText
  }
  requestAnimationFrame(tick)
}

// ── GSAP timelines store (for cleanup) ────────────────────────────────
let ctx // gsap context

onMounted(() => {
  ctx = gsap.context(() => {

    // ─ Entry: hero content fade ─
    gsap.to(heroContent.value, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 })

    // ─ Info panel slide-in (PC only) ─
    if (infoPanelEl.value) {
      gsap.fromTo(infoPanelEl.value,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: 0.7, delay: 1.8, ease: 'power3.out' }
      )
    }

    // ─ ScrambleText slogan lines ─
    const line1Text = sloganLine1.value?.textContent?.trim() ?? t('hero.line1')
    const line2Text = sloganLine2.value?.textContent?.trim() ?? t('hero.line2')
    const line3Text = sloganLine3.value?.textContent?.trim() ?? t('hero.line3')
    scrambleText(sloganLine1.value, line1Text, 0.8, 0.3)
    scrambleText(sloganLine2.value, line2Text, 0.8, 0.65)
    scrambleText(sloganLine3.value, line3Text, 0.8, 1.0)

    // ─ Underline bar scale ─
    gsap.fromTo(underlineBar.value,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.5, delay: 1.5, ease: 'power2.inOut', transformOrigin: 'left' }
    )

    // ─ Sub-text + CTAs ─
    gsap.to(subText.value, { opacity: 1, y: 0, duration: 0.5, delay: 1.4, ease: 'power2.out' })
    gsap.to(ctaRow.value,  { opacity: 1, y: 0, duration: 0.5, delay: 1.7, ease: 'power2.out' })

    // ─ Memphis shapes entry ─
    const shapes = [shapeCircle.value, shapeHalf.value, shapeTri.value, sq1.value, sq2.value]
    shapes.forEach((el, i) => {
      if (!el) return
      gsap.fromTo(el,
        { opacity: 0, scale: 0.6 },
        { opacity: parseFloat(el.getAttribute('opacity') ?? '0.6'), scale: 1,
          duration: 1, delay: 0.15 * i, ease: 'back.out(1.4)' }
      )
    })

    // ─ Wave line draw ─
    if (shapeWave.value) {
      const len = shapeWave.value.getTotalLength()
      gsap.fromTo(shapeWave.value,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 2.5, delay: 0.4, ease: 'power1.inOut' }
      )
    }

    // ─ Continuous float animations ─
    gsap.to(shapeCircle.value, { y: -20, rotation: 15, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.to(shapeHalf.value,   { x: 10, y: 8, duration: 3.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.to(shapeTri.value,    { rotation: 12, transformOrigin: '50% 50%', duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.to(sq1.value,         { rotation: 20, duration: 6, yoyo: true, repeat: -1, ease: 'none' })
    gsap.to(sq2.value,         { y: -12, rotation: -15, duration: 4.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.to(shapeX.value,      { rotation: 45, duration: 8, yoyo: true, repeat: -1, ease: 'none' })

    // ─ ScrollTrigger parallax on Memphis shapes ─
    // Each shape moves at a different rate as the section scrolls out
    const parallaxPairs = [
      { el: shapeCircle.value,  speed: -0.4 },
      { el: shapeHalf.value,    speed:  0.3 },
      { el: shapeTri.value,     speed: -0.25 },
      { el: sq1.value,          speed:  0.5 },
      { el: sq2.value,          speed: -0.35 },
      { el: floatCircle.value,  speed: -0.2 },
      { el: floatSquare.value,  speed:  0.45 },
      { el: floatTriDot.value,  speed: -0.6 },
    ]

    parallaxPairs.forEach(({ el, speed }) => {
      if (!el) return
      ScrollTrigger.create({
        trigger: sectionEl.value,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress            // 0 → 1
          gsap.set(el, { y: progress * speed * 200 })
        },
      })
    })

  }, sectionEl.value) // scope context to this section
})

onUnmounted(() => {
  ctx?.revert()  // kills all tweens + ScrollTriggers created in this context
})

// ── Mouse parallax ────────────────────────────────────────────────────
function onMouseMove(e) {
  const x = (e.clientX / vw.value - 0.5) * 2
  const y = (e.clientY / vh.value - 0.5) * 2
  gsap.to(floatCircle.value,  { x: x * 18, y: y * 12, duration: 0.6, ease: 'power2.out' })
  gsap.to(floatSquare.value,  { x: x * -24, y: y * -16, duration: 0.7, ease: 'power2.out' })
  gsap.to(floatTriDot.value,  { x: x * 30, y: y * 20, duration: 0.5, ease: 'power2.out' })
}

onMounted(() => window.addEventListener('mousemove', onMouseMove))
onUnmounted(() => window.removeEventListener('mousemove', onMouseMove))
</script>
