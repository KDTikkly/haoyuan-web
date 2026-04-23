<template>
  <div class="min-h-screen flex flex-col">

    <!-- Navbar -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-ink bg-warm-white/95 backdrop-blur-sm">
      <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
          <span class="inline-block w-6 h-6 bg-memphis-yellow border-2 border-ink rotate-12"></span>
          Corealis
        </RouterLink>
        <!-- Links + Lang Toggle -->
        <div class="flex items-center gap-2">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-4 py-1.5 font-mono text-sm border-2 border-transparent hover:border-ink transition-colors duration-100"
            active-class="border-ink bg-ink text-warm-white"
          >
            {{ $t(link.labelKey) }}
          </RouterLink>
          <!-- Language Toggle -->
          <LangToggle class="ml-3" />
        </div>
      </nav>
    </header>

    <!-- Page content -->
    <main class="flex-1 pt-16">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
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
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-8px); }
</style>
