<template>
  <div class="min-h-screen flex flex-col">

    <!-- Navbar -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-ink bg-warm-white/95 backdrop-blur-sm">
      <!-- PC: 居中布局；Mobile: 横向可滚动行 -->
      <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between
                  max-sm:px-3 max-sm:justify-start max-sm:gap-0 max-sm:overflow-x-auto
                  nav-scroll">
        <!-- Logo（固定不滚动 wrapper） -->
        <RouterLink
          to="/"
          class="logo-mark flex items-center gap-2.5 font-display font-black tracking-tight shrink-0 mr-4 select-none"
          aria-label="Corealis — 返回首页"
        >
          <!-- Brutalist 叠压图标：底层实心黄块 + 顶层 stroke 方块 -->
          <svg
            width="22" height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="logo-icon flex-shrink-0"
            aria-hidden="true"
          >
            <!-- 底层：实心黄色方块，偏移营造错位感 -->
            <rect x="5" y="5" width="13" height="13" fill="#FFD600" stroke="#1A1A1A" stroke-width="2"/>
            <!-- 顶层：空心方块，stroke 仅，向左上偏移 —— 与底层叠压制造深度 -->
            <rect x="2" y="2" width="13" height="13" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2.5"/>
            <!-- 中心十字点，视觉重心锚点 -->
            <rect x="7.5" y="7.5" width="3" height="3" fill="#1A1A1A"/>
          </svg>
          <!-- 品牌名：两段式排印 — 主名 + 细节点 -->
          <span class="logo-text flex items-baseline gap-0 leading-none">
            <span class="text-[18px] font-black tracking-[-0.02em] text-ink">Corealis</span>
          </span>
        </RouterLink>
        <!-- Links + Lang Toggle -->
        <div class="flex items-center gap-2 shrink-0 max-sm:gap-1.5 max-sm:pl-1 max-sm:pr-3">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-1.5 px-4 py-1.5 font-mono font-bold text-sm border-2 border-transparent hover:border-ink transition-colors duration-100 whitespace-nowrap shrink-0
                   max-sm:px-2.5 max-sm:py-1 max-sm:text-xs max-sm:border-[3px] max-sm:border-transparent"
            active-class="border-ink bg-ink text-warm-white"
          >
            <!-- 粗线条 SVG 图标 -->
            <span v-if="link.icon" class="flex-shrink-0" v-html="link.icon" aria-hidden="true"></span>
            {{ $t(link.labelKey) }}
          </RouterLink>
          <!-- Language Toggle -->
          <LangToggle class="ml-2 shrink-0 max-sm:ml-1" />
        </div>
      </nav>
    </header>

    <!-- Page content -->
    <main class="flex-1 pt-16">
      <RouterView v-slot="{ Component }" :key="$route.fullPath">
        <Transition name="page" mode="out-in">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="min-h-[60vh] flex items-center justify-center">
                <span class="font-mono text-sm font-bold border-[3px] border-ink px-5 py-3 shadow-[4px_4px_0_0_#1A1A1A] bg-warm-white animate-pulse">
                  [ ⚡ 加载中... ]
                </span>
              </div>
            </template>
          </Suspense>
        </Transition>
      </RouterView>
    </main>

    <!-- AI Chat Widget (global, fixed) -->
    <ChatWidget />

    <!-- Footer -->
    <footer class="border-t-[3px] border-ink py-8 px-6">
      <div class="max-w-6xl mx-auto flex items-center justify-between font-mono text-xs text-ink-light">
        <span>{{ $t('footer.copy') }}</span>
        <div class="flex gap-3">
          <span class="inline-block w-3 h-3 bg-memphis-yellow border border-ink"></span>
          <span class="inline-block w-3 h-3 bg-memphis-blue border border-ink rounded-full"></span>
          <span class="inline-block w-3 h-3 bg-memphis-coral border border-ink rotate-45"></span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import LangToggle from '@/components/LangToggle.vue'
import ChatWidget from '@/components/ChatWidget.vue'

const { t } = useI18n()

