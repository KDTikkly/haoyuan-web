<template>
  <div class="min-h-screen pt-20 pb-16 px-6">
    <div class="max-w-6xl mx-auto">

      <!-- ════════════════════════════════════════════
           页面标题
      ════════════════════════════════════════════ -->
      <div class="mb-12">
        <h1 class="font-display font-black text-5xl md:text-6xl tracking-tight mb-4">
          {{ locale === 'en' ? 'Gaming Ecosystem' : '硬核游戏生态' }}
        </h1>
        <p class="font-mono text-ink/60 max-w-xl leading-relaxed" style="font-size:15px;">
          {{ locale === 'en'
            ? 'Multi-platform gaming journey: Steam library + HoYoverse/Kuro games deep dive analysis.'
            : '多平台游戏之旅：Steam 库存 + 米哈游/库洛游戏深度拆解。'
          }}
        </p>
      </div>

      <!-- ════════════════════════════════════════════
           实时数据看板（4 个可交互 Brutalist 统计卡片）
      ════════════════════════════════════════════ -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div
          v-for="(stat, idx) in statsDisplay"
          :key="stat.labelEn"
          class="border-[3px] border-ink p-5 bg-warm-white shadow-[6px_6px_0_0_#1A1A1A]
                 flex flex-col gap-1.5 relative overflow-hidden group cursor-pointer select-none
                 transition-[transform,box-shadow] duration-150
                 hover:shadow-[8px_8px_0_0_#1A1A1A] hover:-translate-y-[4px]"
          :class="{ 'shadow-[2px_2px_0_0_#1A1A1A] translate-x-[4px] translate-y-[4px]': activeStatIdx === idx }"
          @click.stop="toggleStat(idx)"
          role="button"
          :aria-expanded="activeStatIdx === idx"
        >
          <!-- 顶部色块装饰 -->
          <span
            class="absolute top-0 left-0 w-full transition-all duration-300"
            :class="activeStatIdx === idx ? 'h-[6px]' : 'h-[3px] group-hover:h-[5px]'"
            :style="{ background: stat.color }"
            aria-hidden="true"
          ></span>

          <!-- 标签行 + 数据来源 badge -->
          <div class="flex items-center justify-between pt-1.5">
            <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider">
              {{ locale === 'en' ? stat.labelEn : stat.label }}
            </span>
            <span
              class="font-mono text-[7px] font-bold px-1 py-0.5 border border-ink/20"
              :style="{ background: stat.color + '28', color: stat.color }"
            >{{ stat.source }}</span>
          </div>

          <!-- 几何形状背景锚点（视觉中心装饰） -->
          <span
            class="absolute bottom-3 right-3 opacity-10 pointer-events-none"
            aria-hidden="true"
          >
            <svg v-if="idx % 3 === 0" width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" :fill="stat.color" stroke="#1A1A1A" stroke-width="3"/>
            </svg>
            <svg v-else-if="idx % 3 === 1" width="56" height="56" viewBox="0 0 56 56">
              <rect x="4" y="4" width="48" height="48" :fill="stat.color" stroke="#1A1A1A" stroke-width="3"/>
            </svg>
            <svg v-else width="56" height="56" viewBox="0 0 56 56">
              <polygon points="28,4 52,52 4,52" :fill="stat.color" stroke="#1A1A1A" stroke-width="3"/>
            </svg>
          </span>

          <!-- 加载骨架 -->
          <div v-if="stat.loading" class="flex items-end gap-1 h-12">
            <span class="font-display font-extrabold text-4xl animate-pulse bg-ink/10 rounded w-20 h-10 inline-block"></span>
          </div>

          <!-- CountUp 数值 + 趋势箭头 -->
          <div v-else class="flex items-end gap-2 leading-none">
            <span
              :ref="(el) => setStatRef(idx, el)"
              class="font-display font-extrabold text-4xl leading-none tabular-nums"
              :style="{ color: stat.color }"
            >{{ stat.value }}</span>
            <span
              v-if="stat.trend"
              class="font-mono text-xs font-bold mb-0.5 opacity-70"
              :style="{ color: stat.color }"
            >{{ stat.trend }}</span>
          </div>

          <!-- 描述 + 展开图标 -->
          <div class="flex items-center justify-between">
            <span class="font-mono text-[8.5px] text-ink/35 uppercase tracking-widest leading-tight">
              {{ locale === 'en' ? stat.descEn : stat.desc }}
            </span>
            <!-- 展开箭头 -->
            <span
              class="font-mono text-[11px] font-black border-[3px] border-ink w-4 h-4 flex items-center justify-center
                     transition-transform duration-300 flex-shrink-0"
              :style="{ borderColor: stat.color, color: stat.color, transform: activeStatIdx === idx ? 'rotate(180deg)' : 'rotate(0deg)' }"
              aria-hidden="true"
            >↓</span>
          </div>

          <!-- 底部装饰线（hover 展开） -->
          <span
            class="absolute bottom-0 left-0 h-[2px] transition-all duration-300"
            :class="activeStatIdx === idx ? 'w-full' : 'w-0 group-hover:w-full'"
            :style="{ background: stat.color }"
            aria-hidden="true"
          ></span>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           一级功能入口：VIEW FULL LIBRARY
           位于 Stats 卡片下方、两个 Section 上方
      ════════════════════════════════════════════ -->
      <div class="mb-8 relative">
        <button
          class="full-library-btn w-full flex items-center justify-center gap-3
                 border-[3px] border-ink bg-memphis-yellow text-ink
                 font-mono font-black uppercase tracking-widest
                 shadow-[6px_6px_0_0_#1A1A1A]
                 hover:shadow-[8px_8px_0_0_#1A1A1A] hover:-translate-y-[2px]
                 active:shadow-[2px_2px_0_0_#1A1A1A] active:translate-y-[2px]
                 transition-all duration-150 select-none
                 py-4 px-6 relative overflow-hidden"
          @click="showLibraryPortal = true"
          :aria-label="locale === 'en' ? 'View full game library' : '展示全部游戏库'"
        >
          <!-- 流动斜纹装饰层 -->
          <span class="stripe-overlay absolute inset-0 pointer-events-none" aria-hidden="true"></span>

          <!-- 文件夹图标 -->
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" class="relative z-10 flex-shrink-0">
            <rect x="1" y="5" width="16" height="12" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M1 5 L1 4 L6 4 L7.5 6" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/>
            <line x1="5" y1="10" x2="13" y2="10" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
            <line x1="5" y1="13" x2="10" y2="13" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
          </svg>

          <span class="relative z-10 text-[13px] md:text-[15px]">
            {{ locale === 'en' ? '📂 VIEW FULL LIBRARY' : '📂 展示全部库' }}
          </span>

          <!-- 游戏数量角标 -->
          <span
            class="relative z-10 font-mono text-[10px] font-bold px-2 py-0.5
                   border-[2px] border-ink bg-ink text-memphis-yellow ml-1"
          >
            {{ allGamesCount }} TITLES
          </span>

          <!-- STEAM · API badge -->
          <span class="relative z-10 hidden md:inline font-mono text-[9px] font-bold px-2 py-0.5 border-[2px] border-ink/40 bg-ink/10 uppercase tracking-wider ml-auto">
            STEAM · API + LOCAL
          </span>
        </button>
      </div>

      <!-- ════════════════════════════════════════════
           Stats 三级明细展开面板（PC 端 inline，手机端 Modal）
      ════════════════════════════════════════════ -->
      <Transition name="stat-detail">
        <div
          v-if="activeStatIdx !== null"
          class="mb-10 border-[3px] border-ink bg-warm-white shadow-[6px_6px_0_0_#1A1A1A] overflow-hidden hidden md:block"
        >
          <!-- 面板标题栏 -->
          <div
            class="flex items-center justify-between px-5 py-3 border-b-[3px] border-ink"
            :style="{ background: statsDisplay[activeStatIdx].color + '18' }"
          >
            <span class="font-display font-bold text-xl tracking-tight" :style="{ color: statsDisplay[activeStatIdx].color }">
              {{ locale === 'en' ? statsDisplay[activeStatIdx].labelEn : statsDisplay[activeStatIdx].label }}
              <span class="font-mono text-[11px] text-ink/40 ml-2 uppercase tracking-wider">/ BREAKDOWN</span>
            </span>
            <button
              class="font-mono text-xs font-bold px-2 py-1 border-[2px] border-ink hover:bg-ink hover:text-warm-white transition-colors"
              @click.stop="activeStatIdx = null"
            >✕ CLOSE</button>
          </div>

          <!-- 明细内容 -->
          <div class="p-5">
            <!-- 0: 总时长 -->
            <template v-if="activeStatIdx === 0">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  v-for="item in hoursBreakdown"
                  :key="item.label"
                  class="border-[2px] border-ink p-4 relative overflow-hidden"
                >
                  <div
                    class="absolute top-0 left-0 h-full transition-all duration-700"
                    :style="{ width: item.pct + '%', background: item.color + '22' }"
                  ></div>
                  <div class="relative z-10">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">{{ item.label }}</span>
                      <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 border border-ink/20"
                            :style="{ background: item.color + '30', color: item.color }">{{ item.pct }}%</span>
                    </div>
                    <span class="font-display font-extrabold text-3xl" :style="{ color: item.color }">{{ item.hours }}h</span>
                    <p class="font-mono text-[9px] text-ink/40 uppercase tracking-wider mt-1">{{ item.desc }}</p>
                  </div>
                </div>
              </div>
              <!-- 进度条 -->
              <div class="mt-4 flex h-3 border-[2px] border-ink overflow-hidden">
                <div
                  v-for="item in hoursBreakdown"
                  :key="item.label + '-bar'"
                  :style="{ width: item.pct + '%', background: item.color }"
                  class="transition-all duration-700"
                ></div>
              </div>
            </template>

            <!-- 1: 游玩品类 -->
            <template v-if="activeStatIdx === 1">
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="genre in genreBreakdown"
                  :key="genre.name"
                  class="flex items-center gap-2 border-[2px] border-ink px-3 py-2"
                >
                  <span
                    class="w-2 h-2 flex-shrink-0"
                    :style="{ background: genre.color }"
                  ></span>
                  <span class="font-mono text-[11px] font-bold uppercase tracking-wider">{{ genre.name }}</span>
                  <span
                    class="font-mono text-[9px] px-1 py-0.5 border border-ink/20"
                    :style="{ background: genre.color + '25', color: genre.color }"
                  >{{ genre.count }}</span>
                </div>
              </div>
              <p class="font-mono text-[9px] text-ink/35 uppercase tracking-widest mt-4">
                {{ locale === 'en' ? `${totalGenres} unique genres across all platforms` : `全平台共 ${totalGenres} 个独立品类` }}
              </p>
            </template>

            <!-- 2: 代表作品 -->
            <template v-if="activeStatIdx === 2">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  v-for="platform in gamesBreakdown"
                  :key="platform.name"
                  class="border-[2px] border-ink p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-mono text-[10px] font-bold uppercase tracking-wider" :style="{ color: platform.color }">{{ platform.name }}</span>
                    <span class="font-display font-extrabold text-2xl" :style="{ color: platform.color }">{{ platform.count }}</span>
                  </div>
                  <div class="w-full bg-ink/10 h-2 border border-ink/20">
                    <div
                      class="h-full transition-all duration-700"
                      :style="{ width: (platform.count / totalGamesCount * 100) + '%', background: platform.color }"
                    ></div>
                  </div>
                  <p class="font-mono text-[9px] text-ink/40 uppercase tracking-wider mt-2">{{ platform.desc }}</p>
                </div>
              </div>
            </template>

            <!-- 3: 深度拆解 -->
            <template v-if="activeStatIdx === 3">
              <div class="space-y-2">
                <div
                  v-for="game in insightGames"
                  :key="game.id"
                  class="flex items-center gap-3 border-[2px] border-ink p-3 hover:bg-ink/5 transition-colors cursor-pointer"
                  @click.stop="selectedGame = game"
                >
                  <span
                    class="w-2 h-full flex-shrink-0 self-stretch min-h-[20px]"
                    :style="{ background: game.accentColor || '#FFD600' }"
                  ></span>
                  <div class="flex-1 min-w-0">
                    <p class="font-display font-bold text-sm tracking-tight truncate">
                      {{ locale === 'en' ? game.titleEn : game.title }}
                    </p>
                    <p class="font-mono text-[9px] text-ink/40 uppercase tracking-wider">{{ game.platform }}</p>
                  </div>
                  <span class="font-mono text-[8px] font-bold px-2 py-0.5 border-[2px] border-ink bg-pastel-yellow text-ink uppercase flex-shrink-0">
                    PM INSIGHT
                  </span>
                  <span class="font-mono text-[10px] text-ink/40">→</span>
                </div>
              </div>
              <p class="font-mono text-[9px] text-ink/35 uppercase tracking-widest mt-4">
                {{ locale === 'en' ? 'Click any game to view teardown report' : '点击任意游戏查看产品拆解报告' }}
              </p>
            </template>
          </div>
        </div>
      </Transition>

      <!-- ════════════════════════════════════════════
           Steam 错误提示
      ════════════════════════════════════════════ -->
      <Transition name="fade-in">
        <div
          v-if="steamError"
          class="border-[3px] border-pastel-red bg-pastel-red/10 p-4 mb-8 flex items-start gap-3"
        >
          <span class="text-pastel-red text-xl">⚠️</span>
          <div>
            <p class="font-display font-bold text-sm mb-1">
              {{ locale === 'en' ? 'Steam Data Unavailable' : 'Steam 数据不可用' }}
            </p>
            <p class="font-mono text-xs text-ink/70">{{ steamError }}</p>
          </div>
        </div>
      </Transition>

      <!-- ════════════════════════════════════════════
           Section 1：☁️ CLOUD SYNCED（原：平台直连库）
      ════════════════════════════════════════════ -->
      <div v-if="steamGames.length > 0 || steamLoading" class="mb-16">
        <!-- Section 大标题 -->
        <div class="flex items-center gap-4 mb-6">
          <h2 class="flex items-center gap-3 font-display font-extrabold text-3xl md:text-4xl tracking-tight border-[3px] border-ink px-4 py-2 bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]">
            <!-- 云朵图标：3px 黑边，memphis-blue 填充 -->
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon flex-shrink-0" aria-hidden="true">
              <path d="M8 22C4.5 22 2 19.5 2 16C2 13 4 10.5 7 10C7.5 6 10.5 3 14.5 3C17 3 19.2 4.2 20.6 6C21.4 5.4 22.4 5 23.5 5C26.5 5 29 7.5 29 10.5C29 10.7 29 10.9 28.98 11.1C30.5 11.7 32 13.2 32 15.5C32 18.5 29.5 21 26.5 21L8 22Z" fill="#2979FF" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/>
              <line x1="14" y1="22" x2="14" y2="27" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="18" y1="22" x2="18" y2="27" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="22" y1="22" x2="22" y2="27" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            {{ locale === 'en' ? '[ CLOUD SYNCED ]' : '[ 云端链路 ]' }}
          </h2>
          <div class="flex-1 h-[4px] bg-ink"></div>
          <span class="font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-ink bg-[#2979FF] text-warm-white uppercase tracking-wider animate-pulse">
            STEAM · API
          </span>
        </div>

        <!-- Steam 加载骨架 -->
        <div v-if="steamLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="n in 3"
            :key="`skel-${n}`"
            class="border-[3px] border-ink bg-warm-beige h-[340px] animate-pulse"
          ></div>
        </div>

        <!-- Steam 卡片网格（点击展开详情） -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="game in steamGames.slice(0, 6)"
            :key="`steam-${game.appid}`"
            class="steam-card border-[3px] border-ink bg-warm-white
                   transition-all duration-150 group overflow-hidden cursor-pointer select-none"
            :class="expandedSteam === game.appid
              ? 'shadow-[2px_2px_0_0_#1A1A1A] translate-x-[3px] translate-y-[3px]'
              : 'shadow-[5px_5px_0_0_#1A1A1A] hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]'"
            @click="toggleSteamExpand(game)"
            role="button"
            :aria-expanded="expandedSteam === game.appid"
            :aria-label="`${game.name} — 点击查看详情`"
          >
            <!-- ── Cover ── -->
            <div class="relative h-44 overflow-hidden border-b-[3px] border-ink">
              <img
                v-if="game.cover && !steamCoverFailed[game.appid]"
                :src="game.cover"
                :alt="game.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                @error="onSteamCoverError(game.appid)"
              />
              <img
                v-else-if="steamCoverFailed[game.appid] && steamFallbackImages[game.appid]"
                :src="steamFallbackImages[game.appid]"
                :alt="game.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full bg-[#2979FF]/20 flex items-center justify-center">
                <span class="font-display font-bold text-3xl text-ink/30">STEAM</span>
              </div>
              <!-- Platform Badge -->
              <span class="absolute top-2 right-2 font-mono text-[8px] font-bold px-1.5 py-0.5
                           bg-ink text-warm-white border border-warm-white/30">
                STEAM
              </span>
              <!-- 展开提示角标（右下） -->
              <span
                class="absolute bottom-2 right-2 font-mono text-[7px] font-bold px-1.5 py-0.5
                       border-[2px] border-[#2979FF] text-[#2979FF] bg-warm-white/90 uppercase tracking-wider
                       transition-opacity duration-200"
                :class="expandedSteam === game.appid ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'"
                aria-hidden="true"
              >▾ DETAILS</span>
            </div>

            <!-- ── Content: 标题 + 基础 Stats ── -->
            <div class="p-4 flex flex-col">
              <!-- 标题行 + 展开箭头 -->
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="font-display font-bold text-xl tracking-tight leading-tight line-clamp-2 flex-1">
                  {{ game.name }}
                </h3>
                <!-- 箭头指示器 -->
                <span
                  class="flex-shrink-0 mt-0.5 w-5 h-5 border-[3px] border-ink flex items-center justify-center
                         transition-all duration-250"
                  :style="expandedSteam === game.appid
                    ? { background: '#2979FF', borderColor: '#2979FF', transform: 'rotate(180deg)' }
                    : { background: 'transparent' }"
                  aria-hidden="true"
                >
                  <span class="text-[9px] font-black leading-none"
                    :style="expandedSteam === game.appid ? { color: '#FAF8F5' } : { color: '#1A1A1A' }"
                  >▾</span>
                </span>
              </div>

              <!-- 点状分割线 -->
              <div class="w-full border-b border-dashed border-ink/20 mb-3"></div>

              <!-- 基础 Stats：近两周 + 总时长 -->
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-0.5 relative pl-2">
                  <span class="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF6B6B]"></span>
                  <span class="font-mono text-[7.5px] text-ink/35 uppercase tracking-wide">近两周</span>
                  <span class="font-display font-bold text-sm text-[#FF6B6B]">
                    {{ (game.playtime_2weeks / 60).toFixed(1) }}h
                  </span>
                </div>
                <div class="flex flex-col gap-0.5 relative pl-2">
                  <span class="absolute left-0 top-0 bottom-0 w-[2px] bg-[#2979FF]"></span>
                  <span class="font-mono text-[7.5px] text-ink/35 uppercase tracking-wide">总时长</span>
                  <span class="font-display font-bold text-sm text-[#2979FF]">
                    {{ (game.playtime_forever / 60).toFixed(1) }}h
                  </span>
                </div>
              </div>
            </div>

            <!-- ── 展开详情面板 ── -->
            <Transition name="steam-expand">
              <div
                v-if="expandedSteam === game.appid"
                class="border-t-[3px] border-ink"
                @click.stop
              >
                <!-- 面板标题栏 -->
                <div class="flex items-center justify-between px-4 py-2 bg-[#2979FF]/8 border-b-[2px] border-dashed border-ink/25">
                  <span class="font-mono text-[8px] font-bold uppercase tracking-widest text-[#2979FF]">
                    ▸ GAME DETAILS
                  </span>
                  <span v-if="steamAchievements[game.appid]?.loading" class="font-mono text-[7px] text-ink/40 animate-pulse uppercase tracking-wider">
                    LOADING...
                  </span>
                </div>

                <div class="p-4 flex flex-col gap-3">

                  <!-- 时长细分：近两周 vs 历史 -->
                  <div>
                    <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest block mb-1.5">PLAYTIME BREAKDOWN</span>
                    <!-- 进度条（近两周占总时长比例） -->
                    <div class="flex h-2.5 border-[2px] border-ink overflow-hidden mb-1.5">
                      <div
                        class="bg-[#FF6B6B] transition-all duration-700"
                        :style="{ width: game.playtime_forever > 0
                          ? Math.min(game.playtime_2weeks / game.playtime_forever * 100, 100) + '%'
                          : '0%' }"
                      ></div>
                      <div class="flex-1 bg-[#2979FF]/20"></div>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-mono text-[8px] text-[#FF6B6B] font-bold">
                        近两周 {{ (game.playtime_2weeks / 60).toFixed(1) }}h
                      </span>
                      <span class="font-mono text-[8px] text-[#2979FF] font-bold">
                        总计 {{ (game.playtime_forever / 60).toFixed(1) }}h
                      </span>
                    </div>
                  </div>

                  <!-- 成就进度 -->
                  <div>
                    <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest block mb-1.5">ACHIEVEMENTS</span>

                    <!-- 加载中 -->
                    <div v-if="steamAchievements[game.appid]?.loading"
                         class="h-8 bg-ink/5 border-[2px] border-ink/20 animate-pulse flex items-center px-3">
                      <span class="font-mono text-[7px] text-ink/30 uppercase tracking-widest">FETCHING...</span>
                    </div>

                    <!-- 无成就系统 -->
                    <div v-else-if="steamAchievements[game.appid]?.total === 0"
                         class="flex items-center gap-2 px-3 py-2 border-[2px] border-ink/20 bg-ink/3">
                      <span class="font-mono text-[8px] text-ink/40 uppercase tracking-wider">NO ACHIEVEMENT SYSTEM</span>
                    </div>

                    <!-- 成就进度条 -->
                    <div v-else-if="steamAchievements[game.appid]">
                      <div class="flex h-2.5 border-[2px] border-ink overflow-hidden mb-1.5">
                        <div
                          class="transition-all duration-700"
                          :style="{
                            width: steamAchievements[game.appid].pct + '%',
                            background: steamAchievements[game.appid].pct >= 100
                              ? '#00E5A0'
                              : steamAchievements[game.appid].pct >= 50
                                ? '#FFD600'
                                : '#2979FF'
                          }"
                        ></div>
                        <div class="flex-1 bg-ink/10"></div>
                      </div>
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                          <span
                            class="font-display font-extrabold text-lg leading-none"
                            :style="{
                              color: steamAchievements[game.appid].pct >= 100
                                ? '#00E5A0'
                                : steamAchievements[game.appid].pct >= 50
                                  ? '#FFD600'
                                  : '#2979FF'
                            }"
                          >{{ steamAchievements[game.appid].unlocked }}</span>
                          <span class="font-mono text-[8px] text-ink/40">
                            / {{ steamAchievements[game.appid].total }} 成就
                          </span>
                        </div>
                        <span
                          class="font-mono text-[9px] font-bold px-1.5 py-0.5 border-[2px] border-ink"
                          :style="{
                            background: steamAchievements[game.appid].pct >= 100
                              ? '#00E5A0' + '25'
                              : '#2979FF' + '18',
                            color: steamAchievements[game.appid].pct >= 100
                              ? '#00E5A0'
                              : '#2979FF'
                          }"
                        >{{ steamAchievements[game.appid].pct }}%</span>
                      </div>
                    </div>

                    <!-- 初始占位（触发加载前） -->
                    <div v-else class="flex items-center gap-2 px-3 py-2 border-[2px] border-ink/20">
                      <span class="font-mono text-[7px] text-ink/30 uppercase tracking-widest">—</span>
                    </div>
                  </div>

                  <!-- 最后游玩时间 -->
                  <div v-if="game.rtime_last_played && game.rtime_last_played > 0">
                    <span class="font-mono text-[7px] text-ink/40 uppercase tracking-widest block mb-1">LAST PLAYED</span>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-[9px] text-ink/70 font-bold">
                        {{ formatLastPlayed(game.rtime_last_played) }}
                      </span>
                      <span class="font-mono text-[7px] text-ink/30 uppercase tracking-wider">
                        {{ daysAgo(game.rtime_last_played) }}
                      </span>
                    </div>
                  </div>

                  <!-- 在 Steam 打开 -->
                  <a
                    :href="`https://store.steampowered.com/app/${game.appid}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-2
                           border-[3px] border-ink bg-[#2979FF] text-warm-white
                           shadow-[3px_3px_0_0_#1A1A1A] inline-flex items-center gap-2
                           hover:shadow-[5px_5px_0_0_#1A1A1A] hover:-translate-x-[1px] hover:-translate-y-[1px]
                           active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
                           transition-all duration-100 self-start"
                    @click.stop
                  >
                    ↗ STEAM STORE
                  </a>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           Section 2：💾 LOCAL ARCHIVE（原：本地全栖战绩）
      ════════════════════════════════════════════ -->
      <div v-if="localGames.length > 0 || gamesLoading" class="mb-16">
        <!-- Section 大标题 -->
        <div class="flex items-center gap-4 mb-6">
          <h2 class="flex items-center gap-3 font-display font-extrabold text-3xl md:text-4xl tracking-tight border-[3px] border-ink px-4 py-2 bg-warm-white shadow-[5px_5px_0_0_#1A1A1A]">
            <!-- 3.5 寸磁盘图标：厚重黑边，紫色填充 -->
            <svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="brutalist-icon flex-shrink-0" aria-hidden="true">
              <rect x="2" y="1" width="24" height="28" stroke="#1A1A1A" stroke-width="2.5"/>
              <rect x="6" y="1" width="14" height="10" fill="#A78BFA" stroke="#1A1A1A" stroke-width="2"/>
              <rect x="16" y="2" width="3" height="7" fill="#FAF8F5" stroke="#1A1A1A" stroke-width="1.5"/>
              <rect x="7" y="16" width="14" height="10" rx="2" fill="#A78BFA" stroke="#1A1A1A" stroke-width="2"/>
              <circle cx="14" cy="21" r="3" fill="#1A1A1A"/>
              <circle cx="14" cy="21" r="1.2" fill="#FAF8F5"/>
            </svg>
            {{ locale === 'en' ? '[ LOCAL ARCHIVE ]' : '[ 本地存档 ]' }}
          </h2>
          <div class="flex-1 h-[4px] bg-ink"></div>
          <span class="font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-ink bg-[#A78BFA] text-warm-white uppercase tracking-wider">
            OFFLINE · JSON
          </span>
        </div>

        <!-- 本地游戏卡片网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GameCard
            v-for="game in localGames"
            :key="game.id"
            :game="game"
            @click="selectedGame = $event"
          />
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           Empty State（两个数据源均为空）
      ════════════════════════════════════════════ -->
      <Transition name="fade-in">
        <div
          v-if="!steamLoading && !gamesLoading && steamGames.length === 0 && localGames.length === 0"
          class="text-center py-20"
        >
          <span class="font-display font-extrabold text-6xl text-ink/20">∅</span>
          <p class="font-mono text-sm text-ink/40 mt-4">
            {{ locale === 'en' ? 'No games data available' : '暂无游戏数据' }}
          </p>
        </div>
      </Transition>
    </div>

    <!-- ════════════════════════════════════════════
         手机端统计明细 — 右侧全屏侧滑面板（md 以下专用）
         仿米哈游角色详情页侧滑交互模式
    ════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="stat-drawer">
        <div
          v-if="activeStatIdx !== null"
          class="fixed inset-0 z-[200] md:hidden"
          role="dialog"
          :aria-label="activeStatIdx !== null ? (locale === 'en' ? statsDisplay[activeStatIdx].labelEn : statsDisplay[activeStatIdx].label) : ''"
          aria-modal="true"
        >
          <!-- 背景遮罩 -->
          <div
            class="stat-drawer-backdrop absolute inset-0 bg-ink/60"
            @click="activeStatIdx = null"
            aria-hidden="true"
          />

          <!-- 右侧抽屉面板 -->
          <div
            class="stat-drawer-panel absolute right-0 top-0 bottom-0 w-[88vw] max-w-[360px]
                   bg-warm-white flex flex-col overflow-hidden"
            style="box-shadow: -6px 0 0 0 #1A1A1A; border-left: 3px solid #1A1A1A;"
            @click.stop
          >
            <!-- ── 顶部色条 + 标题栏 ── -->
            <div
              class="flex-shrink-0 border-b-[3px] border-ink"
              :style="{ background: statsDisplay[activeStatIdx].color + '12' }"
            >
              <!-- 色条 -->
              <div class="h-[5px] w-full" :style="{ background: statsDisplay[activeStatIdx].color }"></div>

              <!-- 标题行 -->
              <div class="flex items-center justify-between px-5 pt-4 pb-3">
                <div class="flex flex-col gap-0.5">
                  <span class="font-mono text-[9px] text-ink/35 uppercase tracking-widest">BREAKDOWN</span>
                  <span class="font-display font-extrabold text-2xl tracking-tight leading-tight"
                        :style="{ color: statsDisplay[activeStatIdx].color }">
                    {{ locale === 'en' ? statsDisplay[activeStatIdx].labelEn : statsDisplay[activeStatIdx].label }}
                  </span>
                </div>
                <!-- 数值展示 -->
                <div class="flex flex-col items-end gap-1">
                  <span class="font-display font-black text-3xl leading-none tabular-nums"
                        :style="{ color: statsDisplay[activeStatIdx].color }">
                    {{ statsDisplay[activeStatIdx].value }}
                  </span>
                  <button
                    class="font-mono text-[9px] font-bold px-2 py-1 border-[2px] border-ink/30
                           hover:border-ink hover:bg-ink hover:text-warm-white transition-colors"
                    @click.stop="activeStatIdx = null"
                    aria-label="关闭"
                  >✕ CLOSE</button>
                </div>
              </div>

              <!-- 数据来源标签行 -->
              <div class="flex items-center gap-2 px-5 pb-3">
                <span class="font-mono text-[8px] font-bold px-2 py-0.5 border uppercase tracking-wider"
                      :style="{ borderColor: statsDisplay[activeStatIdx].color + '60', color: statsDisplay[activeStatIdx].color, background: statsDisplay[activeStatIdx].color + '15' }">
                  {{ statsDisplay[activeStatIdx].source }}
                </span>
                <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider">
                  {{ locale === 'en' ? statsDisplay[activeStatIdx].descEn : statsDisplay[activeStatIdx].desc }}
                </span>
              </div>
            </div>

            <!-- ── 滚动内容区 ── -->
            <div class="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">

              <!-- 0: 总时长 -->
              <template v-if="activeStatIdx === 0">
                <!-- 整体进度条（横向比例可视化） -->
                <div class="flex h-3 border-[2px] border-ink overflow-hidden mb-1">
                  <div
                    v-for="item in hoursBreakdown"
                    :key="item.label + '-bar'"
                    :style="{ width: item.pct + '%', background: item.color }"
                    class="transition-all duration-700"
                  ></div>
                </div>
                <!-- 图例说明 -->
                <div class="flex items-center gap-3 mb-4">
                  <div v-for="item in hoursBreakdown" :key="item.label + '-legend'" class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 border border-ink/30 flex-shrink-0" :style="{ background: item.color }"></span>
                    <span class="font-mono text-[9px] text-ink/50 uppercase">{{ item.label }}</span>
                  </div>
                </div>

                <!-- 明细卡片 -->
                <div
                  v-for="item in hoursBreakdown"
                  :key="item.label"
                  class="border-[2px] border-ink p-4 relative overflow-hidden"
                >
                  <div
                    class="absolute top-0 left-0 bottom-0 transition-all duration-700"
                    :style="{ width: item.pct + '%', background: item.color + '1A' }"
                  ></div>
                  <div class="relative z-10 flex items-center justify-between">
                    <div>
                      <p class="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/55 mb-1">{{ item.label }}</p>
                      <span class="font-display font-extrabold text-3xl leading-none" :style="{ color: item.color }">{{ item.hours }}h</span>
                      <p class="font-mono text-[9px] text-ink/35 uppercase tracking-wider mt-1">{{ item.desc }}</p>
                    </div>
                    <span class="font-mono text-lg font-black opacity-60" :style="{ color: item.color }">
                      {{ item.pct }}%
                    </span>
                  </div>
                </div>
              </template>

              <!-- 1: 游玩品类 -->
              <template v-if="activeStatIdx === 1">
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="genre in genreBreakdown"
                    :key="genre.name"
                    class="flex items-center gap-2 border-[2px] border-ink px-3 py-2.5"
                  >
                    <span class="w-2 h-2 flex-shrink-0" :style="{ background: genre.color }"></span>
                    <div class="flex-1 min-w-0">
                      <p class="font-mono text-[10px] font-bold uppercase tracking-wide truncate">{{ genre.name }}</p>
                    </div>
                    <span
                      class="font-mono text-[9px] font-bold px-1.5 py-0.5 border flex-shrink-0"
                      :style="{ borderColor: genre.color + '60', background: genre.color + '20', color: genre.color }"
                    >{{ genre.count }}</span>
                  </div>
                </div>
                <p class="font-mono text-[9px] text-ink/35 uppercase tracking-widest pt-2">
                  {{ locale === 'en' ? `${totalGenres} unique genres across all platforms` : `全平台共 ${totalGenres} 个独立品类` }}
                </p>
              </template>

              <!-- 2: 代表作品 -->
              <template v-if="activeStatIdx === 2">
                <div
                  v-for="(platform, i) in gamesBreakdown"
                  :key="platform.name"
                  class="border-[2px] border-ink p-4"
                >
                  <!-- 排名 + 平台名 -->
                  <div class="flex items-center gap-3 mb-3">
                    <span class="font-display font-black text-2xl leading-none opacity-20">{{ String(i+1).padStart(2,'0') }}</span>
                    <div class="flex-1">
                      <p class="font-mono text-[10px] font-bold uppercase tracking-wider" :style="{ color: platform.color }">
                        {{ platform.name }}
                      </p>
                      <p class="font-mono text-[9px] text-ink/35 uppercase tracking-wider">{{ platform.desc }}</p>
                    </div>
                    <span class="font-display font-extrabold text-3xl leading-none" :style="{ color: platform.color }">
                      {{ platform.count }}
                    </span>
                  </div>
                  <!-- 进度条 -->
                  <div class="w-full bg-ink/8 h-2 border border-ink/15">
                    <div
                      class="h-full transition-all duration-700"
                      :style="{ width: (platform.count / totalGamesCount * 100) + '%', background: platform.color }"
                    ></div>
                  </div>
                </div>
              </template>

              <!-- 3: 深度拆解 -->
              <template v-if="activeStatIdx === 3">
                <p class="font-mono text-[9px] text-ink/35 uppercase tracking-widest">
                  {{ locale === 'en' ? 'Tap to view teardown report' : '点击查看产品拆解报告' }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="game in insightGames"
                    :key="game.id"
                    class="flex items-center gap-3 border-[2px] border-ink p-3
                           active:bg-ink/8 transition-colors cursor-pointer"
                    @click.stop="selectedGame = game; activeStatIdx = null"
                  >
                    <!-- 游戏色块 -->
                    <div
                      class="w-1.5 self-stretch flex-shrink-0 min-h-[44px]"
                      :style="{ background: game.accentColor || '#FFD600' }"
                    ></div>
                    <!-- 封面缩略图 -->
                    <div class="w-10 h-10 flex-shrink-0 border-[2px] border-ink overflow-hidden bg-ink/5">
                      <img
                        v-if="game.coverUrl"
                        :src="game.coverUrl"
                        :alt="game.title"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <!-- 游戏信息 -->
                    <div class="flex-1 min-w-0">
                      <p class="font-display font-bold text-sm tracking-tight leading-tight truncate">
                        {{ locale === 'en' ? game.titleEn : game.title }}
                      </p>
                      <p class="font-mono text-[9px] text-ink/40 uppercase tracking-wider">{{ game.platform }}</p>
                    </div>
                    <!-- PM 标签 + 箭头 -->
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                      <span class="font-mono text-[7px] font-bold px-1.5 py-0.5 border-[2px] border-ink bg-pastel-yellow text-ink uppercase">
                        PM
                      </span>
                      <span class="font-mono text-[11px] text-ink/40">→</span>
                    </div>
                  </div>
                </div>
              </template>

            </div>

            <!-- ── 底部装饰栏 ── -->
            <div class="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t-[3px] border-ink bg-ink/3">
              <span class="font-mono text-[8px] text-ink/25 uppercase tracking-widest">GAMING STATS · BREAKDOWN</span>
              <!-- 导航点（切换不同统计） -->
              <div class="flex items-center gap-2">
                <button
                  v-for="(s, i) in statsDisplay"
                  :key="i"
                  class="w-2.5 h-2.5 border border-ink/30 transition-all duration-150"
                  :class="activeStatIdx === i ? 'scale-125' : 'opacity-40 hover:opacity-70'"
                  :style="activeStatIdx === i ? { background: s.color, borderColor: s.color } : {}"
                  @click.stop="activeStatIdx = i"
                  :aria-label="locale === 'en' ? s.labelEn : s.label"
                ></button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ════════════════════════════════════════════
         游戏详情侧滑面板
    ════════════════════════════════════════════ -->
    <GameDetailPanel
      :is-open="!!selectedGame"
      :selected-game="selectedGame"
      @close="selectedGame = null"
    />

    <!-- ════════════════════════════════════════════
         全量库弹窗终端
    ════════════════════════════════════════════ -->
    <FullLibraryPortal
      :visible="showLibraryPortal"
      :steam-games="steamGames"
      :local-games="localGames"
      :steam-achievements="steamAchievements"
      @close="showLibraryPortal = false"
      @open-game="(g) => { selectedGame = g; showLibraryPortal = false }"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import gsap from 'gsap'
import GameDetailPanel from '@/components/GameDetailPanel.vue'
import GameCard from '@/components/GameCard.vue'
import FullLibraryPortal from '@/components/FullLibraryPortal.vue'
import { pickRandomFallback } from '@/utils/cloudinaryFallbackPool'

const { locale } = useI18n()

// ════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════
interface SteamGame {
  appid: number
  name: string
  playtime_2weeks: number
  playtime_forever: number
  rtime_last_played?: number
  has_community_visible_stats?: boolean
  cover: string
  icon: string | null
}

interface OwnedStats {
  totalGames: number
  totalHours: number
  estimatedValue: number
}

interface LocalGame {
  id: string
  platform: string
  title: string
  titleEn: string
  nickname: string
  uid: string
  level: string
  levelEn: string
  playtime: string
  playtimeEn: string
  estimatedHours: number
  coverUrl: string
  accentColor: string
  stats: Record<string, string>
  tags: string[]
  reviewMarkdown: string
  reviewSummary: string
}

// ════════════════════════════════════════════
//  Steam 数据
// ════════════════════════════════════════════
const steamGames   = ref<SteamGame[]>([])
const ownedStats   = ref<OwnedStats | null>(null)
const steamLoading = ref(true)
const steamError   = ref('')

async function loadSteamData() {
  steamLoading.value = true
  steamError.value   = ''
  try {
    const res = await fetch('/api/steam')
    let data: any = {}
    try { data = await res.json() } catch {
      throw new Error(`HTTP ${res.status} — invalid JSON response`)
    }
    if (!res.ok || data.error) {
      const codeMap: Record<string, string> = {
        MISSING_KEY:       locale.value === 'en' ? '[MISSING_KEY] STEAM_API_KEY not set' : '[MISSING_KEY] 未配置 STEAM_API_KEY',
        MISSING_ID:        locale.value === 'en' ? '[MISSING_ID] STEAM_ID not set'       : '[MISSING_ID] 未配置 STEAM_ID',
        INVALID_ID_FORMAT: locale.value === 'en' ? '[INVALID_ID] Must be 17-digit SteamID64' : '[INVALID_ID] 应为 17 位 SteamID64',
        STEAM_AUTH_ERROR:  locale.value === 'en' ? '[AUTH] Invalid key or private profile' : '[AUTH] Key 无效或资料私密',
        NETWORK_ERROR:     locale.value === 'en' ? '[NETWORK] Cannot reach Steam API' : '[NETWORK] 无法连接 Steam API',
      }
      const msg = data.code && codeMap[data.code] ? codeMap[data.code] : (data.error ?? `HTTP ${res.status}`)
      throw new Error(msg)
    }
    steamGames.value = data.recentGames ?? []
    if (data.ownedStats) ownedStats.value = data.ownedStats
  } catch (e: any) {
    steamError.value = e.message ?? (locale.value === 'en' ? 'Unknown error' : '未知错误')
  } finally {
    steamLoading.value = false
  }
}

// ════════════════════════════════════════════
//  Steam 封面图 fallback（随机 Cloudinary 图库，83 张）
// ════════════════════════════════════════════
const steamCoverFailed = ref<Record<number, boolean>>({})
const steamFallbackImages = ref<Record<number, string>>({})

function getRandomGalleryImage(): string {
  return pickRandomFallback()
}

async function loadGalleryIndex() { /* 已迁移至 Cloudinary，无需本地加载 */ }

function onSteamCoverError(appid: number) {
  steamCoverFailed.value[appid] = true
  if (!steamFallbackImages.value[appid]) {
    steamFallbackImages.value[appid] = getRandomGalleryImage()
  }
}

// ════════════════════════════════════════════
//  Steam 卡片展开详情
// ════════════════════════════════════════════

/** 当前展开的 appid（null = 全收起） */
const expandedSteam = ref<number | null>(null)

interface AchievementData {
  total: number
  unlocked: number
  pct: number
  loading?: boolean
}

/** 成就缓存：appid → 数据 */
const steamAchievements = ref<Record<number, AchievementData>>({})

async function fetchAchievements(appid: number) {
  const cached = steamAchievements.value[appid]
  if (cached) return   // 已有数据（含 loading 占位，防重复请求）

  steamAchievements.value[appid] = { total: 0, unlocked: 0, pct: 0, loading: true }
  try {
    const res = await fetch(`/api/steam-achievements?appid=${appid}`)
    if (res.ok) {
      const d = await res.json()
      steamAchievements.value[appid] = { total: d.total ?? 0, unlocked: d.unlocked ?? 0, pct: d.pct ?? 0 }
    } else {
      steamAchievements.value[appid] = { total: 0, unlocked: 0, pct: 0 }
    }
  } catch {
    steamAchievements.value[appid] = { total: 0, unlocked: 0, pct: 0 }
  }
}

function toggleSteamExpand(game: SteamGame) {
  if (expandedSteam.value === game.appid) {
    expandedSteam.value = null
  } else {
    expandedSteam.value = game.appid
    fetchAchievements(game.appid)
  }
}

/** Unix 时间戳 → 本地日期字符串 */
function formatLastPlayed(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** 计算距今天数 */
function daysAgo(ts: number): string {
  const days = Math.floor((Date.now() / 1000 - ts) / 86400)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

// ════════════════════════════════════════════
//  本地 JSON 游戏数据
// ════════════════════════════════════════════
const localGames   = ref<LocalGame[]>([])
const gamesLoading = ref(true)

async function loadLocalGames() {
  try {
    const res = await fetch('/data/gaming.json')
    if (res.ok) localGames.value = await res.json()
  } catch { /* 静默失败 */ } finally {
    gamesLoading.value = false
  }
}

// ════════════════════════════════════════════
//  双源聚合 — computed 统计
// ════════════════════════════════════════════

/** 总时长：Steam 总时长(h) + 本地 JSON estimatedHours 总和 */
/** Fallback：Steam 失败时纯用本地数据，显示 'Local' 作为来源 */
const totalHours = computed(() => {
  // 优先使用 Steam 数据，失败则 fallback 到 0（仅用本地数据）
  const steamH = ownedStats.value?.totalHours ?? 0
  // 本地数据始终累加
  const localH = localGames.value.reduce((s, g) => s + (g.estimatedHours ?? 0), 0)
  return Math.round(steamH + localH)
})

/** 游玩品类（唯一 tags 去重计数） */
const totalGenres = computed(() => {
  const set = new Set<string>()
  localGames.value.forEach(g => g.tags?.forEach(t => t && set.add(t.trim())))
  // Steam 游戏暂无 tag 返回，使用固定已知类型补充
  ;['FPS', 'Strategy', 'Visual Novel', 'Gacha', 'Action RPG', 'Open World', 'Turn-based RPG'].forEach(t => set.add(t))
  return set.size
})

/** 代表作品：Steam 入库 + 本地 JSON 数量 */
const totalGamesCount = computed(() => {
  const steamOwned = ownedStats.value ? ownedStats.value.totalGames : 0
  return steamOwned + localGames.value.length
})

/** 产品洞察：reviewMarkdown 不为空的数量 */
/** 逻辑：检查 reviewMarkdown 字段是否存在且非空字符串 */
const insightCount = computed(() =>
  localGames.value.filter(g => {
    const md = g.reviewMarkdown
    return md && typeof md === 'string' && md.trim().length > 0
  }).length
)

// ════════════════════════════════════════════
//  看板数据（统一 computed）
// ════════════════════════════════════════════
const statsDisplay = computed(() => [
  {
    label: '总时长',
    labelEn: 'Total Hours',
    desc: 'Steam + 手游累计',
    descEn: 'Steam + Mobile Combined',
    // 优先显示本地数据（即使 Steam 失败），避免显示 '—'
    value: totalHours.value > 0 ? `${totalHours.value.toLocaleString()}h` : (localGames.value.length > 0 ? `${localGames.value.reduce((s, g) => s + (g.estimatedHours ?? 0), 0).toLocaleString()}h` : '—'),
    numericTarget: totalHours.value,
    suffix: 'h',
    color: '#FF6B6B',
    // loading 仅在完全无数据时显示，本地数据加载完成即停止 loading
    loading: gamesLoading.value && localGames.value.length === 0,
    // 根据是否有 Steam 数据显示来源
    source: ownedStats.value ? 'Mixed' : 'Local',
    trend: totalHours.value > 0 ? '↗' : undefined,
  },
  {
    label: '游玩品类',
    labelEn: 'Genres',
    desc: '跨平台品类去重',
    descEn: 'Unique Across Platforms',
    value: `${totalGenres.value}+`,
    numericTarget: totalGenres.value,
    suffix: '+',
    color: '#2979FF',
    loading: false,
    source: 'Mixed',
  },
  {
    label: '代表作品',
    labelEn: 'Total Games',
    desc: 'Steam 入库 + 手游',
    descEn: 'Steam Owned + Mobile',
    value: totalGamesCount.value > 0 ? `${totalGamesCount.value}` : (localGames.value.length > 0 ? `${localGames.value.length}` : '—'),
    numericTarget: totalGamesCount.value,
    suffix: '',
    color: '#A78BFA',
    // loading 仅在完全无数据时显示
    loading: gamesLoading.value && localGames.value.length === 0,
    source: ownedStats.value ? 'Mixed' : 'Local',
  },
  {
    label: '深度拆解',
    labelEn: 'PM Insights',
    desc: '完成产品拆解报告',
    descEn: 'Teardown Reports Done',
    // 显示实际数量，0 也显示（不显示 '—'）
    value: `${insightCount.value}`,
    numericTarget: insightCount.value,
    suffix: '',
    color: '#FFD600',
    loading: false,
    source: 'Local',
  },
])

// ════════════════════════════════════════════
//  GSAP CountUp 动画
// ════════════════════════════════════════════
const statNumEls = ref<Map<number, HTMLElement>>(new Map())

function setStatRef(idx: number, el: HTMLElement | null) {
  if (el) {
    statNumEls.value.set(idx, el)
  } else {
    statNumEls.value.delete(idx)
  }
}

function runCountUp() {
  nextTick(() => {
    statsDisplay.value.forEach((stat, i) => {
      const el = statNumEls.value.get(i)
      if (!el || stat.loading || stat.numericTarget === 0) return
      const obj = { val: 0 }
      gsap.to(obj, {
        val: stat.numericTarget,
        duration: 1.4,
        ease: 'power2.out',
        delay: i * 0.12,
        onUpdate() {
          if (el) el.textContent = Math.round(obj.val).toLocaleString() + stat.suffix
        }
      })
    })
  })
}

// 监听数据加载完成，触发 CountUp
watch([steamLoading, gamesLoading], ([sL, gL]) => {
  if (!sL && !gL) {
    runCountUp()
  }
})

// ════════════════════════════════════════════
//  Stats 卡片三级明细交互
// ════════════════════════════════════════════
const activeStatIdx = ref<number | null>(null)

function toggleStat(idx: number) {
  activeStatIdx.value = activeStatIdx.value === idx ? null : idx
}

/** 总时长明细：Steam / 手游 / PS5 */
const hoursBreakdown = computed(() => {
  const steamH  = ownedStats.value?.totalHours ?? 0
  const localH  = localGames.value.reduce((s, g) => s + (g.estimatedHours ?? 0), 0)
  const total   = steamH + localH || 1
  // 从 localGames 中分离手游（platform 不含 Steam）
  const mobileH = localGames.value
    .filter(g => g.platform && g.platform.toLowerCase() !== 'steam')
    .reduce((s, g) => s + (g.estimatedHours ?? 0), 0)
  const pureLocalH = localH - mobileH
  return [
    {
      label: 'Steam',
      hours: Math.round(steamH),
      pct: Math.round((steamH / total) * 100),
      color: '#2979FF',
      desc: locale.value === 'en' ? 'PC / Steam library' : 'PC Steam 库存',
    },
    {
      label: locale.value === 'en' ? 'Mobile' : '手游',
      hours: Math.round(mobileH),
      pct: Math.round((mobileH / total) * 100),
      color: '#FF6B6B',
      desc: locale.value === 'en' ? 'HoYoverse / Kuro / Mobile' : '米哈游 / 库洛 / 手游',
    },
    {
      label: locale.value === 'en' ? 'Others' : '其他',
      hours: Math.round(pureLocalH),
      pct: Math.round((pureLocalH / total) * 100),
      color: '#A78BFA',
      desc: locale.value === 'en' ? 'Console / other platforms' : '主机 / 其他平台',
    },
  ]
})

/** 品类明细：去重后带颜色和计数 */
const GENRE_COLORS: Record<string, string> = {
  'Action RPG': '#FF6B6B', 'Gacha': '#FFD600', 'Open World': '#2979FF',
  'Turn-based RPG': '#A78BFA', 'FPS': '#00E5A0', 'Strategy': '#FF9800',
  'Visual Novel': '#F472B6', 'Puzzle': '#22D3EE', 'Simulation': '#84CC16',
}
const genreBreakdown = computed(() => {
  const map = new Map<string, number>()
  localGames.value.forEach(g => g.tags?.forEach(t => {
    if (t) map.set(t.trim(), (map.get(t.trim()) ?? 0) + 1)
  }))
  ;['FPS', 'Strategy', 'Visual Novel', 'Gacha', 'Action RPG', 'Open World', 'Turn-based RPG'].forEach(t => {
    if (!map.has(t)) map.set(t, 0)
  })
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count: count || '—',
      color: GENRE_COLORS[name] ?? '#888',
    }))
})

/** 代表作品明细：按平台分组 */
const gamesBreakdown = computed(() => {
  const steamCount  = ownedStats.value?.totalGames ?? 0
  const hoyo        = localGames.value.filter(g => ['HoYoverse', 'Kuro', '米哈游', '库洛'].some(k => g.platform?.includes(k))).length
  const otherLocal  = localGames.value.length - hoyo
  return [
    { name: 'Steam', count: steamCount, color: '#2979FF', desc: locale.value === 'en' ? 'PC library owned' : 'Steam 购买入库' },
    { name: locale.value === 'en' ? 'HoYo / Kuro' : '米哈游/库洛', count: hoyo, color: '#FF6B6B', desc: locale.value === 'en' ? 'Live-service mobile' : '实时在线手游' },
    { name: locale.value === 'en' ? 'Others' : '其他', count: otherLocal, color: '#A78BFA', desc: locale.value === 'en' ? 'Console / indie' : '主机 / 独立游戏' },
  ]
})

/** 深度拆解明细：有 reviewMarkdown 的游戏列表 */
const insightGames = computed(() =>
  localGames.value.filter(g => g.reviewMarkdown && g.reviewMarkdown.trim().length > 0)
)

// ════════════════════════════════════════════
//  侧滑面板状态
// ════════════════════════════════════════════
const selectedGame = ref<LocalGame | null>(null)

// ════════════════════════════════════════════
//  全量库弹窗
// ════════════════════════════════════════════
const showLibraryPortal = ref(false)

/** 一级入口按钮上显示的总游戏数 */
const allGamesCount = computed(() => {
  const steamOwned = ownedStats.value?.totalGames ?? steamGames.value.length
  return steamOwned + localGames.value.length
})


// ════════════════════════════════════════════
//  初始化：并发加载所有数据，任意失败不阻断其他
// ════════════════════════════════════════════
onMounted(() => {
  Promise.allSettled([
    loadGalleryIndex(),
    loadSteamData(),
    loadLocalGames(),
  ])
})
</script>

<style scoped>
/* ── Brutalist SVG 图标规范 ── */
.brutalist-icon {
  display: inline-block;
  vertical-align: middle;
  filter: drop-shadow(2px 2px 0px #1A1A1A);
}

/* ── 一级入口按钮：流动斜纹装饰 ── */
.stripe-overlay {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 8px,
    rgba(26, 26, 26, 0.07) 8px,
    rgba(26, 26, 26, 0.07) 10px
  );
  background-size: 200% 100%;
  animation: stripe-flow 3s linear infinite;
}
@keyframes stripe-flow {
  from { background-position: 0% 0%; }
  to   { background-position: 200% 0%; }
}

/* 按钮获焦轮廓 */
.full-library-btn:focus-visible {
  outline: 3px solid #1A1A1A;
  outline-offset: 2px;
}

/* Fade in animation */
.fade-in-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-in-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* ── Steam 卡片详情展开/折叠动画 ── */
.steam-expand-enter-active,
.steam-expand-leave-active {
  transition: max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1),
              opacity    0.25s ease;
  overflow: hidden;
  max-height: 600px;
}

.steam-expand-enter-from,
.steam-expand-leave-to {
  max-height: 0;
  opacity: 0;
}


.fade-in-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 手机端 Stat Drawer 右侧抽屉动画（仿米哈游侧滑面板） */
.stat-drawer-enter-active,
.stat-drawer-leave-active {
  transition: opacity 0.25s ease;
}
.stat-drawer-enter-active :global(.stat-drawer-backdrop),
.stat-drawer-leave-active :global(.stat-drawer-backdrop) {
  transition: opacity 0.25s ease;
}
.stat-drawer-enter-active :global(.stat-drawer-panel),
.stat-drawer-leave-active :global(.stat-drawer-panel) {
  transition: transform 0.30s cubic-bezier(0.32, 0.72, 0, 1);
}
.stat-drawer-enter-from { opacity: 0; }
.stat-drawer-leave-to   { opacity: 0; }
.stat-drawer-enter-from :global(.stat-drawer-backdrop) { opacity: 0; }
.stat-drawer-leave-to   :global(.stat-drawer-backdrop) { opacity: 0; }
.stat-drawer-enter-from :global(.stat-drawer-panel) { transform: translateX(100%); }
.stat-drawer-leave-to   :global(.stat-drawer-panel) { transform: translateX(100%); }

/* Stat detail panel slide-down */
.stat-detail-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease, max-height 0.35s ease;
  max-height: 600px;
  overflow: hidden;
}
.stat-detail-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.25s ease;
  max-height: 600px;
  overflow: hidden;
}
.stat-detail-enter-from {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}
.stat-detail-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
</style>
