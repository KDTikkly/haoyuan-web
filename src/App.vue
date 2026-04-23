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
          class="flex items-center gap-2 font-display font-bold text-xl tracking-tight shrink-0 mr-4"
        >
          <span class="inline-block w-6 h-6 bg-memphis-yellow border-2 border-ink rotate-12"></span>
          Corealis
        </RouterLink>
        <!-- Links + Lang Toggle -->
        <div class="flex items-center gap-2 shrink-0 max-sm:gap-1.5 max-sm:pl-1 max-sm:pr-3">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-4 py-1.5 font-mono text-sm border-2 border-transparent hover:border-ink transition-colors duration-100 whitespace-nowrap shrink-0
                   max-sm:px-2.5 max-sm:py-1 max-sm:text-xs max-sm:border-[3px] max-sm:border-transparent"
            active-class="border-ink bg-ink text-warm-white"
          >
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

const navLinks = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/experience', labelKey: 'nav.experience' },
  { to: '/projects', labelKey: 'nav.projects' },
  { to: '/gaming', labelKey: 'nav.gaming' },
  { to: '/resume', labelKey: 'nav.resume' },
]
</script>

<style scoped>
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