// SVG 图标：全部 stroke-width:3，手绘/像素感风格
const navLinks = [
  {
    to: '/',
    labelKey: 'nav.home',
    // 像素小屋
    icon: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon"><polyline points="1,7 7,1 13,7" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><polyline points="3,7 3,13 11,13 11,7" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><rect x="5" y="9" width="4" height="4" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    to: '/experience',
    labelKey: 'nav.experience',
    // 厚边公文包
    icon: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon"><rect x="1" y="4" width="12" height="9" rx="0" stroke="currentColor" stroke-width="2.5"/><path d="M4 4V3C4 2 5 1 7 1C9 1 10 2 10 3V4" stroke="currentColor" stroke-width="2.5"/><line x1="1" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    to: '/projects',
    labelKey: 'nav.projects',
    // 厚重方块叠加
    icon: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon"><rect x="1" y="5" width="8" height="8" stroke="currentColor" stroke-width="2.5"/><rect x="5" y="1" width="8" height="8" stroke="currentColor" stroke-width="2.5" fill="#FAF8F5"/></svg>`,
  },
  {
    to: '/gaming',
    labelKey: 'nav.gaming',
    // 像素手柄：握把轮廓 + D-Pad 十字 + 双圆按钮，两端握把微弧，清晰可辨
    icon: `<svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon">
      <!-- 主机体 -->
      <path d="M4 3 L14 3 L14 9 L13 11 L5 11 L4 9 Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- 左握把 -->
      <path d="M4 9 L2.5 11 L1.5 13 L4 13 L5 11" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- 右握把 -->
      <path d="M14 9 L15.5 11 L16.5 13 L14 13 L13 11" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- D-Pad 竖 -->
      <line x1="5.5" y1="5" x2="5.5" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <!-- D-Pad 横 -->
      <line x1="3.5" y1="7" x2="7.5" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <!-- A 按钮 -->
      <circle cx="13.5" cy="6" r="1.3" stroke="currentColor" stroke-width="1.8"/>
      <!-- B 按钮 -->
      <circle cx="11" cy="8" r="1.3" stroke="currentColor" stroke-width="1.8"/>
    </svg>`,
  },
  {
    to: '/resume',
    labelKey: 'nav.resume',
    // 厚边文档
    icon: `<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon"><rect x="1" y="1" width="10" height="12" stroke="currentColor" stroke-width="2.5"/><line x1="3" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="2"/><line x1="3" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="2"/><line x1="3" y1="11" x2="7" y2="11" stroke="currentColor" stroke-width="2"/></svg>`,
  },
]
</script>

<style scoped>
/* ── 全局 Brutalist 图标规范 ── */
:deep(.brutalist-icon),
.brutalist-icon {
  display: inline-block;
  vertical-align: middle;
  stroke: currentColor;
  stroke-width: 2.5;
  filter: drop-shadow(1px 1px 0px #1A1A1A);
  transition: filter 0.1s;
}
.router-link-active .brutalist-icon,
.router-link-exact-active .brutalist-icon {
  filter: drop-shadow(1px 1px 0px #FAF8F5);
}

/* ── Logo 标记 ── */
.logo-mark {
  text-decoration: none;
  color: inherit;
  transition: opacity 0.15s ease;
}
.logo-mark:hover {
  opacity: 0.8;
}
.logo-mark:hover .logo-icon rect:nth-child(1) {
  /* 底层黄块在 hover 时轻微位移感：通过父元素 translate 实现 */
}
.logo-icon {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(2px 2px 0px #1A1A1A);
}
.logo-mark:hover .logo-icon {
  transform: translateY(-1px);
  filter: drop-shadow(3px 3px 0px #1A1A1A);
}
.logo-mark:active .logo-icon {
  transform: translateY(1px);
  filter: drop-shadow(1px 1px 0px #1A1A1A);
}

/* 移动端 Logo 略微缩小 */
@media (max-width: 639px) {
  .logo-icon {
    width: 18px;
    height: 18px;
  }
  .logo-text span {
    font-size: 16px !important;
  }
}

/* ── 页面切换动画 ── */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-8px); }

/* ── 移动端导航横向滚动：隐藏滚动条，PC 不触发 ── */
@media (max-width: 639px) {
  .nav-scroll {
    overflow-x: auto;
    scrollbar-width: none;       /* Firefox */
    -ms-overflow-style: none;    /* IE/Edge */
  }
  .nav-scroll::-webkit-scrollbar {
    display: none;               /* Chrome/Safari */
  }
}
</style>
