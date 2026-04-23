<template>
  <div class="min-h-screen flex flex-col">

    <!-- Navbar -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-ink bg-warm-white/95 backdrop-blur-sm">
      <nav class="w-full h-14 flex items-stretch">

        <!-- ── 左区：Logo（固定宽度，左侧锚点） ── -->
        <RouterLink
          to="/"
          class="logo-mark flex items-center gap-2 font-display font-black tracking-tight select-none
                 px-4 border-r-[3px] border-ink shrink-0 h-full
                 sm:px-5 sm:gap-2.5"
          aria-label="Corealis — 返回首页"
        >
          <svg
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="logo-icon flex-shrink-0 w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]"
            aria-hidden="true"
          >
            <rect x="5" y="5" width="13" height="13" fill="#FFD600" stroke="#1A1A1A" stroke-width="2"/>
            <rect x="2" y="2" width="13" height="13" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="2.5"/>
            <rect x="7.5" y="7.5" width="3" height="3" fill="#1A1A1A"/>
          </svg>
          <span class="logo-text leading-none text-[15px] font-black tracking-[-0.02em] text-ink sm:text-[17px]">
            Corealis
          </span>
        </RouterLink>

        <!-- ── 右区：导航链接 + 语言切换（等分占满剩余宽度） ── -->
        <div class="flex-1 flex items-center min-w-0 overflow-hidden px-1 sm:px-2 gap-0">

          <!-- 每个链接等宽占位，active 用 border 框选；hover 瞬切亮黄色 -->
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="nav-item flex-1 flex flex-col items-center justify-center gap-0.5
                   font-mono font-bold
                   text-[10px] leading-tight
                   mx-0.5 py-1.5
                   border-[3px] border-transparent
                   transition-none
                   min-w-0 overflow-hidden rounded-none
                   sm:flex-row sm:gap-1.5 sm:text-xs sm:py-1"
            active-class="nav-item-active"
          >
            <span v-if="link.icon" class="flex-shrink-0 nav-icon" v-html="link.icon" aria-hidden="true"></span>
            <span class="truncate px-0.5 sm:px-0">{{ $t(link.labelKey) }}</span>
          </RouterLink>

          <!-- 语言切换：右端固定 -->
          <div class="flex items-center justify-center pl-2 sm:pl-3 pr-3 sm:pr-5 shrink-0">
            <LangToggle />
          </div>
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

/* ── Logo 标记 ── */
.logo-mark {
  text-decoration: none;
  color: inherit;
  transition: background 0.12s ease;
}
.logo-mark:hover {
  background: #ffd6001a;
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

/* ── 导航链接激活态：图1风格——border框选，白底，保留图标颜色 ── */
.nav-item {
  position: relative;
  color: inherit;
  text-decoration: none;
}
.nav-item:not(.nav-item-active):hover {
  background: #FFDE03;
  color: #1A1A1A;
  border-color: #1A1A1A !important;
}
.nav-item-active {
  border-color: #1A1A1A !important;
  background: #1A1A1A !important;
  color: #FAF8F5 !important;
}
.nav-item-active :deep(.brutalist-icon),
.nav-item-active .nav-icon :deep(svg) {
  filter: drop-shadow(1px 1px 0px #FAF8F5);
}

/* 手机端图标：略微缩小，保持清晰 */
@media (max-width: 639px) {
  .nav-icon :deep(svg),
  .nav-icon svg {
    width: 13px !important;
    height: 13px !important;
  }
}

/* ── 页面切换动画 ── */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-8px); }
</style>
