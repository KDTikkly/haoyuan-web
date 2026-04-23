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
    <!-- Mobile: centered stack | PC (lg+): two-column split layout -->
    <div ref="heroContent" class="relative z-10 w-full max-w-7xl mx-auto px-6 py-4
                                   flex flex-col items-center lg:flex-row lg:items-center lg:gap-16"
         style="opacity:0;">

      <!-- ══ LEFT: identity + headline + CTA ══ -->
      <div class="flex-1 min-w-0 text-center lg:text-left">
        <!-- Avatar + eyebrow row -->
        <div class="flex flex-col lg:flex-row items-center lg:items-center gap-4 mb-8">
          <img
            src="/assets/images/avatar.jpg"
            alt="avatar"
            class="w-20 h-20 lg:w-24 lg:h-24 rounded-full border-[3px] border-ink shadow-hard-sm lg:shadow-hard-yellow object-cover object-top flex-shrink-0"
          />
          <div class="inline-flex items-center gap-2 border-2 border-ink px-4 py-1.5 font-mono text-sm bg-warm-white">
            <span class="w-2 h-2 rounded-full bg-memphis-mint animate-pulse"></span>
            {{ $t('hero.badge') }}
          </div>
        </div>

        <!-- Main heading — ScrambleText targets -->
        <h1 class="font-display font-bold text-5xl sm:text-6xl lg:text-8xl xl:text-9xl leading-none tracking-tight text-ink mb-6">
          <span ref="sloganLine1" class="block" style="opacity:0;">{{ $t('hero.line1') }}</span>
          <span class="block relative">
            <span ref="sloganLine2" class="relative z-10" style="opacity:0;">{{ $t('hero.line2') }}</span>
            <span ref="underlineBar" class="absolute -bottom-1 left-0 right-0 h-[5px] bg-memphis-yellow" style="scaleX:0;transform-origin:left;"></span>
          </span>
          <span ref="sloganLine3" class="block" style="opacity:0;">{{ $t('hero.line3') }}</span>
        </h1>

        <!-- Sub-headline -->
        <p ref="subText" class="font-sans text-base sm:text-lg lg:text-xl text-ink-light max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10" style="opacity:0;">
          {{ $t('hero.sub1') }}<br/>{{ $t('hero.sub2') }}
        </p>

        <!-- CTAs -->
        <div ref="ctaRow" class="flex flex-wrap gap-4 justify-center lg:justify-start" style="opacity:0;">
          <RouterLink to="/projects" class="btn-hard px-7 py-3 text-base bg-ink text-warm-white">
            {{ $t('hero.cta_projects') }}
          </RouterLink>
          <RouterLink to="/resume" class="btn-hard px-7 py-3 text-base">
            {{ $t('hero.cta_resume') }}
          </RouterLink>
        </div>
      </div>

      <!-- ══ RIGHT: info panel — only visible on PC (lg+) ══ -->
      <div ref="infoPanelEl" class="hidden lg:flex flex-col gap-6 w-80 xl:w-96 flex-shrink-0" style="opacity:0;">

        <!-- Stat chips row -->
        <div class="grid grid-cols-3 gap-3">
          <div v-for="stat in heroStats" :key="stat.label"
               class="border-[3px] border-ink p-4 bg-warm-beige flex flex-col items-center gap-1
                      shadow-[4px_4px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A]
                      hover:translate-x-[2px] hover:translate-y-[2px]
                      transition-[transform,box-shadow] duration-150 cursor-default select-none">
            <span class="font-display font-extrabold text-2xl leading-none" :style="{ color: stat.color }">
              {{ stat.value }}
            </span>
            <span class="font-mono text-[10px] text-ink/50 uppercase tracking-widest text-center leading-tight">
              {{ stat.label }}
            </span>
          </div>
        </div>

        <!-- Divider with Memphis accent -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-[2px] bg-ink/15"></div>
          <div class="flex gap-1.5">
            <span class="w-3 h-3 bg-memphis-yellow border border-ink inline-block rotate-45"></span>
            <span class="w-3 h-3 bg-memphis-coral border border-ink rounded-full inline-block"></span>
            <span class="w-3 h-3 bg-memphis-blue border border-ink inline-block"></span>
          </div>
          <div class="flex-1 h-[2px] bg-ink/15"></div>
        </div>

        <!-- Tech tag cloud -->
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tag in techTags" :key="tag.label"
            class="inline-flex items-center gap-1.5 border-2 border-ink px-3 py-1.5
                   font-mono text-[11px] font-bold tracking-wide
                   hover:bg-ink hover:text-warm-white transition-colors duration-150 cursor-default select-none"
            :style="{ background: tag.bg }"
          >
            {{ tag.label }}
          </span>
        </div>

        <!-- Currently section -->
        <div class="border-[3px] border-ink p-4 bg-warm-beige/80 shadow-[4px_4px_0_0_#1A1A1A]">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2 h-2 rounded-full bg-memphis-mint animate-pulse"></span>
            <span class="font-mono text-[10px] text-ink/50 uppercase tracking-widest">
              {{ locale === 'en' ? 'Currently' : '目前' }}
            </span>
          </div>
          <ul class="space-y-2">
            <li v-for="item in currentlyItems" :key="item"
                class="flex items-start gap-2 font-mono text-xs text-ink/70 leading-relaxed">
              <span class="mt-1 flex-shrink-0 w-1.5 h-1.5 border border-ink bg-memphis-yellow inline-block"></span>
              {{ item }}
            </li>
          </ul>
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
