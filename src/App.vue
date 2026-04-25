<template>
  <div class="min-h-screen flex flex-col">

    <!-- Navbar — B站三段式布局（Memphis/Brutalist 设计语言） -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-ink bg-warm-white/95 backdrop-blur-sm">

      <!-- ── 第一行：Logo | 搜索栏 | 语言切换 ── -->
      <div class="w-full h-14 flex items-stretch border-b-[2px] border-ink/15">

        <!-- 左区：Logo -->
        <RouterLink
          to="/"
          class="logo-mark flex items-center gap-2 font-display font-black tracking-tight select-none
                 px-4 border-r-[3px] border-ink shrink-0 h-full
                 sm:px-5 sm:gap-2.5"
          aria-label="Corealis — 返回首页"
          @click="handleNavClick('/', $event)"
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

        <!-- 中区：搜索栏（仅 PC/平板可见，sm 以下隐藏） -->
        <div class="hidden sm:flex flex-1 items-center justify-center px-6 lg:px-12">
          <div
            class="search-bar-wrap w-full max-w-[520px] flex items-stretch relative"
            v-click-outside="closeSearchPanel"
          >
            <!-- 动态滚动 placeholder（input 无内容且未 focus 时显示） -->
            <transition name="ph-fade" mode="out-in">
              <span
                v-if="!searchQuery && !searchFocused"
                :key="phIndex"
                class="search-ph-ghost pointer-events-none absolute left-0 top-0 h-[38px] flex items-center
                       px-4 font-mono text-[12px] font-normal text-ink/28 select-none
                       overflow-hidden whitespace-nowrap max-w-[calc(100%-52px)]"
                aria-hidden="true"
              >{{ locale === 'en' ? phLinesEn[phIndex] : phLinesZh[phIndex] }}</span>
            </transition>
            <input
              ref="searchInputEl"
              v-model="searchQuery"
              type="text"
              role="combobox"
              :aria-expanded="searchIsOpen"
              aria-autocomplete="list"
              aria-controls="global-search-list"
              :aria-activedescendant="activeIdx >= 0 ? `gs-item-${activeIdx}` : undefined"
              class="search-input flex-1 font-mono text-[13px] font-bold bg-warm-white text-ink
                     border-[3px] border-ink border-r-0
                     px-4 py-0 h-[38px]
                     outline-none placeholder-transparent
                     focus:bg-[#FFFBE8]"
              placeholder=" "
              autocomplete="off"
              spellcheck="false"
              @input="onSearchInput"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
              @keydown="onSearchKeydown"
            />
            <button
              class="search-btn h-[38px] px-5 font-mono font-black text-[12px] tracking-widest uppercase
                     bg-memphis-yellow border-[3px] border-ink
                     shadow-[3px_3px_0_0_#1A1A1A]
                     hover:shadow-[5px_5px_0_0_#1A1A1A] hover:-translate-x-[1px] hover:-translate-y-[1px]
                     active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                     transition-none"
              aria-label="Search"
              @click.prevent="doSearch"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#1A1A1A" stroke-width="2.5"/>
                <line x1="10" y1="10" x2="15" y2="15" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="square"/>
              </svg>
            </button>

            <!-- ── 预测搜索下拉面板 ── -->
            <transition name="search-drop">
              <div
                v-if="searchIsOpen"
                id="global-search-list"
                role="listbox"
                class="search-dropdown absolute left-0 right-0 top-[42px] z-[200]
                       border-[3px] border-ink overflow-hidden"
                style="background:#FAF8F5; box-shadow: 5px 5px 0 0 #1A1A1A;"
              >
                <!-- 本地结果列表 -->
                <ul>
                  <li
                    v-for="(item, idx) in searchResults"
                    :key="idx"
                    :id="`gs-item-${idx}`"
                    role="option"
                    :aria-selected="activeIdx === idx"
                    class="gs-row flex items-center gap-2.5 px-4 py-2.5 cursor-pointer border-b border-ink/8 group"
                    :class="activeIdx === idx ? 'gs-row--active' : ''"
                    @mousedown.prevent="pickResult(item)"
                    @mousemove="activeIdx = idx"
                  >
                    <!-- 类型图标 -->
                    <span class="flex-shrink-0 text-[15px] w-5 text-center">{{ item.icon }}</span>

                    <!-- 文字区 -->
                    <div class="flex-1 min-w-0">
                      <!-- 标题（关键词高亮） -->
                      <p class="font-mono font-black text-[12px] text-ink truncate leading-tight">
                        <template v-for="(part, pi) in (locale === 'en' ? item.highlightsEn : item.highlights)" :key="pi">
                          <mark v-if="part.highlight" class="gs-highlight">{{ part.text }}</mark>
                          <span v-else>{{ part.text }}</span>
                        </template>
                      </p>
                      <!-- 描述 -->
                      <p class="font-mono text-[10px] text-ink/45 truncate leading-snug mt-0.5">
                        {{ item.desc }}
                      </p>
                    </div>

                    <!-- 类型 badge -->
                    <span class="flex-shrink-0 font-mono text-[8px] font-bold uppercase tracking-wider
                                 px-1.5 py-0.5 border border-ink/15 text-ink/35
                                 group-hover:border-ink/50 group-hover:text-ink/60">
                      {{ locale === 'en' ? item.typeLabel.en : item.typeLabel.zh }}
                    </span>
                  </li>

                  <!-- 空结果提示 -->
                  <li
                    v-if="searchResults.length === 0"
                    class="px-4 py-2.5 border-b border-ink/8"
                  >
                    <p class="font-mono text-[11px] text-ink/35">
                      {{ locale === 'en' ? 'No local results' : '暂无本地匹配' }}
                    </p>
                  </li>

                  <!-- 固定末尾：在网上搜索 -->
                  <li
                    :id="`gs-item-${searchResults.length}`"
                    role="option"
                    :aria-selected="activeIdx === searchResults.length"
                    class="gs-row gs-web-row flex items-center gap-2.5 px-4 py-2.5 cursor-pointer"
                    :class="activeIdx === searchResults.length ? 'gs-row--active' : ''"
                    @mousedown.prevent="doSearch"
                    @mousemove="activeIdx = searchResults.length"
                  >
                    <svg class="flex-shrink-0 w-4 h-4 opacity-50" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="2"/>
                      <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span class="font-mono text-[11px] font-bold text-ink/55">
                      {{ locale === 'en'
                        ? `Search "${searchQuery}" on the web`
                        : `在网上搜索 "${searchQuery}"` }}
                    </span>
                    <span class="ml-auto font-mono text-[8px] text-ink/25 uppercase tracking-widest">↗ WEB</span>
                  </li>
                </ul>

                <!-- 底部快捷键提示 -->
                <div class="flex items-center gap-3 px-4 py-1.5 border-t border-ink/10 bg-ink/4">
                  <span class="font-mono text-[8px] text-ink/25 flex items-center gap-1">
                    <kbd class="border border-ink/20 px-0.5 text-[7px]">↑↓</kbd>
                    {{ locale === 'en' ? 'navigate' : '导航' }}
                  </span>
                  <span class="font-mono text-[8px] text-ink/25 flex items-center gap-1">
                    <kbd class="border border-ink/20 px-0.5 text-[7px]">↵</kbd>
                    {{ locale === 'en' ? 'select' : '选择' }}
                  </span>
                  <span class="font-mono text-[8px] text-ink/25 flex items-center gap-1">
                    <kbd class="border border-ink/20 px-0.5 text-[7px]">Esc</kbd>
                    {{ locale === 'en' ? 'close' : '关闭' }}
                  </span>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 右区：语言切换 -->
        <div class="flex items-center justify-center px-3 sm:px-5 shrink-0 border-l-[3px] border-ink ml-auto sm:ml-0">
          <LangToggle />
        </div>
      </div>

      <!-- ── 第二行：导航分类栏 ── -->
      <nav class="w-full h-[44px] flex items-stretch" aria-label="主导航">

        <!-- 手机端右侧渐变遮罩 -->
        <span
          class="nav-fade-mask pointer-events-none absolute right-0 z-10 sm:hidden"
          style="top: 56px; height: 44px;"
          aria-hidden="true"
        ></span>

        <!-- 可横向滚动的导航链接区 -->
        <div class="nav-scroll-wrap flex-1 flex items-center overflow-x-auto scrollbar-none px-1 sm:px-3 gap-0">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="nav-item flex-shrink-0 sm:flex-1 flex flex-row items-center justify-center gap-1.5
                   font-mono font-bold
                   text-[11px] sm:text-[12px] leading-tight
                   mx-0.5
                   border-[3px] border-transparent
                   transition-none
                   min-w-0 rounded-none
                   min-h-[38px] px-3 sm:px-4"
            active-class="nav-item-active"
            @click="handleNavClick(link.to, $event)"
          >
            <span v-if="link.icon" class="flex-shrink-0 nav-icon" v-html="link.icon" aria-hidden="true"></span>
            <span class="whitespace-nowrap">{{ $t(link.labelKey) }}</span>
          </RouterLink>
        </div>
      </nav>

    </header>

    <!-- Draw Canvas Background (global) -->
    <MemphisGameBg ref="drawBgRef" @drawMode="onDrawMode" />

    <!-- Page content -->
    <main
      class="flex-1 pt-[100px] transition-all duration-500"
      :class="isDrawActive ? 'blur-[8px] brightness-[0.55]' : ''"
    >
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

    <!-- Cookie Consent Banner -->
    <CookieConsent />

    <!-- Footer -->
    <footer
      class="border-t-[3px] border-ink py-8 px-6 transition-all duration-500"
      :class="isDrawActive ? 'blur-[8px] brightness-[0.55]' : ''"
    >
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LangToggle from '@/components/LangToggle.vue'
import ChatWidget from '@/components/ChatWidget.vue'
import MemphisGameBg from '@/components/MemphisGameBg.vue'
import CookieConsent from '@/components/CookieConsent.vue'
import { useGlobalSearch } from '@/composables/useGlobalSearch'

const { t, locale } = useI18n()
const router = useRouter()

// ── 搜索框动态 placeholder ──
// 语气低调、功能引导型，吸引力弱于画板 / AI agent 入口
const phLinesZh = [
  '试着搜搜「游戏项目」……',
  '搜搜「AI」，看看有什么……',
  '「实习」「产品」「Unity」……都可以',
  '想找点什么？直接输就好。',
  '搜搜「经历」或者某个关键词……',
  '「数据」「运营」「前端」……随便试试',
]
const phLinesEn = [
  'Try "game project"...',
  'Search "AI" or "product"...',
  '"Unity", "internship", "data"...',
  'Type anything to explore...',
  'Search an experience or keyword...',
  '"ops", "frontend", "research"...',
]
const phIndex     = ref(0)
const searchFocused = ref(false)
let phTimer: ReturnType<typeof setInterval> | null = null

function startPhCycle() {
  phTimer = setInterval(() => {
    const len = locale.value === 'en' ? phLinesEn.length : phLinesZh.length
    phIndex.value = (phIndex.value + 1) % len
  }, 3200)
}
function stopPhCycle() {
  if (phTimer) { clearInterval(phTimer); phTimer = null }
}

// ── 画板模式 ──
const isDrawActive = ref(false)
const drawBgRef = ref(null)

function onDrawMode(active) {
  isDrawActive.value = active
}

// ── 全局搜索 ──
const {
  query:   searchQuery,
  results: searchResults,
  isOpen:  searchIsOpen,
  onInput: onSearchInput,
  close:   closeSearch,
  closePanel,
  submit,
  selectResult,
  getSearchEngine,
} = useGlobalSearch()

const searchInputEl = ref(null)
const activeIdx     = ref(-1)   // 当前键盘选中索引（-1 = 无）

// focus 时若有内容则打开
function onSearchFocus() {
  searchFocused.value = true
  stopPhCycle()
  if (searchQuery.value.trim()) onSearchInput()
}

function onSearchBlur() {
  searchFocused.value = false
  if (!searchQuery.value) startPhCycle()
}

// 点击外部关闭（不清空 query）
function closeSearchPanel() {
  closePanel()
  activeIdx.value = -1
}

function doSearch() {
  submit(router)
  activeIdx.value = -1
}

function pickResult(item) {
  selectResult(item, router)
  activeIdx.value = -1
}

// 键盘导航：↑↓ Enter Esc
function onSearchKeydown(e) {
  // 列表总条数 = 本地结果 + 1 条网页搜索
  const total = searchResults.value.length + 1

  if (e.key === 'ArrowDown') {
    if (!searchIsOpen.value) return
    e.preventDefault()
    activeIdx.value = activeIdx.value < total - 1 ? activeIdx.value + 1 : 0
  } else if (e.key === 'ArrowUp') {
    if (!searchIsOpen.value) return
    e.preventDefault()
    activeIdx.value = activeIdx.value > 0 ? activeIdx.value - 1 : total - 1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (activeIdx.value >= 0 && activeIdx.value < searchResults.value.length) {
      pickResult(searchResults.value[activeIdx.value])
    } else {
      doSearch()
    }
  } else if (e.key === 'Escape') {
    closeSearchPanel()
    searchInputEl.value?.blur()
  }
}

// query 变化时重置键盘选中
watch(searchQuery, () => { activeIdx.value = -1 })

// 页面加载后预热 geo API，避免首次搜索延迟
onMounted(() => {
  getSearchEngine()
  startPhCycle()
})

onUnmounted(() => {
  stopPhCycle()
})

// ── v-click-outside 指令（局部注册） ──
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (e) => {
      if (!el.contains(e.target)) binding.value(e)
    }
    document.addEventListener('pointerdown', el._clickOutsideHandler)
  },
  unmounted(el) {
    document.removeEventListener('pointerdown', el._clickOutsideHandler)
  },
}


/**
 * 导航点击拦截：画板模式下先关闭画板，再跳转目标路由
 * 排除：搜索框 input、搜索按钮、语言切换（LangToggle）
 */
function handleNavClick(to, event) {
  if (!isDrawActive.value) return // 未开画板，正常 RouterLink 跳转
  event.preventDefault()
  drawBgRef.value?.exitDrawMode()
  router.push(to)
}

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
/* ── 搜索下拉动效 ── */
.search-drop-enter-active {
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
.search-drop-leave-active {
  transition: all 0.12s ease-in;
}
.search-drop-enter-from,
.search-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── 预测下拉行样式 ── */
.gs-row {
  transition: background 0.08s ease;
}
.gs-row:hover,
.gs-row--active {
  background: #FFD600;
}
.gs-row--active .font-mono,
.gs-row--active span,
.gs-row--active p {
  color: #1A1A1A !important;
  opacity: 1 !important;
}
.gs-web-row {
  background: #1A1A1A06;
}
.gs-web-row:hover,
.gs-web-row.gs-row--active {
  background: #FFD600;
}

/* 搜索词高亮 mark */
.gs-highlight {
  background: #FFD600;
  color: #1A1A1A;
  font-weight: 900;
  padding: 0 1px;
  border-radius: 0;
}
/* 激活行中 mark 反白 */
.gs-row--active .gs-highlight {
  background: #1A1A1A;
  color: #FFD600;
}

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

/* ── 搜索栏 ── */
.search-input {
  transition: background 0.12s;
}
.search-input:focus {
  box-shadow: inset 2px 2px 0 0 #1A1A1A;
}
.search-btn {
  cursor: pointer;
  transition: box-shadow 0.1s, transform 0.1s;
}

/* ── 搜索框动态 placeholder 切换动效 ── */
.ph-fade-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.ph-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.ph-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.ph-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── 隐藏导航横向滚动条（保留滑动功能） ── */
.nav-scroll-wrap {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.nav-scroll-wrap::-webkit-scrollbar { display: none; }

/* ── 右侧渐变遮罩，暗示可横滑 ── */
.nav-fade-mask {
  width: 40px;
  background: linear-gradient(to left, #FAF8F5 0%, transparent 100%);
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
