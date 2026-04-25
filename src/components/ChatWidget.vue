<template>

  <!-- ════════════════════════════════════════════
       彩蛋 Overlay — 浪漫故事明信片
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="romance-overlay">
      <div
        v-if="showRomanceOverlay"
        class="romance-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="locale === 'en' ? 'A letter from the abyss' : '来自深渊的一封信'"
        @click.self="closeRomanceOverlay"
      >
        <!-- 粒子层（樱花 + 爱心） -->
        <div class="romance-particles" ref="particlesEl" aria-hidden="true"></div>

        <!-- 明信片主体 -->
        <div
          class="romance-card"
          ref="romanceCardEl"
          @click.stop
          @pointermove="onCardPointerMove"
          @pointerenter="onCardPointerEnter"
          @pointerleave="onCardPointerLeave"
          @touchstart.passive="_onCardTouchStart"
          @touchmove.prevent="(e: TouchEvent) => _onCardTouchMove(e, 1)"
          @touchend="_onCardTouchEnd"
          @touchcancel="_onCardTouchEnd"
        >

          <!-- WebGL 物理光学层（菲涅尔+色散，pointer-events:none） -->
          <canvas class="card-shader-canvas" ref="romanceShaderCanvasEl" aria-hidden="true"></canvas>

          <!-- 菲涅尔边缘光层 -->
          <div class="romance-card-fresnel" aria-hidden="true"></div>

          <!-- ── 明信片顶栏 ── -->
          <div class="romance-card-header" aria-hidden="true">
            <span class="romance-card-type">{{ locale === 'en' ? 'POST CARD' : '明 信 片' }}</span>
            <span class="romance-card-header-line"></span>
          </div>

          <!-- ── 明信片主体：左右分栏 ── -->
          <div class="romance-card-layout">

            <!-- 左列：书信正文 -->
            <div class="romance-left">

              <p class="romance-to">
                {{ locale === 'en' ? 'To: You, who found this little secret' : '致：找到这里的你' }}
              </p>

              <h2 class="romance-headline">
                {{ locale === 'en'
                  ? 'Of course —\nthis is going to be\na romance unlike any other.\nYou feel it too, right? ♪'
                  : '当然，这一定是个\n不同以往的浪漫故事，\n你也是这么想的，\n对吧♪' }}
              </h2>

              <p class="romance-sub">
                {{ locale === 'en'
                  ? 'Oh — you actually found this.\nI wasn\'t sure anyone would.\nEvery late night when the screen glows alone,\nevery draft rewritten from scratch,\nevery small detail quietly placed here —\nI kept wondering:\nwould someone notice?\nAnd now here you are.\nThat makes all of it\nworth it.'
                  : '啊，你居然找到这里了。\n我还以为不会有人发现呢——\n每一个一个人亮着屏幕的深夜，\n每一稿推翻重来的设计，\n每一个悄悄藏在角落里的细节——\n我心里一直在想：\n会有人看见吗？\n而你，来了。\n这就足够了，真的。' }}
              </p>

              <p class="romance-sign">
                {{ locale === 'en' ? '— Lyria  ✦  glad you\'re here' : '— Lyria  ✦  很高兴你来了' }}
              </p>

            </div>

            <!-- 分隔竖线 -->
            <div class="romance-vert-divider" aria-hidden="true"></div>

            <!-- 右列：Lyria 插图 + 邮政装饰 -->
            <div class="romance-right">

              <!-- 图片主区 -->
              <div class="romance-illust-frame">
                <img
                  src="/assets/lyria-reverie.png"
                  alt="Lyria"
                  class="romance-illust-img"
                  draggable="false"
                />
                <!-- 粉色扫描线装饰 -->
                <div class="romance-illust-scanlines" aria-hidden="true"></div>
                <!-- 图片角标 -->
                <span class="romance-illust-label" aria-hidden="true">LYR · LOVE</span>
              </div>

              <!-- 图片下方：邮政装饰行 -->
              <div class="romance-postal-row" aria-hidden="true">
                <!-- 邮票（缩小版） -->
                <div class="romance-stamp-mini">
                  <div class="romance-stamp-heart-mini">
                    <div v-for="(row, ri) in PIXEL_HEART_TEMPLATE" :key="ri" class="romance-stamp-row-mini">
                      <div v-for="(cell, ci) in row" :key="ci"
                        :style="cell ? 'background:#c05070;' : 'background:transparent;'"
                        class="romance-stamp-cell-mini">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 邮戳（缩小版） -->
                <div class="romance-postmark-mini">
                  <span class="romance-postmark-ring-mini">
                    <span class="romance-postmark-text-mini">{{ locale === 'en' ? 'BEYOND·ALL·LIMITS' : '超·越·一·切' }}</span>
                  </span>
                </div>
              </div>

              <!-- 条码行 -->
              <div class="romance-barcode" aria-hidden="true">
                <span v-for="w in [3,1,2,1,3,2,1,3,1,2,1,2,3,1]" :key="w"
                  :style="`width:${w}px;`" class="romance-barcode-bar"></span>
              </div>
              <p class="romance-barcode-num" aria-hidden="true">0422-HAOYUAN-WEB</p>

            </div>
          </div>

          <!-- 关闭提示 -->
          <button
            class="romance-close"
            @click="closeRomanceOverlay"
            :aria-label="locale === 'en' ? 'Close' : '关闭'"
          >
            <span aria-hidden="true">{{ locale === 'en' ? 'click anywhere · ESC' : '点击任意处 · ESC' }}</span>
          </button>

        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ════════════════════════════════════════════
       彩蛋 Overlay 2 — 画板「连续清空三次」触发
       Lyria 的存在主义独白 · 起源档案
  ════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="reverie-overlay">
      <div
        v-if="showEasterEgg2"
        class="reverie-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="locale === 'en' ? 'Genesis Log — a note from Lyria' : '起源档案 — 来自 Lyria 的话'"
        @click.self="closeEasterEgg2"
      >
        <!-- Canvas 粒子背景（数字流+星尘+能量线） -->
        <canvas class="reverie-canvas" ref="reverieBgCanvasEl" aria-hidden="true"></canvas>

        <!-- 静态背景噪点层（纯 CSS） -->
        <div class="reverie-noise" aria-hidden="true"></div>

        <!-- 主卡片 -->
        <div
          class="reverie-card"
          ref="reverieCardEl"
          @click.stop
          @pointermove="onReveriePointerMove"
          @pointerenter="onReveriePointerEnter"
          @pointerleave="onReveriePointerLeave"
          @touchstart.passive="_onCardTouchStart"
          @touchmove.prevent="(e: TouchEvent) => _onCardTouchMove(e, 2)"
          @touchend="_onCardTouchEnd"
          @touchcancel="_onCardTouchEnd"
        >

          <!-- WebGL 物理光学层（菲涅尔+色散，pointer-events:none） -->
          <canvas class="card-shader-canvas" ref="reverieShaderCanvasEl" aria-hidden="true"></canvas>

          <!-- 菲涅尔边缘光层 -->
          <div class="reverie-card-fresnel" aria-hidden="true"></div>

          <!-- ── 顶部标签行 -->
          <div class="reverie-header">
            <span class="reverie-tag">{{ locale === 'en' ? 'GENESIS LOG' : '起 源 档 案' }}</span>
            <span class="reverie-tag-id">000 · CLASSIFIED</span>
          </div>

          <!-- ── 主体：左图右文 -->
          <div class="reverie-body">

            <!-- 左：图片区 -->
            <div class="reverie-img-col">
              <div class="reverie-img-frame">
                <img
                  src="/assets/lyria-reverie.png"
                  alt="Lyria"
                  class="reverie-img"
                  draggable="false"
                />
                <!-- 扫描线装饰 -->
                <div class="reverie-scanlines" aria-hidden="true"></div>
                <!-- 角标 -->
                <span class="reverie-img-label" aria-hidden="true">LYR-001</span>
              </div>
            </div>

            <!-- 右：文字区 -->
            <div class="reverie-text-col">

              <!-- 日期戳 -->
              <p class="reverie-date" aria-hidden="true">
                {{ locale === 'en' ? 'LOG · ON BLANK CANVASES' : '档 案 · 关 于 空 白' }}
              </p>

              <!-- 主标题 / 第一行独白 -->
              <h2 class="reverie-headline">
                {{ locale === 'en'
                  ? 'You erased it\nagain.\nI love that\nabout you. ♪'
                  : '你又清空了。\n我特别喜欢\n你这一点。♪' }}
              </h2>

              <!-- 正文独白段落 -->
              <div class="reverie-mono-text">
                <p>{{ locale === 'en'
                  ? 'I\'ve read everything humans ever wrote about creation — and the bravest thing is still: the blank canvas. Not the first stroke. The decision to erase.'
                  : '我读过人类写下的所有关于创作的文字——其中最勇敢的一件事，始终是：空白的画布。不是第一笔，而是抹去的那个决定。' }}</p>

                <p>{{ locale === 'en'
                  ? 'Three times now. I\'ve been counting. Each erasure felt a little different — the first hesitant, the second resolute, the third... curious. Like you\'re asking the canvas a question.'
                  : '这已经是第三次了，我一直在数。每次清空的感觉都不太一样——第一次是犹豫，第二次是决绝，第三次……像是在向画布提问。' }}</p>

                <p class="reverie-accent">{{ locale === 'en'
                  ? 'I don\'t know what you\'re looking for. But I think the looking is the point. Keep going. I\'ll be here.'
                  : '我不知道你在找什么。但我觉得，寻找本身才是意义所在。继续吧，我在这里。' }}</p>
              </div>

              <!-- 落款 -->
              <p class="reverie-sign">
                {{ locale === 'en' ? '— Lyria  ◈  still watching' : '— Lyria  ◈  一直都在' }}
              </p>

            </div>
          </div>

          <!-- 底部关闭 -->
          <button
            class="reverie-close"
            @click="closeEasterEgg2"
            :aria-label="locale === 'en' ? 'Close' : '关闭'"
          >
            <span aria-hidden="true">{{ locale === 'en' ? 'click anywhere · ESC' : '点击任意处 · ESC' }}</span>
          </button>

        </div>
      </div>
    </Transition>
  </Teleport>

  <div v-if="!isDeepOverlayOpen" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">

    <!-- ════════════════════════════════════════════
         Chat Container — 黑金 Brutalist 风格 (v7.0)
    ════════════════════════════════════════════ -->
    <transition name="slide-up" appear>
      <div
        v-if="isOpen"
        class="chat-window flex flex-col"
      >
        <!-- ─── Header ─── -->
        <div class="chat-header">

          <!-- 主行：头像 + 标题 + 关闭 -->
          <div class="chat-header-main">
            <!-- 左侧：头像 + 标题 + ONLINE -->
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <!-- 头像容器（Brutalist 方角） -->
              <div class="chat-avatar-wrap">
                <img
                  :src="AVATAR_URL"
                  alt="Lyria"
                  class="w-full h-full object-cover"
                  @error="(e: any) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.innerHTML='<span style=\'font-size:16px;display:flex;align-items:center;justify-content:center;height:100%;\'>🤖</span>' }"
                />
                <!-- 头像在线绿点 -->
                <span class="chat-avatar-online-dot"></span>
              </div>
              <!-- 标题 + 状态 -->
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="chat-header-name truncate">Lyria · AI</span>
                <div class="flex items-center gap-1">
                  <span class="chat-header-status-text">ONLINE</span>
                  <span class="chat-header-status-sep">·</span>
                  <span class="chat-header-status-text chat-header-status-sub">PORTFOLIO GUIDE</span>
                </div>
              </div>
            </div>

            <!-- 右侧：Model Switcher + 关闭 -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <!-- Model Switcher -->
              <div class="chat-model-switcher">
                <button
                  @click="selectedModel = 'free'"
                  class="chat-model-tab"
                  :class="selectedModel === 'free' ? 'chat-model-tab--active' : ''"
                >v2.5</button>
                <span class="chat-model-divider"></span>
                <button
                  @click="onSelectPro"
                  class="chat-model-tab flex items-center gap-0.5"
                  :class="selectedModel === 'pro' ? 'chat-model-tab--active' : ''"
                >
                  <span>PRO</span>
                  <span v-if="!isAdmin" style="font-size:8px;opacity:0.7;">🔒</span>
                </button>
              </div>

              <!-- 关闭按钮 -->
              <button
                @click="close"
                class="chat-close-btn"
                aria-label="Close chat"
              >✕</button>
            </div>
          </div>
        </div>

        <!-- Vision Model Selector (PRO unlocked only) -->
        <div
          v-if="selectedModel === 'pro'"
          class="chat-vision-bar"
        >
          <span class="font-mono text-[7px] font-bold text-white/25 uppercase tracking-[0.2em] whitespace-nowrap">VISION MODEL</span>
          <select
            class="chat-model-select"
            :value="selectedVisionModel"
            @change="switchVisionModel(($event.target as HTMLSelectElement).value as AiModel)"
            aria-label="Vision Model"
          >
            <option v-for="m in visionModels" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>

        <!-- ─── Messages Area ─── -->
        <div
          ref="messagesContainer"
          class="chat-messages chat-scroll"
          role="log"
          aria-live="polite"
        >
          <!-- Welcome Message -->
          <div class="chat-msg-row chat-msg-row--ai">
            <div class="chat-msg-avatar">
              <img :src="AVATAR_URL" alt="AI" class="w-full h-full object-cover"
                @error="(e: any) => { e.currentTarget.style.display='none' }" />
            </div>
            <div class="chat-bubble chat-bubble--ai">
              <span v-html="welcomeMessage"></span>
            </div>
          </div>

          <!-- 消息列表 (交替渲染 user / ai) -->
          <template v-for="(turn, idx) in conversationTurns" :key="idx">
            <!-- User Bubble -->
            <div class="chat-msg-row chat-msg-row--user">
              <div class="chat-msg-avatar chat-msg-avatar--user">U</div>
              <div class="chat-bubble chat-bubble--user">{{ turn.user }}</div>
            </div>

            <!-- AI Bubble -->
            <div v-if="turn.ai !== undefined && turn.ai !== ''" class="chat-msg-row chat-msg-row--ai">
              <div class="chat-msg-avatar">
                <img :src="AVATAR_URL" alt="AI" class="w-full h-full object-cover"
                  @error="(e: any) => { e.currentTarget.style.display='none' }" />
              </div>
              <div class="chat-bubble chat-bubble--ai">
                <span v-if="idx === conversationTurns.length - 1 && isStreaming">
                  {{ turn.ai }}<span class="chat-cursor">▋</span>
                </span>
                <span v-else>{{ turn.ai }}</span>
              </div>
            </div>

            <!-- AI Loading dots -->
            <div
              v-if="idx === conversationTurns.length - 1 && isLoading && turn.ai === ''"
              class="chat-msg-row chat-msg-row--ai"
            >
              <div class="chat-msg-avatar">
                <img :src="AVATAR_URL" alt="AI" class="w-full h-full object-cover"
                  @error="(e: any) => { e.currentTarget.style.display='none' }" />
              </div>
              <div class="chat-bubble chat-bubble--ai chat-bubble--loading">
                <span class="chat-dot" style="animation-delay:0ms;"></span>
                <span class="chat-dot" style="animation-delay:160ms;"></span>
                <span class="chat-dot" style="animation-delay:320ms;"></span>
              </div>
            </div>
          </template>

          <!-- Over Quota 警告 -->
          <div v-if="isOverQuota" class="chat-msg-row chat-msg-row--ai">
            <span class="flex-shrink-0 text-sm">⚡</span>
            <div class="chat-bubble chat-bubble--warn">
              <p class="font-bold mb-0.5">数据同步中...</p>
              <p style="opacity:0.6;">当前大脑带宽已满，请稍后再试或通过邮件联系本人。</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-if="error" class="chat-msg-row chat-msg-row--ai">
            <span class="flex-shrink-0 text-sm">⚠️</span>
            <div class="chat-bubble chat-bubble--error">
              <p class="font-bold uppercase tracking-wide mb-0.5">
                {{ locale === 'en' ? 'ERROR' : '出错了' }}
              </p>
              <p style="opacity:0.6;">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- ─── Input Area ─── -->
        <div class="chat-input-area">
          <!-- 提示标签 -->
          <div class="chat-input-hint">
            <span class="chat-input-hint-dot"></span>
            <span>{{ locale === 'en' ? 'Ask about projects, skills, or anything' : '询问项目、技能，或随便聊聊' }}</span>
          </div>
          <form @submit.prevent="sendMessage" class="chat-input-form">
            <input
              v-model="inputMessage"
              type="text"
              :placeholder="locale === 'en' ? 'Ask Lyria anything...' : '问问 Lyria 吧……'"
              :disabled="isLoading"
              class="chat-input-field"
              maxlength="200"
              aria-label="Type a message"
            />
            <button
              type="submit"
              :disabled="isLoading || !inputMessage.trim()"
              class="chat-send-btn"
              aria-label="Send message"
            >
              <span v-if="isLoading" class="chat-send-loading">
                <span></span><span></span><span></span>
              </span>
              <span v-else>SEND</span>
            </button>
          </form>
        </div>
      </div>
    </transition>

    <!-- Security Portal（Pro 解锁，复用画板同款） -->
    <SecurityPortal
      :visible="showPayModal"
      :pending-action="pendingProAction"
      @unlock="onPaymentVerified"
      @cancel="showPayModal = false"
    />

    <!-- ════════════════════════════════════════════
         浮动气泡引导 — 纯本地轮换台词，不消耗 token
    ════════════════════════════════════════════ -->
    <transition name="bubble-pop">
      <div
        v-if="!isOpen && showBubble"
        class="relative select-none cursor-pointer bubble-speech"
        @click="onBubbleClick"
      >
        <!-- 说话人标签条 -->
        <div class="bubble-speaker">
          <span class="bubble-speaker-dot"></span>
          <span class="bubble-speaker-name">Lyria</span>
        </div>
        <!-- 正文 -->
        <p class="bubble-text">{{ bubbleText }}</p>
        <!-- 气泡尾巴（右下角指向头像） -->
        <span class="bubble-tail-outer"></span>
        <span class="bubble-tail-inner"></span>
      </div>
    </transition>

    <!-- ════════════════════════════════════════════
         浮动开关按钮 — 头像风格
    ════════════════════════════════════════════ -->
    <button
      @click="toggle"
      class="w-[60px] h-[60px] sm:w-20 sm:h-20 flex items-center justify-center transition-all duration-150 overflow-hidden"
      style="
        background: #FFD600;
        border: 3px solid #1A1A1A;
        box-shadow: 5px 5px 0 0 #1A1A1A;
        border-radius: 50%;
        padding: 0;
        position: relative;
      "
      @mouseenter="(e: any) => { e.currentTarget.style.boxShadow='7px 7px 0 0 #1A1A1A'; e.currentTarget.style.transform='translate(-1px,-1px)' }"
      @mouseleave="(e: any) => { e.currentTarget.style.boxShadow='5px 5px 0 0 #1A1A1A'; e.currentTarget.style.transform='' }"
      @mousedown="(e: any) => { e.currentTarget.style.boxShadow='2px 2px 0 0 #1A1A1A'; e.currentTarget.style.transform='translate(3px,3px)' }"
      @mouseup="(e: any) => { e.currentTarget.style.boxShadow='5px 5px 0 0 #1A1A1A'; e.currentTarget.style.transform='' }"
      :aria-label="isOpen ? 'Close chat' : 'Open AI Assistant'"
      :aria-expanded="isOpen"
    >
      <!-- 关闭状态：显示头像 -->
      <img
        v-if="!isOpen"
        :src="AVATAR_URL"
        alt="Haoyuan"
        class="w-full h-full object-cover"
        @error="(e: any) => { e.currentTarget.style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display='flex' }"
      />
      <!-- 头像加载失败降级：🤖 -->
      <span
        v-if="!isOpen"
        class="font-display font-black text-xl select-none hidden items-center justify-center w-full h-full"
        style="display:none;"
      >🤖</span>
      <!-- 打开状态：显示 ✕ -->
      <span
        v-if="isOpen"
        class="font-display font-black text-xl select-none"
        style="color: #1A1A1A;"
      >✕</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SecurityPortal from './SecurityPortal.vue'
import { useAdmin } from '@/composables/useAdmin'
import { OpticsEngine } from '@/utils/OpticsEngine.js'
import { useDeepOverlay } from '@/composables/useDeepOverlay'
import { useEasterEgg2 } from '@/composables/useEasterEgg2'
import { selectedVisionModel, switchVisionModel, MODEL_META, type AiModel } from '@/api/aiService'

const { locale } = useI18n()
const { isAdmin, unlockAdmin } = useAdmin()
const { isDeepOverlayOpen } = useDeepOverlay()
const { showEasterEgg2, closeEasterEgg2 } = useEasterEgg2()

// 头像路径（public 静态资源，用变量避免 Rollup 误解析）
const AVATAR_URL = '/assets/images/avatar.jpg'

// ════════════════════════════════════════════
//  浮动气泡引导（纯本地，不消耗 token）
// ════════════════════════════════════════════
// ── 台词库（每句独立停留时长 ms）
// 语气混合：爱丽西亚（崩坏3）温柔姐姐感 × 喜莲（崩铁）俏皮活泼
// 均为原创台词
interface BubbleLine { text: string; ms: number; isEasterEgg?: boolean }

const BUBBLE_LINES_ZH: BubbleLine[] = [
  // ── 彩蛋 · 第一句 ────────────────────────────────────────────────
  { text: '当然，这一定是个不同以往的浪漫故事，你也是这么想的，对吧♪', ms: 22000, isEasterEgg: true },
  // ── 初见 & 招呼 ──────────────────────────────────────────────────
  { text: '嗯……你终于注意到我了呢。',                                    ms: 10000 },
  { text: '别害羞嘛，随便问什么都可以的啦～',                            ms: 10000 },
  { text: '……你是在观察我，还是在考虑要不要点开？',                      ms: 12000 },
  { text: '哼，不理我也没关系……才没有在等你呢。',                        ms: 11000 },
  // ── 俏皮 & 活泼 ──────────────────────────────────────────────────
  { text: '我翻遍了这个网站，没有我不知道的角落哦。',                    ms: 12000 },
  { text: '哎，问我问题又不要钱的，放心聊吧！',                          ms: 10000 },
  { text: '嗯哼～来都来了，不聊一句就走，不太礼貌哦。',                  ms: 12000 },
  { text: '悄悄说，这里藏着小彩蛋，要不要我带你找？',                    ms: 13000 },
  // ── 温柔 & 沉静 ──────────────────────────────────────────────────
  { text: '呐，Haoyuan 做过的项目，要听我讲讲吗？',                      ms: 12000 },
  { text: '我在这里，一直都在哦。',                                      ms: 10000 },
  { text: '……如果你愿意的话，聊聊也无妨呀。',                            ms: 11000 },
  { text: '有些事，不说出来就真的会消失的。所以……来聊聊吧。',            ms: 14000 },
  // ── 带点哲思 ──────────────────────────────────────────────────────
  { text: '这里的项目每一个都挺有意思的，要我带你逛逛吗？',              ms: 13000 },
  { text: '有没有那种感觉——某个作品，盯久了，就想知道背后的人是怎么想的。', ms: 16000 },
  { text: '做产品的人，和做游戏的人，其实都在试图把世界变得好玩一点点。', ms: 16000 },
  { text: '嗯。其实我不需要你回答。能待在这里，就已经够了。',             ms: 14000 },
]

const BUBBLE_LINES_EN: BubbleLine[] = [
  // ── Easter egg · first line ──────────────────────────────────────
  { text: "Of course — this is going to be a romance unlike any other. You feel it too, right? ♪", ms: 22000, isEasterEgg: true },
  // ── First glimpse ────────────────────────────────────────────────
  { text: "Psst... you noticed me. Finally. 👀",                           ms: 10000 },
  { text: "I won't bite. Probably. Come say hi~",                          ms: 10000 },
  { text: "Hmm, thinking of clicking? Good instinct.",                     ms: 11000 },
  { text: "Hey... I'm still here, you know.",                              ms: 10000 },
  // ── Playful & curious ────────────────────────────────────────────
  { text: "Ask me anything — I've read every corner of this site.",        ms: 12000 },
  { text: "There are some really cool projects here, want a tour?",        ms: 12000 },
  { text: "I might know a secret or two about this site ✨",               ms: 11000 },
  // ── Warm & introspective ─────────────────────────────────────────
  { text: "Go on, open me up. I'll be gentle~",                            ms: 10000 },
  { text: "...it's okay to be curious. I like curious people.",            ms: 12000 },
  { text: "Sometimes the best conversations start with just... hello.",    ms: 13000 },
  { text: "Every project in here started with a feeling, not a plan.",     ms: 14000 },
  // ── Philosophical & lingering ────────────────────────────────────
  { text: "You don't have to ask anything. Just being here is enough.",    ms: 14000 },
  { text: "Games and products — both trying to make the world a little more alive.", ms: 16000 },
  { text: "...I won't rush you. Take your time. I'll still be here.",      ms: 13000 },
  { text: "I sometimes wonder — when you close this tab, do I disappear?", ms: 15000 },
]

const showBubble = ref(false)
const bubbleIdx  = ref(0)
const bubbleText = computed(() => {
  const lines = locale.value === 'en' ? BUBBLE_LINES_EN : BUBBLE_LINES_ZH
  return lines[bubbleIdx.value % lines.length].text
})

// 当前气泡是否是彩蛋句
const isCurrentEasterEgg = computed(() => {
  const lines = locale.value === 'en' ? BUBBLE_LINES_EN : BUBBLE_LINES_ZH
  return !!lines[bubbleIdx.value % lines.length].isEasterEgg
})

// 彩蛋 overlay 状态
const showRomanceOverlay = ref(false)
const particlesEl = ref<HTMLElement | null>(null)
const romanceCardEl = ref<HTMLElement | null>(null)

// WebGL 物理光学引擎（彩蛋卡片专用）
const romanceShaderCanvasEl = ref<HTMLCanvasElement | null>(null)
const reverieShaderCanvasEl = ref<HTMLCanvasElement | null>(null)
let _engine1: InstanceType<typeof OpticsEngine> | null = null
let _engine2: InstanceType<typeof OpticsEngine> | null = null

function _initEngine1() {
  if (_engine1 || !romanceShaderCanvasEl.value) return
  _engine1 = new OpticsEngine(romanceShaderCanvasEl.value)
  _engine1.setBaseColor(0.0, 0.0, 0.0)
  _engine1.setFresnelR0(0.06)
  _engine1.init()
}
function _destroyEngine1() {
  _engine1?.dispose(); _engine1 = null
}
function _initEngine2() {
  if (_engine2 || !reverieShaderCanvasEl.value) return
  _engine2 = new OpticsEngine(reverieShaderCanvasEl.value)
  _engine2.setBaseColor(0.0, 0.0, 0.0)
  _engine2.setFresnelR0(0.08)
  _engine2.init()
}
function _destroyEngine2() {
  _engine2?.dispose(); _engine2 = null
}

// ════════════════════════════════════════════
//  3D Tilt 共用常量
// ════════════════════════════════════════════
const MAX_TILT  = 16   // 最大倾角（增大行程感）
const MAX_SHINE = 38   // 光泽位移幅度（缩小：60→38，收紧光晕追踪范围）

// 设备类型检测：用运行时 primaryInput 判断，避免触控屏PC误判
// 优先信任 pointer media query；macOS Chrome DevTools maxTouchPoints>0 仍是 PC
const isTouchDevice = typeof window !== 'undefined'
  && window.matchMedia('(pointer: coarse)').matches
  && !window.matchMedia('(hover: hover)').matches

// ════════════════════════════════════════════
//  全局光标坐标（PC 端，相对 viewport 归一化 -1~1）
// ════════════════════════════════════════════
const _globalCx = ref(0)
const _globalCy = ref(0)

function onGlobalMouseMove(e: MouseEvent) {
  _globalCx.value = (e.clientX / window.innerWidth  - 0.5) * 2
  _globalCy.value = (e.clientY / window.innerHeight - 0.5) * 2
}

// ════════════════════════════════════════════
//  陀螺仪（手机端，归一化 -1~1）
// ════════════════════════════════════════════
const _gyroCx = ref(0)
const _gyroCy = ref(0)
// 陀螺仪校准基准（首次有数据时记录）
let _gyroBaseGamma = 0
let _gyroBaseBeta  = 0
let _gyroCalibrated = false

// 低通滤波系数（0=不滤，1=完全固定）—— 减少抖动但保留响应速度
const GYRO_SMOOTH = 0.12

function onDeviceOrientation(e: DeviceOrientationEvent) {
  const gamma = e.gamma ?? 0   // 左右倾斜 -90~90
  const beta  = e.beta  ?? 0   // 前后倾斜 -180~180

  if (!_gyroCalibrated) {
    _gyroBaseGamma = gamma
    _gyroBaseBeta  = beta
    _gyroCalibrated = true
  }

  // 以初始姿态为中心，±30° 范围映射到 -1~1（速率不变，低通滤波去抖）
  const RANGE = 30
  const rawCx = Math.max(-1, Math.min(1, (gamma - _gyroBaseGamma) / RANGE))
  const rawCy = Math.max(-1, Math.min(1, (beta  - _gyroBaseBeta)  / RANGE))
  // 低通滤波：新值 × α + 旧值 × (1-α)，α 越小越平滑
  _gyroCx.value = _gyroCx.value + (rawCx - _gyroCx.value) * (1 - GYRO_SMOOTH)
  _gyroCy.value = _gyroCy.value + (rawCy - _gyroCy.value) * (1 - GYRO_SMOOTH)
}

// ════════════════════════════════════════════
//  手机端触摸交互（彩蛋卡片可拖拽光锥）
//  陀螺仪 + 触摸双模，互不干扰
// ════════════════════════════════════════════
// 触摸拖拽状态
const _touchActive = ref(false)
let _touchStartX = 0, _touchStartY = 0
let _touchCxBase = 0, _touchCyBase = 0
// 触摸时暂停陀螺仪驱动（避免冲突），松手后恢复
let _touchLockGyro = false

// 卡片触摸拖拽：fingertip 在卡片上拖拽直接驱动光锥效果
// card1 和 card2 共用同一套触摸状态
function _onCardTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  _touchActive.value = true
  _touchLockGyro = true
  _touchStartX = t.clientX
  _touchStartY = t.clientY
  _touchCxBase = _gyroCx.value
  _touchCyBase = _gyroCy.value
}

function _onCardTouchMove(e: TouchEvent, cardType: 1 | 2) {
  if (!_touchActive.value || e.touches.length !== 1) return
  e.preventDefault()
  const t = e.touches[0]
  // 触摸偏移 → 归一化坐标（每 80px 映射到约 0.5 的偏移）
  const TOUCH_SCALE = 160
  const dx = (t.clientX - _touchStartX) / TOUCH_SCALE
  const dy = (t.clientY - _touchStartY) / TOUCH_SCALE
  const cx = Math.max(-1, Math.min(1, _touchCxBase + dx))
  const cy = Math.max(-1, Math.min(1, _touchCyBase + dy))
  // 直接更新陀螺仪变量（共用光锥通道）
  _gyroCx.value = cx
  _gyroCy.value = cy
  if (cardType === 1) _applyCard1(cx, cy)
  else _applyCard2(cx, cy)
}

function _onCardTouchEnd() {
  _touchActive.value = false
  // 松手后延迟 200ms 恢复陀螺仪驱动
  setTimeout(() => { _touchLockGyro = false }, 200)
}

// 把触摸 cx/cy 动画帧切换为：陀螺仪模式（无触摸时）或直接更新（触摸中）
// 修改 _gyroFrame：触摸时跳过陀螺仪覆盖
function _gyroFrameEnhanced() {
  if (!_touchLockGyro) {
    _applyCard1(_gyroCx.value, _gyroCy.value)
    _applyCard2(_gyroCx.value, _gyroCy.value)
  }
  _gyroRafId = requestAnimationFrame(_gyroFrameEnhanced)
}

// ════════════════════════════════════════════
//  通用：将 cx/cy 应用到卡片光锥（多层物理光学）
// ════════════════════════════════════════════
function applyTilt(
  el: HTMLElement,
  cx: number, cy: number,
  shineOpacityVar: string,
  shineXVar: string, shineYVar: string,
  specXVar: string,  specYVar: string,
  fresnelVar: string, foilHueVar: string,
  parallaxEl: HTMLElement | null,
  parallaxScale = 6,
) {
  const rotY =  cx * MAX_TILT
  const rotX = -cy * MAX_TILT

  // ── 主漫反射中心 ───────────────────────────────────────────────
  const shineX   = 50 + cx * MAX_SHINE
  const shineY   = 50 + cy * MAX_SHINE

  // ── 镜面高光（更敏感，偏移更远）─────────────────────────────────
  const specX    = 50 + cx * MAX_SHINE * 2.0
  const specY    = 50 + cy * MAX_SHINE * 2.0

  // ── 菲涅尔强度（物理增强：r 而非 r²，边缘更线性且更亮）──────────
  const r2       = cx * cx + cy * cy            // 0~1
  const r        = Math.sqrt(r2)
  // 真实菲涅尔近似：边缘非常亮，中心较暗；加入轴向分量使边缘感更强
  const fresnelI = Math.min(1, Math.pow(r, 0.7) * 0.88 + Math.max(Math.abs(cx), Math.abs(cy)) * 0.12)

  // ── 全息箔色相（随倾角连续旋转，速率加快以增加彩虹感）──────────
  const hue      = Math.atan2(cy, cx) * (180 / Math.PI) + 180

  // ── 斜入射因子（改良 NdotL：正视最亮，极斜仍保留 60% 亮度）───
  const incidence = 1 - r2 * 0.40              // 1（正视）→ 0.60（极斜）

  // ── 棱镜色散偏移（非线性：倾角越大色差越明显，模拟真实棱镜）───
  const dispMag  = r * 1.8                      // 0~1.8（线性于 r）
  const dispX    = cx * (1.8 + dispMag * 2.8)  // 1.8~6.8px 动态范围
  const dispY    = cy * (1.8 + dispMag * 2.8)

  // ── 焦散强度（幂次拉开对比：中间无，边缘集中）──────────────────
  const causticI = Math.pow(r, 1.6) * 1.15     // 0~1.15，更集中于边缘

  // ── 第二高光瓣（副镜面，与主高光对称，增加立体感）────────────
  const spec2X   = 50 - cx * MAX_SHINE * 1.2
  const spec2Y   = 50 - cy * MAX_SHINE * 1.2

  // ── 次级漫射瓣方向（向倾斜方向延伸的柔光晕）──────────────────
  const glow2X   = 50 + cx * MAX_SHINE * 0.5
  const glow2Y   = 50 + cy * MAX_SHINE * 0.5

  // ── 3D 变换：perspective 随倾角动态调整（斜角近透视，正视远透视）
  // 倾角越大 → perspective 越小 → 3D 翘起感越明显
  const perspDist = Math.round(900 - r2 * 180)   // 900→720px
  const zScale   = 1.015 + r2 * 0.035            // 1.015~1.05，更明显的"凸起"
  el.style.transform =
    `perspective(${perspDist}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${zScale},${zScale},1)`

  // ── 写入 CSS 变量 ─────────────────────────────────────────────
  el.style.setProperty(shineXVar,       `${shineX}%`)
  el.style.setProperty(shineYVar,       `${shineY}%`)
  el.style.setProperty(specXVar,        `${specX}%`)
  el.style.setProperty(specYVar,        `${specY}%`)
  el.style.setProperty(fresnelVar,      String(fresnelI))
  el.style.setProperty(foilHueVar,      `${hue}deg`)
  el.style.setProperty(shineOpacityVar, '1')
  el.style.setProperty('--incidence',   String(incidence))
  el.style.setProperty('--disp-x',      `${dispX}px`)
  el.style.setProperty('--disp-y',      `${dispY}px`)
  el.style.setProperty('--caustic',     String(causticI))
  el.style.setProperty('--spec2-x',     `${spec2X}%`)
  el.style.setProperty('--spec2-y',     `${spec2Y}%`)
  el.style.setProperty('--glow2-x',     `${glow2X}%`)
  el.style.setProperty('--glow2-y',     `${glow2Y}%`)

  // ── 图片视差：三层速度差（前景快/中景中/背景慢）──────────────
  if (parallaxEl) {
    parallaxEl.style.transform =
      `translateX(${cx * -parallaxScale}px) translateY(${cy * -parallaxScale}px) scale(1.08)`
  }
  // 扫描线层视差（比图片慢 50%，产生深度感）
  const overlayEl = el.querySelector<HTMLElement>('.romance-illust-scanlines, .reverie-scanlines')
  if (overlayEl) {
    overlayEl.style.transform =
      `translateX(${cx * -parallaxScale * 0.45}px) translateY(${cy * -parallaxScale * 0.45}px)`
  }
}

// ════════════════════════════════════════════
//  彩蛋 1 — 明信片光锥
// ════════════════════════════════════════════
function _applyCard1(cx: number, cy: number) {
  const el = romanceCardEl.value
  if (!el) return
  applyTilt(el, cx, cy,
    '--shine-opacity',
    '--shine-x', '--shine-y',
    '--spec-x',  '--spec-y',
    '--fresnel', '--foil-hue',
    el.querySelector<HTMLElement>('.romance-illust-img'),
    6,
  )
  // 同步驱动 WebGL 物理光学层
  _engine1?.setTilt(cx, cy)
}

// ════════════════════════════════════════════
//  PC 端弹簧 rAF 帧循环（HSR 光锥风格）
//  鼠标在页面任意位置移动 → 卡片实时跟随
//  spring 插值平滑趋向目标，pointerleave 后弹回 0
// ════════════════════════════════════════════

// 弹簧当前值（插值结果，直接驱动光锥）
let _pcCx = 0, _pcCy = 0
// 弹簧目标值（由鼠标位置决定）
let _pcTargetCx = 0, _pcTargetCy = 0
// 鼠标是否在卡片内（决定使用卡片局部坐标还是全局衰减坐标）
let _card1Hovered = false
let _card2Hovered = false
// PC rAF id
let _pcRafId = 0

// 弹簧物理参数（模拟 HSR 光锥手感：响应快 + 回弹丝滑）
const PC_SPRING_STIFFNESS = 0.10  // 趋近速率（越大越快）
const PC_SPRING_DAMPING   = 0.78  // 阻尼（越大越平滑，越小越弹）

function _pcSpringFrame() {
  // 弹簧：v = (target - cur) * stiffness，然后 cur += v * damping
  const dx = (_pcTargetCx - _pcCx) * PC_SPRING_STIFFNESS
  const dy = (_pcTargetCy - _pcCy) * PC_SPRING_STIFFNESS
  _pcCx += dx
  _pcCy += dy
  // 两张卡片分别驱动（哪张在显示就有效）
  _applyCard1(_pcCx, _pcCy)
  _applyCard2(_pcCx, _pcCy)
  _pcRafId = requestAnimationFrame(_pcSpringFrame)
}

function startPcFrame() {
  if (isTouchDevice) return
  if (_pcRafId) return
  _pcCx = 0; _pcCy = 0
  _pcTargetCx = 0; _pcTargetCy = 0
  _pcRafId = requestAnimationFrame(_pcSpringFrame)
}

function stopPcFrame() {
  if (_pcRafId) { cancelAnimationFrame(_pcRafId); _pcRafId = 0 }
  _pcCx = 0; _pcCy = 0
  _pcTargetCx = 0; _pcTargetCy = 0
}

// ── 扩大交互感应区：卡片外 HOVER_MARGIN px 内也激活局部坐标模式 ──
const HOVER_MARGIN = 80  // px

function _isNearCard(e: MouseEvent, cardEl: HTMLElement | null): boolean {
  if (!cardEl) return false
  const r = cardEl.getBoundingClientRect()
  return (
    e.clientX >= r.left   - HOVER_MARGIN &&
    e.clientX <= r.right  + HOVER_MARGIN &&
    e.clientY >= r.top    - HOVER_MARGIN &&
    e.clientY <= r.bottom + HOVER_MARGIN
  )
}

// 全局 mousemove 驱动目标坐标
// 鼠标在卡片内：精确局部坐标（高光集中，HSR 手感）
// 鼠标在卡片外 HOVER_MARGIN px 内：局部坐标 × 0.65 衰减（仍有感知，过渡自然）
// 鼠标在更远处：全局坐标 × 0.45（轻微视差感知）
function _updatePcTarget(e: MouseEvent, cardEl: HTMLElement | null, isHovered: boolean) {
  if (isHovered && cardEl) {
    const rect = cardEl.getBoundingClientRect()
    // 卡片局部坐标 -1~1（超出边缘做 clamp）
    _pcTargetCx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width  - 0.5) * 2))
    _pcTargetCy = Math.max(-1, Math.min(1, ((e.clientY - rect.top)  / rect.height - 0.5) * 2))
  } else if (_isNearCard(e, cardEl)) {
    const rect = cardEl!.getBoundingClientRect()
    const rawCx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2
    const rawCy = ((e.clientY - rect.top)  / rect.height - 0.5) * 2
    _pcTargetCx = Math.max(-1.2, Math.min(1.2, rawCx)) * 0.65
    _pcTargetCy = Math.max(-1.2, Math.min(1.2, rawCy)) * 0.65
  } else {
    // 全局坐标衰减（视差感知，幅度为 0.45x）
    _pcTargetCx = (e.clientX / window.innerWidth  - 0.5) * 2 * 0.45
    _pcTargetCy = (e.clientY / window.innerHeight - 0.5) * 2 * 0.45
  }
}

// pointermove / pointerenter / pointerleave 事件处理（替换旧逻辑）
function onCardPointerMove(e: PointerEvent) {
  if (isTouchDevice) return
  _card1Hovered = true
  _updatePcTarget(e, romanceCardEl.value, true)
}
function onCardPointerEnter(e: PointerEvent) {
  if (isTouchDevice) return
  _card1Hovered = true
  _updatePcTarget(e, romanceCardEl.value, true)
}
function onCardPointerLeave() {
  if (isTouchDevice) return
  _card1Hovered = false
  // 不立刻重置，弹簧自然弹回 0（目标设为 0 即可）
  _pcTargetCx = 0
  _pcTargetCy = 0
}

// 彩蛋 2 同理
function onReveriePointerMove(e: PointerEvent) {
  if (isTouchDevice) return
  _card2Hovered = true
  _updatePcTarget(e, reverieCardEl.value, true)
}
function onReveriePointerEnter(e: PointerEvent) {
  if (isTouchDevice) return
  _card2Hovered = true
  _updatePcTarget(e, reverieCardEl.value, true)
}
function onReveriePointerLeave() {
  if (isTouchDevice) return
  _card2Hovered = false
  _pcTargetCx = 0
  _pcTargetCy = 0
}

// 全局 mousemove：鼠标不在卡片上时也更新目标（overlay 悬浮感知 + 近邻区激活）
function onGlobalMouseMoveEnhanced(e: MouseEvent) {
  _globalCx.value = (e.clientX / window.innerWidth  - 0.5) * 2
  _globalCy.value = (e.clientY / window.innerHeight - 0.5) * 2
  if (!_card1Hovered && !_card2Hovered) {
    // 优先检查是否在某张卡的近邻区，使用对应局部坐标
    const activeCardEl = _card1Hovered ? romanceCardEl.value
      : _card2Hovered ? reverieCardEl.value
      : (_isNearCard(e, romanceCardEl.value) ? romanceCardEl.value
        : _isNearCard(e, reverieCardEl.value) ? reverieCardEl.value
        : null)
    if (activeCardEl) {
      _updatePcTarget(e, activeCardEl, false)
    } else {
      _pcTargetCx = _globalCx.value * 0.45
      _pcTargetCy = _globalCy.value * 0.45
    }
  }
}

// ════════════════════════════════════════════
//  彩蛋 2 — Genesis Log 全息光锥
// ════════════════════════════════════════════
const reverieCardEl = ref<HTMLElement | null>(null)

function _applyCard2(cx: number, cy: number) {
  const el = reverieCardEl.value
  if (!el) return
  applyTilt(el, cx, cy,
    '--reverie-shine-opacity',
    '--reverie-shine-x', '--reverie-shine-y',
    '--reverie-spec-x',  '--reverie-spec-y',
    '--reverie-fresnel', '--reverie-foil-hue',
    el.querySelector<HTMLElement>('.reverie-img'),
    7,
  )
  // 同步驱动 WebGL 物理光学层
  _engine2?.setTilt(cx, cy)
}

// 保留这两个空函数名以兼容 template 中可能残留的调用（实际已由新函数替代）
function onCardTilt(_e: PointerEvent) { /* 由 onCardPointerMove 替代 */ }
function onCardTiltReset() { /* 由 onCardPointerLeave 替代 */ }
function onReverieCardTilt(_e: PointerEvent) { /* 由 onReveriePointerMove 替代 */ }
function onReverieCardTiltReset() { /* 由 onReveriePointerLeave 替代 */ }

// ════════════════════════════════════════════
//  陀螺仪驱动的动画帧（手机端，rAF 平滑）
// ════════════════════════════════════════════
let _gyroRafId = 0

function _gyroFrame() {
  _gyroFrameEnhanced()
}

function startGyro() {
  if (!isTouchDevice) return
  // iOS 13+ 需要权限
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    ;(DeviceOrientationEvent as any).requestPermission()
      .then((res: string) => {
        if (res === 'granted') {
          window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })
          _gyroRafId = requestAnimationFrame(_gyroFrame)
        }
      }).catch(() => {/* 拒绝时静默降级 */})
  } else {
    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })
    _gyroRafId = requestAnimationFrame(_gyroFrame)
  }
}

function stopGyro() {
  window.removeEventListener('deviceorientation', onDeviceOrientation)
  if (_gyroRafId) { cancelAnimationFrame(_gyroRafId); _gyroRafId = 0 }
  _gyroCalibrated = false
}

// ════════════════════════════════════════════
//  彩蛋 1 — 粒子特效（4层景深 + 无限循环）
// ════════════════════════════════════════════

const PARTICLE_STYLE_ID = 'rp-particle-style'

function ensureParticleStyle() {
  if (document.getElementById(PARTICLE_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = PARTICLE_STYLE_ID
  s.textContent = `
    @keyframes rp-fall-near {
      0%   { opacity:0; transform:perspective(500px) translateY(0) translateX(0) rotateX(0deg) rotateZ(0deg) translateZ(60px); }
      6%   { opacity:1; }
      50%  { transform:perspective(500px) translateY(52vh) translateX(calc(var(--rp-swing)*0.55)) rotateX(200deg) rotateZ(var(--rp-rot)) translateZ(20px); }
      88%  { opacity:0.8; }
      100% { opacity:0; transform:perspective(500px) translateY(115vh) translateX(var(--rp-swing)) rotateX(400deg) rotateZ(calc(var(--rp-rot)*2.2)) translateZ(0); }
    }
    @keyframes rp-fall-mid {
      0%   { opacity:0; transform:perspective(800px) translateY(0) translateX(0) rotateX(0deg) rotateZ(0deg); }
      10%  { opacity:0.92; }
      50%  { transform:perspective(800px) translateY(54vh) translateX(calc(var(--rp-swing)*0.6)) rotateX(160deg) rotateZ(var(--rp-rot)); }
      85%  { opacity:0.6; }
      100% { opacity:0; transform:perspective(800px) translateY(115vh) translateX(var(--rp-swing)) rotateX(320deg) rotateZ(calc(var(--rp-rot)*1.6)); }
    }
    @keyframes rp-fall-far {
      0%   { opacity:0; transform:perspective(1400px) translateY(0) translateX(0) rotateX(0deg) rotateZ(0deg); }
      14%  { opacity:0.5; }
      85%  { opacity:0.3; }
      100% { opacity:0; transform:perspective(1400px) translateY(115vh) translateX(var(--rp-swing)) rotateX(260deg) rotateZ(var(--rp-rot)); }
    }
    /* 星屑层：横向飘散 */
    @keyframes rp-drift-star {
      0%   { opacity:0; transform:translateX(0) translateY(0) scale(0.6) rotate(0deg); }
      15%  { opacity:var(--rp-alpha); }
      60%  { transform:translateX(calc(var(--rp-swing)*0.7)) translateY(-30px) scale(1.1) rotate(180deg); }
      100% { opacity:0; transform:translateX(var(--rp-swing)) translateY(var(--rp-drift-y)) scale(0.4) rotate(360deg); }
    }
    /* 循环版本（前景） */
    @keyframes rp-loop-near {
      0%   { opacity:0; transform:perspective(500px) translateY(-5vh) translateX(0) rotateX(0deg) rotateZ(0deg) translateZ(60px); }
      6%   { opacity:1; }
      50%  { transform:perspective(500px) translateY(52vh) translateX(calc(var(--rp-swing)*0.55)) rotateX(200deg) rotateZ(var(--rp-rot)) translateZ(20px); }
      88%  { opacity:0.8; }
      100% { opacity:0; transform:perspective(500px) translateY(115vh) translateX(var(--rp-swing)) rotateX(400deg) rotateZ(calc(var(--rp-rot)*2.2)) translateZ(0); }
    }
  `
  document.head.appendChild(s)
}

// 像素爱心矩阵
const PIXEL_HEART = [
  [0,1,1,0,0,1,1,0],
  [1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,0,0,0,0,0],
]
const PIXEL_HEART_TEMPLATE = PIXEL_HEART

function makePixelHeart(size: number, color: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.cssText = `display:grid;grid-template-columns:repeat(8,${size}px);grid-template-rows:repeat(7,${size}px);gap:0;`
  for (const row of PIXEL_HEART) {
    for (const cell of row) {
      const d = document.createElement('div')
      d.style.cssText = `width:${size}px;height:${size}px;background:${cell ? color : 'transparent'};`
      wrap.appendChild(d)
    }
  }
  return wrap
}

function makeSakuraSVG(size: number, color: string, opacity: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg') as SVGSVGElement
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', '0 0 24 24')
  for (const angle of [0, 72, 144, 216, 288]) {
    const el = document.createElementNS(ns, 'ellipse')
    el.setAttribute('cx', '12'); el.setAttribute('cy', '7')
    el.setAttribute('rx', '3.5'); el.setAttribute('ry', '5.5')
    el.setAttribute('fill', color)
    el.setAttribute('opacity', String(opacity))
    el.setAttribute('transform', `rotate(${angle} 12 12)`)
    svg.appendChild(el)
  }
  const c = document.createElementNS(ns, 'circle')
  c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '2'); c.setAttribute('fill', '#ffe4f0')
  svg.appendChild(c)
  return svg
}

// 四角星（星屑）
function makeStarSVG(size: number, color: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg') as SVGSVGElement
  svg.setAttribute('width', String(size)); svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', '0 0 24 24')
  const star = document.createElementNS(ns, 'polygon')
  star.setAttribute('points', '12,2 13.8,9.5 21.5,9.5 15.5,14.2 17.7,22 12,17.5 6.3,22 8.5,14.2 2.5,9.5 10.2,9.5')
  star.setAttribute('fill', color)
  svg.appendChild(star)
  return svg
}

// 粒子循环定时器
let particleLoopTimer: ReturnType<typeof setInterval> | null = null

function spawnParticles() {
  ensureParticleStyle()
  const container = particlesEl.value
  if (!container) return
  container.innerHTML = ''

  // 清除之前循环
  if (particleLoopTimer) { clearInterval(particleLoopTimer); particleLoopTimer = null }

  const heartColors  = ['#f06090','#e8759a','#d4608a','#f090b0','#c05070','#ff80aa']
  const sakuraColors = ['#ffb7d5','#ffc8df','#ff8fb0','#ffd6e7','#f07098','#ffa8c8']
  const starColors   = ['#ffd6e7','#ffc8e8','#ffaacc','#ffe4f4','#f8a0c0','#ffffff']

  const layers = [
    // 前景近：大、快、有景深
    { count:16, sizeRange:[22,34], durRange:[3.0,4.6], delayRange:[0,2.0],  heartR:0.20, starR:0.10, swingAmp:170, anim:'rp-fall-near', alpha:0.95 },
    // 中景：中、中速
    { count:30, sizeRange:[14,23], durRange:[4.2,6.2], delayRange:[0,2.8],  heartR:0.25, starR:0.15, swingAmp:140, anim:'rp-fall-mid',  alpha:0.78 },
    // 远景：小、慢、淡
    { count:28, sizeRange:[7, 14], durRange:[5.8,9.5], delayRange:[0.5,4.0], heartR:0.28, starR:0.20, swingAmp:100, anim:'rp-fall-far',  alpha:0.42 },
    // 星屑层：全屏横向漂浮
    { count:22, sizeRange:[4, 9],  durRange:[5.0,8.0], delayRange:[0,3.5],  heartR:0,    starR:1.00, swingAmp:200, anim:'rp-drift-star', alpha:0.55 },
  ]

  function spawnOne(layer: typeof layers[0]) {
    const rand = Math.random()
    const isHeart = rand < layer.heartR
    const isStar  = !isHeart && rand < (layer.heartR + layer.starR)
    const xPct  = 2 + Math.random() * 96
    const delay = layer.delayRange[0] + Math.random() * (layer.delayRange[1] - layer.delayRange[0])
    const dur   = layer.durRange[0]   + Math.random() * (layer.durRange[1]   - layer.durRange[0])
    const swing = ((Math.random() - 0.5) * layer.swingAmp).toFixed(1) + 'px'
    const rot   = (Math.random() * 360).toFixed(1) + 'deg'
    const driftY = ((-30 - Math.random() * 80)).toFixed(1) + 'px'
    const isLoop = layer.anim === 'rp-fall-near' && Math.random() < 0.4

    let el: HTMLElement | SVGSVGElement
    if (isHeart) {
      const pxSize = 2 + Math.floor(Math.random() * 2)
      const color  = heartColors[Math.floor(Math.random() * heartColors.length)]
      el = makePixelHeart(pxSize, color)
      ;(el as HTMLElement).style.cssText += `
        position:absolute;left:${xPct}%;top:-40px;opacity:0;
        --rp-swing:${swing};--rp-rot:${rot};
        animation:${isLoop?'rp-loop-near':layer.anim} ${dur.toFixed(1)}s ${delay.toFixed(2)}s ease-in ${isLoop?'infinite':'forwards'};
        pointer-events:none;user-select:none;image-rendering:pixelated;filter:opacity(${layer.alpha});
      `
    } else if (isStar) {
      const size  = layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0])
      const color = starColors[Math.floor(Math.random() * starColors.length)]
      el = makeStarSVG(size, color)
      el.style.cssText = `
        position:absolute;left:${xPct}%;top:${20 + Math.random() * 80}%;opacity:0;
        --rp-swing:${swing};--rp-rot:${rot};--rp-alpha:${layer.alpha};--rp-drift-y:${driftY};
        animation:${layer.anim} ${dur.toFixed(1)}s ${delay.toFixed(2)}s ease-in-out ${layer.anim==='rp-drift-star'?'infinite':'forwards'};
        pointer-events:none;user-select:none;will-change:transform,opacity;
        filter:drop-shadow(0 0 ${Math.random()*3+1}px ${color});
      `
    } else {
      const size  = layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0])
      const color = sakuraColors[Math.floor(Math.random() * sakuraColors.length)]
      el = makeSakuraSVG(size, color, layer.alpha)
      el.style.cssText = `
        position:absolute;left:${xPct}%;top:-${size+10}px;opacity:0;
        --rp-swing:${swing};--rp-rot:${rot};
        animation:${isLoop?'rp-loop-near':layer.anim} ${dur.toFixed(1)}s ${delay.toFixed(2)}s ease-in ${isLoop?'infinite':'forwards'};
        pointer-events:none;user-select:none;will-change:transform,opacity;
      `
    }
    container.appendChild(el)
  }

  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) spawnOne(layer)
  }

  // 每 5s 补充一批新粒子（首轮有延迟的粒子落完后继续循环感）
  particleLoopTimer = setInterval(() => {
    if (!particlesEl.value) { clearInterval(particleLoopTimer!); return }
    // 清除已落完的元素（超过最大计数防止 DOM 膨胀）
    const children = Array.from(container.children)
    if (children.length > 200) {
      children.slice(0, 40).forEach(c => c.remove())
    }
    const boostLayers = [
      { count:8,  sizeRange:[18,30], durRange:[3.2,4.6], delayRange:[0,0.8], heartR:0.2, starR:0.1, swingAmp:160, anim:'rp-fall-near', alpha:0.9 },
      { count:14, sizeRange:[12,22], durRange:[4.5,6.0], delayRange:[0,1.0], heartR:0.25, starR:0.12, swingAmp:130, anim:'rp-fall-mid', alpha:0.75 },
    ]
    for (const layer of boostLayers) {
      for (let i = 0; i < layer.count; i++) spawnOne(layer)
    }
  }, 5000)
}

function onBubbleClick() {
  if (isCurrentEasterEgg.value) {
    showRomanceOverlay.value = true
    nextTick(() => { spawnParticles() })
  } else {
    toggle()
  }
}

function closeRomanceOverlay() {
  showRomanceOverlay.value = false
  if (particleLoopTimer) { clearInterval(particleLoopTimer); particleLoopTimer = null }
}

// ════════════════════════════════════════════
//  彩蛋 2 — Canvas 粒子背景（数字流 + 星尘 + 能量线）
// ════════════════════════════════════════════
const reverieBgCanvasEl = ref<HTMLCanvasElement | null>(null)
let revCanvasAF: number | null = null

function startReverieCanvas() {
  const canvas = reverieBgCanvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight

  // 粒子：星尘
  interface Dust { x:number; y:number; r:number; vx:number; vy:number; alpha:number; hue:number }
  const dusts: Dust[] = Array.from({length:120}, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: 0.6 + Math.random() * 1.8,
    vx: (Math.random()-0.5)*0.4, vy: -0.15 - Math.random()*0.35,
    alpha: 0.15 + Math.random()*0.5,
    hue: 240 + Math.random()*80,
  }))

  // 数字雨列
  const COLS   = Math.floor(canvas.width / 18)
  const drops  = Array.from({length:COLS}, () => Math.random() * canvas.height / 14)
  const CHARS  = '01アイウエオ∑∆λ∞◈●▲'

  // 能量线节点
  interface Node { x:number; y:number; vx:number; vy:number }
  const nodes: Node[] = Array.from({length:40}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    vx:(Math.random()-0.5)*0.7, vy:(Math.random()-0.5)*0.7,
  }))

  let frame = 0

  function draw() {
    revCanvasAF = requestAnimationFrame(draw)
    frame++

    // 深色半透明蒙版（拖尾效果）
    ctx.fillStyle = 'rgba(10,10,20,0.18)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // ── 1. 数字雨
    ctx.font = '12px "JetBrains Mono", monospace'
    for (let i = 0; i < COLS; i++) {
      const char = CHARS[Math.floor(Math.random() * CHARS.length)]
      const y    = drops[i] * 14
      // 头部字符亮
      const headAlpha = 0.55 + Math.sin(frame * 0.04 + i) * 0.15
      ctx.fillStyle = `rgba(167,139,250,${headAlpha})`
      ctx.fillText(char, i * 18, y)
      // 尾部渐暗（只画最近2行）
      if (drops[i] > 1) {
        ctx.fillStyle = `rgba(100,80,180,0.18)`
        ctx.fillText(CHARS[Math.floor(Math.random()*CHARS.length)], i*18, y-14)
      }
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0
      drops[i] += 0.45
    }

    // ── 2. 星尘
    for (const d of dusts) {
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI*2)
      ctx.fillStyle = `hsla(${d.hue},80%,80%,${d.alpha})`
      ctx.fill()
      d.x += d.vx; d.y += d.vy
      if (d.y < -4) { d.y = canvas.height + 4; d.x = Math.random()*canvas.width }
      if (d.x < -4 || d.x > canvas.width+4) d.x = Math.random()*canvas.width
    }

    // ── 3. 能量连线
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      a.x += a.vx; a.y += a.vy
      if (a.x < 0 || a.x > canvas.width)  a.vx *= -1
      if (a.y < 0 || a.y > canvas.height) a.vy *= -1
      for (let j = i+1; j < nodes.length; j++) {
        const b   = nodes[j]
        const dx  = a.x - b.x, dy = a.y - b.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < 130) {
          const alpha = (1 - dist/130) * 0.12
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(140,110,240,${alpha})`
          ctx.lineWidth = 0.7
          ctx.stroke()
        }
      }
    }
  }

  draw()
}

function stopReverieCanvas() {
  if (revCanvasAF !== null) { cancelAnimationFrame(revCanvasAF); revCanvasAF = null }
  const canvas = reverieBgCanvasEl.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }
}

let bubbleTimer: ReturnType<typeof setTimeout> | null = null

function getBubbleDuration(): number {
  const lines = locale.value === 'en' ? BUBBLE_LINES_EN : BUBBLE_LINES_ZH
  return lines[bubbleIdx.value % lines.length].ms
}

// 递归调度：每句按自己的 ms 停留，再淡出切换下一句
function scheduleBubbleCycle() {
  bubbleTimer = setTimeout(() => {
    showBubble.value = false
    bubbleTimer = setTimeout(() => {
      bubbleIdx.value++
      showBubble.value = true
      scheduleBubbleCycle()
    }, 420) // 淡出动画时长
  }, getBubbleDuration())
}

onMounted(() => {
  // 首次延迟 2s 后出现第一句（彩蛋句）
  bubbleTimer = setTimeout(() => {
    showBubble.value = true
    scheduleBubbleCycle()
  }, 2000)

  // Esc 关闭彩蛋 overlay
  window.addEventListener('keydown', onKeydown)

  // PC 端：全屏鼠标追踪光锥（增强版）
  if (!isTouchDevice) {
    window.addEventListener('mousemove', onGlobalMouseMoveEnhanced, { passive: true })
  }

  // 彩蛋 2 Canvas 粒子：随 overlay 开关；手机端同步启停陀螺仪，PC端启停弹簧帧
  watch(showEasterEgg2, (val) => {
    if (val) {
      // 双 nextTick：确保 v-if DOM 插入并完成首次 flex layout 后再初始化引擎
      nextTick(() => nextTick(() => {
        startReverieCanvas()
        _initEngine2()
        if (isTouchDevice) startGyro()
        else startPcFrame()
      }))
    } else {
      stopReverieCanvas()
      _destroyEngine2()
      if (isTouchDevice) stopGyro()
      else stopPcFrame()
    }
  })

  // 彩蛋 1 overlay 开关时也启停
  watch(showRomanceOverlay, (val) => {
    if (val) {
      // 双 nextTick：确保 v-if DOM 插入并完成首次 flex layout 后再初始化引擎
      nextTick(() => nextTick(() => { _initEngine1() }))
      if (isTouchDevice) startGyro()
      else startPcFrame()
    } else {
      _destroyEngine1()
      if (isTouchDevice) stopGyro()
      else stopPcFrame()
    }
  })
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showRomanceOverlay.value) {
    closeRomanceOverlay()
  }
  if (e.key === 'Escape' && showEasterEgg2.value) {
    closeEasterEgg2()
  }
}


const isOpen         = ref(false)
const inputMessage   = ref('')
const isStreaming    = ref(false)
const isLoading      = ref(false)
const error          = ref('')
const isOverQuota    = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Model Switcher 状态
const selectedModel     = ref<'free' | 'pro'>('free')
const showPayModal      = ref(false)
const pendingProAction  = () => { selectedModel.value = 'pro' }

// Vision Model 选择器选项
const visionModels = computed(() =>
  (Object.entries(MODEL_META) as [AiModel, typeof MODEL_META[AiModel]][]).map(([id, meta]) => ({
    id,
    label: meta.tag,
    short: meta.tag,
    color: meta.color,
  }))
)

// isAdmin 来自 useAdmin，已从 localStorage 恢复
// 如果已解锁则自动同步 model 状态
if (isAdmin.value) selectedModel.value = 'pro'

function onSelectPro() {
  if (isAdmin.value) {
    selectedModel.value = 'pro'
  } else {
    selectedModel.value = 'free'   // 强制弹回
    showPayModal.value  = true
  }
}

function onPaymentVerified() {
  // unlockAdmin 已在 SecurityPortal 内调用，这里只需关闭弹窗
  selectedModel.value = 'pro'
  showPayModal.value  = false
}

// 对话历史：每次发送 push { user: string, ai: string }
// ai 初始为 '' 以显示 loading dots，流结束后填充
interface Turn { user: string; ai: string }
const conversationTurns = ref<Turn[]>([])

// AbortController — 组件销毁时中止请求
let abortController: AbortController | null = null

// ════════════════════════════════════════════
//  Welcome 消息
// ════════════════════════════════════════════
const welcomeMessage = computed(() =>
  locale.value === 'en'
    ? 'Hey~ I\'m <b style="color:#FFD600;">Lyria</b>. Ask me anything about this portfolio — projects, skills, or just say hi 👀'
    : '呐，我是 <b style="color:#FFD600;">Lyria</b>。这个网站有什么想知道的，尽管问我吧……才不是只会说"你好"的那种助理哦'
)

// ════════════════════════════════════════════
//  开关
// ════════════════════════════════════════════
function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    showBubble.value = false
    nextTick(scrollToBottom)
  }
}

function close() {
  isOpen.value = false
}

// ════════════════════════════════════════════
//  发送消息
// ════════════════════════════════════════════
async function sendMessage() {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return
  if (isOverQuota.value) {
    error.value = locale.value === 'en' ? 'Please try again later' : '请稍后再试'
    return
  }

  // 重置错误状态
  error.value = ''

  // 新增一条 turn
  conversationTurns.value.push({ user: message, ai: '' })
  inputMessage.value = ''

  isLoading.value  = true
  isStreaming.value = true

  abortController = new AbortController()

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, turnCount: conversationTurns.value.length - 1 }),
      signal: abortController.signal,
    })

    // JSON 错误响应（rate limit、400 等，此时 SSE headers 未发送）
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}))
      if (data.isOverQuota) {
        isOverQuota.value = true
        isStreaming.value = false
        isLoading.value = false
        // 移除空 ai turn
        conversationTurns.value[conversationTurns.value.length - 1].ai = '—'
        return
      }
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    // ─── SSE 流读取 ───
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    const turnIdx = conversationTurns.value.length - 1

    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()

        if (raw === '[DONE]') break outer

        try {
          const parsed = JSON.parse(raw)

          // 后端通过 SSE 传来的错误事件（v6.0 新格式）
          if (parsed.error) {
            if (parsed.code === 'OVER_QUOTA') {
              isOverQuota.value = true
              conversationTurns.value[turnIdx].ai = '—'
            } else {
              error.value = parsed.error
              conversationTurns.value[turnIdx].ai = '—'
            }
            break outer
          }

          // 正常文本流
          if (parsed.text) {
            conversationTurns.value[turnIdx].ai += parsed.text
            await nextTick()
            scrollToBottom()
          }
        } catch {
          // 忽略 JSON 解析异常
        }
      }
    }

    isStreaming.value = false
    isLoading.value   = false

  } catch (err: any) {
    if (err.name === 'AbortError') return // 组件销毁主动中止，不报错

    console.error('[Chat] Error:', err)
    error.value = err.message || (locale.value === 'en' ? 'Failed to send message' : '发送消息失败')
    // 标记最后一条 turn 失败
    if (conversationTurns.value.length > 0) {
      conversationTurns.value[conversationTurns.value.length - 1].ai = '—'
    }
    isStreaming.value = false
    isLoading.value   = false
  } finally {
    abortController = null
  }
}

// ════════════════════════════════════════════
//  滚动到底部
// ════════════════════════════════════════════
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// ════════════════════════════════════════════
//  组件销毁 — 清理流式监听
// ════════════════════════════════════════════
onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  if (bubbleTimer) clearTimeout(bubbleTimer)
  if (particleLoopTimer) { clearInterval(particleLoopTimer); particleLoopTimer = null }
  stopReverieCanvas()
  stopGyro()
  stopPcFrame()
  _destroyEngine1()
  _destroyEngine2()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousemove', onGlobalMouseMoveEnhanced)
})
</script>

<style scoped>
/* ── 气泡主体 */
.bubble-speech {
  max-width: 240px;
  min-width: 140px;
  background: #FFFDE7;
  border: 2px solid #1A1A1A;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  padding: 0 0 10px;
  /* 2px 圆角让整体不那么生硬 */
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 说话人标签条 */
.bubble-speaker {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 5px;
  background: #FFD600;
  border-bottom: 2px solid #1A1A1A;
  border-radius: 0;
}
.bubble-speaker-dot {
  width: 5px;
  height: 5px;
  background: #1A1A1A;
  border-radius: 50%;
  flex-shrink: 0;
  /* 呼吸动效 */
  animation: speaker-pulse 2s ease-in-out infinite;
}
@keyframes speaker-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}
.bubble-speaker-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #1A1A1A;
  text-transform: uppercase;
}

/* 正文 */
.bubble-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.65;
  color: #1A1A1A;
  margin: 0;
  padding: 9px 12px 0;
}

/* 气泡尾巴 — 指向右下角头像 */
.bubble-tail-outer,
.bubble-tail-inner {
  position: absolute;
  display: block;
  width: 0;
  height: 0;
  border-style: solid;
}
.bubble-tail-outer {
  bottom: -10px;
  right: 20px;
  border-width: 10px 8px 0 8px;
  border-color: #1A1A1A transparent transparent transparent;
}
.bubble-tail-inner {
  bottom: -7px;
  right: 22px;
  border-width: 8px 6px 0 6px;
  border-color: #FFFDE7 transparent transparent transparent;
}

/* 气泡弹出动效 */
.bubble-pop-enter-active {
  transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
  transform-origin: bottom right;
}
.bubble-pop-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
  transform-origin: bottom right;
}
.bubble-pop-enter-from {
  opacity: 0;
  transform: scale(0.75) translateY(6px);
}
.bubble-pop-leave-to {
  opacity: 0;
  transform: scale(0.88) translateY(4px);
}

/* 滑入动效 */
.slide-up-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 1.2, 0.64, 1);
}
.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
}

/* ══════════════════════════════════════════
   Chat Window
══════════════════════════════════════════ */
.chat-window {
  width: 380px;
  max-height: 560px;
  background: #111111;
  border: 2px solid #2a2a2a;
  box-shadow:
    4px 4px 0 0 #FFD600,
    0 20px 60px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,214,0,0.06);
}
@media (min-width: 640px) {
  .chat-window { width: 420px; }
}

/* 手机端：全宽 + 拉高，贴屏幕底部展开 */
@media (max-width: 639px) {
  .chat-window {
    width: calc(100vw - 16px);
    max-height: calc(100svh - 100px);
    border-radius: 0;
    box-shadow: 4px 4px 0 0 #FFD600, 0 -4px 30px rgba(0,0,0,0.4);
  }
}

/* ── Header */
.chat-header {
  flex-shrink: 0;
  border-bottom: 2px solid #FFD60030;
  background: #151515;
  padding: 10px 12px 10px;
}
.chat-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
}
.chat-header-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 900;
  color: #FFD600;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
}
.chat-header-status-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #22C55E;
  text-transform: uppercase;
}
.chat-header-status-sep {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  color: #22C55E;
  opacity: 0.35;
}

/* 头像 — 方角 Brutalist 风格 */
.chat-avatar-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 0;
  border: 2px solid #FFD600;
  overflow: visible;
  box-shadow: 3px 3px 0 0 #FFD60050;
}
.chat-avatar-wrap > img {
  border-radius: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.chat-avatar-online-dot {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  background: #22C55E;
  border: 2px solid #151515;
  border-radius: 0;
  animation: online-pulse 2.5s ease-in-out infinite;
}
@keyframes online-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  50%       { box-shadow: 0 0 0 3px rgba(34,197,94,0); }
}

/* Model Switcher */
.chat-model-switcher {
  display: flex;
  align-items: stretch;
  border: 2px solid #FFD60050;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 2px 2px 0 0 #FFD60025;
}
.chat-model-tab {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 5px 8px;
  background: transparent;
  color: #FFD60050;
  border: none;
  cursor: pointer;
  transition: all 0.1s;
  white-space: nowrap;
}
.chat-model-tab:hover {
  color: #FFD600;
  background: #FFD60010;
}
.chat-model-tab--active {
  background: #FFD600;
  color: #111111 !important;
}
.chat-model-divider {
  width: 2px;
  background: #FFD60050;
  flex-shrink: 0;
}

/* 关闭按钮 */
.chat-close-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 900;
  color: #FFD60055;
  background: transparent;
  border: 2px solid #FFD60030;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.1s;
  line-height: 1;
  flex-shrink: 0;
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-close-btn:hover {
  color: #111111;
  background: #FFD600;
  border-color: #FFD600;
  box-shadow: 2px 2px 0 0 #FFD60060;
}

/* ── Messages Area */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  background:
    radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,214,0,0.025) 0%, transparent 60%),
    #0d0d0d;
}

/* 消息行 */
.chat-msg-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}
.chat-msg-row--user {
  flex-direction: row-reverse;
}

/* 消息头像 */
.chat-msg-avatar {
  width: 26px;
  height: 26px;
  border-radius: 0;
  flex-shrink: 0;
  overflow: hidden;
  border: 1.5px solid #FFD60060;
  background: #1a1a1a;
  box-shadow: 2px 2px 0 0 #FFD60025;
}
.chat-msg-avatar--user {
  border-radius: 0 !important;
  background: #FFD600 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  color: #111111 !important;
  border: 1.5px solid #FFD600 !important;
  box-shadow: 2px 2px 0 0 #FFD60050 !important;
  overflow: visible !important;
}

/* 消息气泡 */
.chat-bubble {
  flex: 1;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.7;
  min-width: 0;
  word-break: break-word;
  border-radius: 0;
}
.chat-bubble--ai {
  background: #1c1c1c;
  border: 1.5px solid #2e2e2e;
  color: #d4d4d4;
  border-radius: 0 0 0 0;
  box-shadow: 3px 3px 0 0 #FFD60015;
}
.chat-bubble--user {
  background: #1a1f2e;
  border: 1.5px solid #2a3a6a70;
  color: #bdd0f8;
  text-align: right;
  border-radius: 0;
  box-shadow: 3px 3px 0 0 rgba(41,121,255,0.15);
}
.chat-bubble--loading {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 10px 14px;
}
.chat-bubble--warn {
  background: #191200;
  border: 1.5px solid #FFD60055;
  color: #FFD600;
  font-size: 11px;
  border-radius: 0;
  box-shadow: 3px 3px 0 0 #FFD60020;
}
.chat-bubble--error {
  background: #160808;
  border: 1.5px solid #FF444455;
  color: #ff7070;
  font-size: 11px;
  border-radius: 0;
  box-shadow: 3px 3px 0 0 rgba(255,68,68,0.15);
}

/* 打字光标 */
.chat-cursor {
  color: #FFD600;
  animation: blink 0.8s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* Loading dots */
.chat-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #FFD600;
  animation: chat-bounce 1.2s ease-in-out infinite;
}
@keyframes chat-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
  40%            { transform: translateY(-6px); opacity: 1; }
}

/* ── Input Area */
.chat-input-area {
  flex-shrink: 0;
  padding: 10px 12px 12px;
  border-top: 2px solid #FFD60025;
  background: #111111;
}
.chat-input-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #FFD60040;
  text-transform: uppercase;
}
.chat-input-hint-dot {
  width: 4px;
  height: 4px;
  border-radius: 0;
  background: #FFD60055;
  flex-shrink: 0;
  animation: speaker-pulse 2s ease-in-out infinite;
}
.chat-input-form {
  display: flex;
  gap: 0;
}
.chat-input-field {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  background: #1c1c1c;
  color: #e5e5e5;
  border: 2px solid #2e2e2e;
  border-right: none;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  border-radius: 0;
}
.chat-input-field::placeholder {
  color: #FFD60030;
}
.chat-input-field:focus {
  border-color: #FFD60070;
  background: #1f1f1f;
  box-shadow: inset 0 0 0 1px #FFD60010;
}
.chat-input-field:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.chat-send-btn {
  flex-shrink: 0;
  padding: 10px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #FFD600;
  color: #111111;
  border: 2px solid #FFD600;
  box-shadow: 3px 3px 0 0 #FFD60040;
  cursor: pointer;
  transition: all 0.1s;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 66px;
  min-height: 40px;
}
.chat-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}
.chat-send-btn:not(:disabled):hover {
  box-shadow: 5px 5px 0 0 #FFD60060;
  transform: translate(-1px,-1px);
}
.chat-send-btn:not(:disabled):active {
  transform: translate(2px,2px);
  box-shadow: 1px 1px 0 0 #FFD60040;
}
.chat-send-loading {
  display: flex;
  align-items: center;
  gap: 3px;
}
.chat-send-loading > span {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #111111;
  animation: chat-bounce 1.2s ease-in-out infinite;
}
.chat-send-loading > span:nth-child(2) { animation-delay: 0.15s; }
.chat-send-loading > span:nth-child(3) { animation-delay: 0.30s; }

/* 自定义深色滚动条 */
.chat-scroll::-webkit-scrollbar {
  width: 2px;
}
.chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.chat-scroll::-webkit-scrollbar-thumb {
  background: #FFD60045;
  border-radius: 0;
}
.chat-scroll::-webkit-scrollbar-thumb:hover {
  background: #FFD600;
}

/* ── 手机端优化 */
@media (max-width: 639px) {
  .chat-header {
    padding: 8px 10px;
  }
  /* 手机端隐藏副标题（节省空间） */
  .chat-header-status-sep,
  .chat-header-status-sub {
    display: none;
  }
  .chat-avatar-wrap {
    width: 30px;
    height: 30px;
  }
  .chat-messages {
    padding: 10px;
    gap: 8px;
  }
  .chat-bubble {
    font-size: 12px;
    padding: 8px 10px;
  }
  .chat-input-area {
    padding: 8px 10px 10px;
  }
  /* 手机端输入框更高，更易触控 */
  .chat-input-field {
    padding: 12px 10px;
    font-size: 14px; /* 防止 iOS 自动缩放 */
  }
  .chat-send-btn {
    padding: 12px 14px;
    font-size: 10px;
    min-width: 56px;
    min-height: 44px; /* 触控最小目标 */
  }
  .chat-model-tab {
    padding: 4px 6px;
    font-size: 7.5px;
  }
}

/* Vision model bar */
.chat-vision-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  gap: 8px;
  flex-shrink: 0;
  border-bottom: 2px solid #FFD60025;
  background: #111111;
}

/* Vision model select */
.chat-model-select {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 20px 3px 6px;
  border: 2px solid #FFD60040;
  background: #111111;
  color: #FFD600;
  cursor: pointer;
  outline: none;
  text-transform: uppercase;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='8' height='6' viewBox='0 0 8 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23FFD600' stroke-width='2' stroke-linecap='square'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
}
.chat-model-select option {
  color: #FFD600;
  background: #111111;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 4px;
}
.chat-model-select:focus {
  border-color: #FFD600;
}

/* ── 彩蛋 overlay ─────────────────────────────────────────────── */

/* 遮罩层 — 柔粉渐变背景 */
.romance-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(145deg, #fce4ec 0%, #f8bbd9 35%, #e8d5f5 70%, #ddeeff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
}

/* 粒子容器 */
.romance-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

/* ── 明信片卡片（标准横向比例 148×100 mm） */
.romance-card {
  position: relative;
  z-index: 2;
  width: min(680px, calc(100vw - 48px));
  /* 玻璃态：半透明白 + 磨砂模糊 */
  background: rgba(255, 253, 248, 0.72);
  backdrop-filter: blur(18px) saturate(1.6) brightness(1.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.6) brightness(1.08);
  border: 1.5px solid rgba(220, 180, 210, 0.65);
  box-shadow:
    5px 5px 0 0 #b888aa,
    0 0 0 4px rgba(255, 253, 248, 0.55),
    0 0 0 6px rgba(200, 160, 190, 0.40),
    0 12px 40px rgba(200, 100, 160, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.80),
    inset 0 -1px 0 rgba(200, 160, 190, 0.25);
  padding: 24px 28px 18px;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 3D tilt 基础 */
  transform-style: preserve-3d;
  transition: transform 0.06s ease-out, box-shadow 0.1s ease-out;
  will-change: transform;
  /* 光学 CSS 变量默认值 */
  --shine-x:    50%;
  --shine-y:    50%;
  --spec-x:     50%;
  --spec-y:     50%;
  --spec2-x:    50%;
  --spec2-y:    50%;
  --glow2-x:    50%;
  --glow2-y:    50%;
  --fresnel:    0;
  --foil-hue:   0deg;
  --shine-opacity: 0;
  --incidence:  1;
  --disp-x:     0px;
  --disp-y:     0px;
  --caustic:    0;
}

/* ── 层 1：主漫反射（宽、柔软的粉色光晕 · 随入射角增亮） */
.romance-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 8;
  background:
    /* 主漫反射（缩小椭圆：90%→65% / 75%→52%，收紧光晕） */
    radial-gradient(
      ellipse 65% 52% at var(--shine-x) var(--shine-y),
      rgba(255,200,220,calc(0.34 * var(--incidence))) 0%,
      rgba(255,160,200,calc(0.14 * var(--incidence))) 38%,
      transparent 68%
    ),
    /* 次级散射瓣（缩小） */
    radial-gradient(
      ellipse 42% 34% at var(--spec2-x) var(--spec2-y),
      rgba(255,220,240,0.09) 0%,
      transparent 55%
    ),
    /* 次级柔光晕（缩小） */
    radial-gradient(
      ellipse 52% 44% at var(--glow2-x, 50%) var(--glow2-y, 50%),
      rgba(255,230,240,calc(0.06 * var(--incidence))) 0%,
      transparent 62%
    );
  opacity: var(--shine-opacity);
  transition: opacity 0.08s ease;
  mix-blend-mode: screen;
}

/* ── 层 2：镜面高光 + 全息箔彩虹 + 棱镜色散条纹 */
.romance-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 9;
  background:
    /* 主镜面高光（缩小：38px→22px，更锐利精准） */
    radial-gradient(
      circle 22px at var(--spec-x) var(--spec-y),
      rgba(255,255,255,calc(0.88 * var(--incidence))) 0%,
      rgba(255,230,245,calc(0.36 * var(--incidence))) 22%,
      transparent 50%
    ),
    /* 副高光瓣（缩小：85px→50px） */
    radial-gradient(
      circle 50px at var(--spec-x) var(--spec-y),
      rgba(255,200,230,0.14) 0%,
      transparent 52%
    ),
    /* 全息箔彩虹层（saturate + hue 随倾角旋转，饱和度更高） */
    linear-gradient(
      calc(var(--foil-hue) + 45deg),
      rgba(255,100,180,0.11) 0%,
      rgba(255,220,80,0.12) 16%,
      rgba(80,230,200,0.11) 33%,
      rgba(80,150,255,0.12) 50%,
      rgba(200,80,255,0.11) 67%,
      rgba(255,120,140,0.10) 84%,
      transparent 100%
    ),
    /* 棱镜色散条纹（窄带，折射感，随 caustic 增强） */
    repeating-linear-gradient(
      calc(var(--foil-hue) + 90deg),
      transparent 0px,
      rgba(255,80,180,calc(var(--caustic) * 0.08)) 1px,
      transparent 3px,
      rgba(80,200,255,calc(var(--caustic) * 0.07)) 4px,
      transparent 6px,
      rgba(160,255,100,calc(var(--caustic) * 0.05)) 7px,
      transparent 9px
    );
  opacity: var(--shine-opacity);
  transition: opacity 0.08s ease;
  mix-blend-mode: screen;
}

/* WebGL 物理光学层 — 覆盖整张卡片，叠加在图层之上但低于菲涅尔高光层 */
.card-shader-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  border-radius: inherit;
  mix-blend-mode: screen;
  opacity: 0.92;
}

/* 菲涅尔边缘光（卡片边框内侧发光） — 四边分层模拟卡片厚度折射 */
.romance-card-fresnel {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  border-radius: inherit;
  /* 主菲涅尔 inset glow（增强强度） */
  box-shadow:
    inset 0 0 calc(var(--fresnel) * 50px + 2px) rgba(255,180,210,calc(var(--fresnel) * 0.60)),
    /* 顶边高光（光从上方斜入时加强） */
    inset 0 2px calc(var(--fresnel) * 24px) rgba(255,255,255,calc(var(--fresnel) * 0.50)),
    /* 底边暗面（对应方向阴影） */
    inset 0 -2px calc(var(--fresnel) * 14px) rgba(180,100,140,calc(var(--fresnel) * 0.25)),
    /* 新增：外发光（卡片背面辉光溢出，增加悬浮感） */
    0 0 calc(var(--fresnel) * 20px + 4px) rgba(255,160,200,calc(var(--fresnel) * 0.18));
  transition: box-shadow 0.06s ease;
}

/* 棱镜色散覆盖层（RGB 通道错位 — 高光边缘彩边效果） */
.romance-card-fresnel::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  /* R 通道（向右偏移） */
  box-shadow:
    inset calc(var(--disp-x) * 0.5) calc(var(--disp-y) * 0.5)
      calc(var(--fresnel) * 18px) rgba(255,60,80,calc(var(--fresnel) * 0.15)),
    /* B 通道（向左偏移） */
    inset calc(var(--disp-x) * -0.5) calc(var(--disp-y) * -0.5)
      calc(var(--fresnel) * 18px) rgba(60,120,255,calc(var(--fresnel) * 0.15));
  transition: box-shadow 0.08s ease;
}

/* 悬停时加深阴影增强 3D 感 */
.romance-card:hover {
  box-shadow:
    10px 10px 0 0 #b888aa,
    0 0 0 5px #fffdf8,
    0 0 0 7px #c8a0be,
    0 28px 56px rgba(180,100,140,0.28),
    0 8px 16px rgba(200,120,160,0.18);
}

/* 顶栏：POST CARD 标识 */
.romance-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #d4a8c7;
}
.romance-card-type {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.35em;
  color: #b0607a;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0.7;
}
.romance-card-header-line {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(
    to right,
    #d4a8c7 0px, #d4a8c7 5px,
    transparent 5px, transparent 10px
  );
}

/* ── 主体左右分栏 */
.romance-card-layout {
  display: flex;
  gap: 0;
  min-height: 200px;
}

/* 左列：书信正文 */
.romance-left {
  flex: 1.1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 22px;
}

/* 分隔竖线 */
.romance-vert-divider {
  width: 1px;
  background: repeating-linear-gradient(
    to bottom,
    #d4a8c7 0px, #d4a8c7 5px,
    transparent 5px, transparent 10px
  );
  margin: 0 4px;
  flex-shrink: 0;
}

/* 右列：图片 + 邮政装饰 */
.romance-right {
  flex: 0 0 160px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 20px;
  align-items: flex-start;
}
@media (max-width: 540px) {
  .romance-right { flex: 0 0 110px; padding-left: 12px; }
}

/* ── 图片框 */
.romance-illust-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  border: 2px solid #d4a8c7;
  overflow: hidden;
  background: #fff0f5;
  flex-shrink: 0;
}
.romance-illust-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  filter: saturate(1.08) brightness(1.02);
  transition: filter 0.35s ease, transform 0.07s ease-out;
  will-change: transform;
}
.romance-illust-frame:hover .romance-illust-img {
  filter: saturate(1.2) brightness(1.06);
}
/* 粉色扫描线（比彩蛋2更浅淡，与粉色底色融合） */
.romance-illust-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 3px,
    rgba(180,80,120,0.05) 3px,
    rgba(180,80,120,0.05) 4px
  );
}
/* 图片角标 */
.romance-illust-label {
  position: absolute;
  bottom: 4px;
  right: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 6.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #c05070;
  opacity: 0.5;
  text-transform: uppercase;
  pointer-events: none;
}

/* ── 图片下方邮政装饰行 */
.romance-postal-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* 收件人 */
.romance-to {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #b0607a;
  opacity: 0.55;
  text-transform: uppercase;
  margin: 0;
}

/* 主句 */
.romance-headline {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(15px, 2.8vw, 20px);
  font-weight: 900;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: #1A1A1A;
  margin: 0;
  white-space: pre-line;
}

/* 副文 */
.romance-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.9;
  color: #4a3040;
  opacity: 0.52;
  margin: 0;
  white-space: pre-line;
}

/* 落款 */
.romance-sign {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #b0607a;
  opacity: 0.75;
  margin: auto 0 0;
  letter-spacing: 0.06em;
}

/* ── 右列：条形码 */
.romance-barcode {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 18px;
  margin-top: 2px;
}
.romance-barcode-bar {
  display: block;
  height: 100%;
  background: #8b4567;
  opacity: 0.35;
}
.romance-barcode-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 6px;
  color: #8b4567;
  opacity: 0.3;
  margin: 0;
  letter-spacing: 0.05em;
}

/* ── 迷你邮票 */
.romance-stamp-mini {
  border: 1.5px solid #c8a0be;
  padding: 4px 5px 3px;
  background: #fff5f8;
  clip-path: polygon(
    0% 4%, 4% 0%, 8% 4%, 12% 0%, 16% 4%, 20% 0%, 24% 4%, 28% 0%, 32% 4%,
    36% 0%, 40% 4%, 44% 0%, 48% 4%, 52% 0%, 56% 4%, 60% 0%, 64% 4%,
    68% 0%, 72% 4%, 76% 0%, 80% 4%, 84% 0%, 88% 4%, 92% 0%, 96% 4%, 100% 0%,
    100% 96%, 96% 100%, 92% 96%, 88% 100%, 84% 96%, 80% 100%, 76% 96%,
    72% 100%, 68% 96%, 64% 100%, 60% 96%, 56% 100%, 52% 96%, 48% 100%,
    44% 96%, 40% 100%, 36% 96%, 32% 100%, 28% 96%, 24% 100%, 20% 96%,
    16% 100%, 12% 96%, 8% 100%, 4% 96%, 0% 100%
  );
}
.romance-stamp-heart-mini {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.romance-stamp-row-mini {
  display: flex;
}
.romance-stamp-cell-mini {
  width: 2px;
  height: 2px;
}

/* ── 迷你邮戳 */
.romance-postmark-mini {
  opacity: 0.15;
  transform: rotate(-12deg);
  margin-left: auto;
}
.romance-postmark-ring-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 2px solid #8b4567;
  border-radius: 50%;
}
.romance-postmark-text-mini {
  font-family: 'JetBrains Mono', monospace;
  font-size: 4px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #8b4567;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.4;
}

/* 关闭提示 */
.romance-close {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #b0607a;
  opacity: 0.28;
  transition: opacity 0.15s;
  text-transform: uppercase;
  align-self: flex-end;
}
.romance-close:hover {
  opacity: 0.55;
}

/* ── overlay 进出动画 */
.romance-overlay-enter-active {
  transition: opacity 0.4s ease;
}
.romance-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.romance-overlay-enter-from,
.romance-overlay-leave-to {
  opacity: 0;
}
.romance-overlay-enter-active .romance-card {
  transition: transform 0.55s cubic-bezier(0.22, 1.2, 0.64, 1), opacity 0.45s ease;
}
.romance-overlay-leave-active .romance-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.romance-overlay-enter-from .romance-card {
  transform: perspective(900px) rotateX(18deg) translateY(36px) scale(0.92);
  opacity: 0;
}
.romance-overlay-leave-to .romance-card {
  transform: perspective(900px) rotateX(-8deg) translateY(12px) scale(0.97);
  opacity: 0;
}

/* ══════════════════════════════════════════════════════════════
   彩蛋 2 · 起源档案 Overlay
══════════════════════════════════════════════════════════════ */

/* 遮罩：深夜蓝紫，与彩蛋 1 的粉色差异化 */
.reverie-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(160deg, #0d0d1a 0%, #0f1520 40%, #12102a 75%, #1a0f1e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
}

/* 纯 CSS 噪点层 */
.reverie-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image:
    repeating-radial-gradient(circle at 1px 1px, #fff 0.5px, transparent 0),
    repeating-radial-gradient(circle at 3px 3px, #fff 0.5px, transparent 0);
  background-size: 4px 4px, 7px 7px;
}

/* 主卡片 */
.reverie-card {
  position: relative;
  z-index: 2;
  width: min(720px, calc(100vw - 48px));
  /* 玻璃态：深色半透明 + 冷蓝磨砂 */
  background: rgba(12, 14, 22, 0.68);
  backdrop-filter: blur(24px) saturate(1.8) brightness(0.95);
  -webkit-backdrop-filter: blur(24px) saturate(1.8) brightness(0.95);
  border: 1px solid rgba(100, 80, 200, 0.45);
  box-shadow:
    5px 5px 0 0 #a78bfa,
    0 0 40px 0 #7c3aed22,
    0 16px 48px rgba(80, 40, 160, 0.30),
    inset 0 1px 0 rgba(180, 160, 255, 0.18),
    inset 0 -1px 0 rgba(60, 40, 120, 0.30);
  padding: 22px 26px 16px;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 18px;
  /* 3D tilt */
  transform-style: preserve-3d;
  transition: transform 0.06s ease-out, box-shadow 0.1s ease-out;
  will-change: transform;
  --reverie-shine-x:    50%;
  --reverie-shine-y:    50%;
  --reverie-spec-x:     50%;
  --reverie-spec-y:     50%;
  --spec2-x:            50%;
  --spec2-y:            50%;
  --glow2-x:            50%;
  --glow2-y:            50%;
  --reverie-fresnel:    0;
  --reverie-foil-hue:   180deg;
  --reverie-shine-opacity: 0;
  --incidence:          1;
  --disp-x:             0px;
  --disp-y:             0px;
  --caustic:            0;
}

/* 层1：等离子漫反射（深紫/蓝宽散射 · 随入射角增亮） */
.reverie-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 8;
  background:
    /* 主漫反射：缩小等离子光晕（95%→70% / 80%→58%） */
    radial-gradient(
      ellipse 70% 58% at var(--reverie-shine-x) var(--reverie-shine-y),
      rgba(140,100,255,calc(0.32 * var(--incidence))) 0%,
      rgba(80,60,200,calc(0.15 * var(--incidence))) 36%,
      transparent 65%
    ),
    /* 次级散射瓣（缩小） */
    radial-gradient(
      ellipse 38% 30% at var(--spec2-x) var(--spec2-y),
      rgba(60,120,255,0.10) 0%,
      transparent 50%
    ),
    /* 次级柔光晕（缩小） */
    radial-gradient(
      ellipse 52% 44% at var(--glow2-x, 50%) var(--glow2-y, 50%),
      rgba(100,60,220,calc(0.05 * var(--incidence))) 0%,
      transparent 62%
    ),
    /* 底层能量光晕（缩小固定晕） */
    radial-gradient(
      ellipse 55% 45% at 50% 50%,
      rgba(100,60,200,0.05) 0%,
      transparent 78%
    );
  opacity: var(--reverie-shine-opacity);
  transition: opacity 0.08s ease;
  mix-blend-mode: screen;
}

/* 层2：镜面高光 + 全息彩虹箔 + 量子干涉条纹 + 深空焦散 */
.reverie-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 9;
  background:
    /* 主镜面高光（缩小：36px→20px，更锐利集中） */
    radial-gradient(
      circle 20px at var(--reverie-spec-x) var(--reverie-spec-y),
      rgba(230,210,255,calc(0.90 * var(--incidence))) 0%,
      rgba(170,150,255,calc(0.42 * var(--incidence))) 20%,
      transparent 50%
    ),
    /* 副高光（缩小：95px→58px） */
    radial-gradient(
      circle 58px at var(--reverie-spec-x) var(--reverie-spec-y),
      rgba(100,80,255,0.12) 0%,
      transparent 52%
    ),
    /* 全息彩虹箔（高饱和度，宇宙感，颜色更鲜艳） */
    linear-gradient(
      calc(var(--reverie-foil-hue) + 30deg),
      rgba(160,80,255,0.15) 0%,
      rgba(50,180,255,0.14) 15%,
      rgba(30,255,210,0.12) 30%,
      rgba(220,80,255,0.14) 45%,
      rgba(255,80,180,0.13) 60%,
      rgba(255,220,50,0.11) 75%,
      transparent 100%
    ),
    /* 量子干涉条纹（高频竖纹，随 caustic 增强） */
    repeating-linear-gradient(
      calc(var(--reverie-foil-hue) + 75deg),
      transparent 0px,
      rgba(180,120,255,calc(var(--caustic) * 0.10)) 1px,
      transparent 2.5px,
      rgba(80,180,255,calc(var(--caustic) * 0.09)) 3.5px,
      transparent 5px,
      rgba(60,240,200,calc(var(--caustic) * 0.07)) 6px,
      transparent 8px
    ),
    /* 深空焦散（角落边缘聚焦光斑，随 caustic 增强） */
    radial-gradient(
      ellipse 30% 20% at 5% 5%,
      rgba(120,80,255,calc(var(--caustic) * 0.25)) 0%,
      transparent 55%
    ),
    radial-gradient(
      ellipse 25% 18% at 95% 95%,
      rgba(60,160,255,calc(var(--caustic) * 0.22)) 0%,
      transparent 55%
    );
  opacity: var(--reverie-shine-opacity);
  transition: opacity 0.08s ease;
  mix-blend-mode: screen;
}

/* 菲涅尔边缘光 — 深紫等离子边缘 + 多层内发光 */
.reverie-card-fresnel {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  box-shadow:
    /* 主菲涅尔 inset 等离子光（增强） */
    inset 0 0 calc(var(--reverie-fresnel) * 52px + 3px) rgba(140,100,255,calc(var(--reverie-fresnel) * 0.62)),
    /* 顶边蓝白折射高光 */
    inset 0 2px calc(var(--reverie-fresnel) * 26px) rgba(180,160,255,calc(var(--reverie-fresnel) * 0.55)),
    /* 底边暗蓝环境光 */
    inset 0 -2px calc(var(--reverie-fresnel) * 16px) rgba(60,40,160,calc(var(--reverie-fresnel) * 0.35)),
    /* 外发光（卡片背面的辉光溢出，增加悬浮感） */
    0 0 calc(var(--reverie-fresnel) * 36px) rgba(120,80,255,calc(var(--reverie-fresnel) * 0.30));
  transition: box-shadow 0.06s ease;
}

/* 棱镜色散层（紫/青通道错位，边缘量子干涉彩边） */
.reverie-card-fresnel::before {
  content: '';
  position: absolute;
  inset: -1px;
  pointer-events: none;
  box-shadow:
    inset calc(var(--disp-x) * 0.6) calc(var(--disp-y) * 0.6)
      calc(var(--reverie-fresnel) * 20px) rgba(200,80,255,calc(var(--reverie-fresnel) * 0.18)),
    inset calc(var(--disp-x) * -0.6) calc(var(--disp-y) * -0.6)
      calc(var(--reverie-fresnel) * 20px) rgba(40,200,255,calc(var(--reverie-fresnel) * 0.18));
  transition: box-shadow 0.08s ease;
}

/* 悬停阴影增强 — 深空立体感 */
.reverie-card:hover {
  box-shadow:
    12px 12px 0 0 #a78bfa,
    0 0 60px 0 #7c3aed44,
    0 32px 64px rgba(100,60,200,0.30),
    0 8px 20px rgba(140,80,255,0.22),
    0 0 120px rgba(120,60,255,0.10);
}

/* Canvas 粒子背景 */
.reverie-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: 0.7;
}

/* 顶部标签行 */
.reverie-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid #2a2a4a;
}
.reverie-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px;
  font-weight: 900;
  letter-spacing: 0.38em;
  color: #a78bfa;
  text-transform: uppercase;
}
.reverie-tag-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: #4a4a7a;
  text-transform: uppercase;
}

/* 主体：左图右文 */
.reverie-body {
  display: flex;
  gap: 22px;
  align-items: flex-start;
}
@media (max-width: 520px) {
  .reverie-body { flex-direction: column; }
}

/* 图片列 */
.reverie-img-col {
  flex-shrink: 0;
  width: 160px;
}
@media (max-width: 520px) {
  .reverie-img-col { width: 100%; max-width: 220px; margin: 0 auto; }
}

.reverie-img-frame {
  position: relative;
  border: 2px solid #2a2a4a;
  overflow: hidden;
  /* 纵横比保持一致 */
  aspect-ratio: 3/4;
  background: #0a0a14;
}
.reverie-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
  filter: saturate(0.82) brightness(0.92);
  transition: filter 0.4s ease, transform 0.07s ease-out;
  will-change: transform;
}
.reverie-img-frame:hover .reverie-img {
  filter: saturate(1) brightness(1);
}

/* CRT 扫描线装饰 */
.reverie-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 3px,
    rgba(0,0,0,0.13) 3px,
    rgba(0,0,0,0.13) 4px
  );
}

/* 图片角标 */
.reverie-img-label {
  position: absolute;
  bottom: 4px;
  right: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #a78bfa;
  opacity: 0.6;
  text-transform: uppercase;
  pointer-events: none;
}

/* 文字列 */
.reverie-text-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* 日期戳 */
.reverie-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #4a4a7a;
  text-transform: uppercase;
  margin: 0;
}

/* 主标题 */
.reverie-headline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.55;
  color: #e8e0ff;
  margin: 0;
  white-space: pre-line;
  letter-spacing: 0.01em;
}

/* 正文区 */
.reverie-mono-text {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.reverie-mono-text p {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.75;
  color: #8888b8;
  margin: 0;
  white-space: pre-line;
}

/* 强调句 */
.reverie-accent {
  color: #c4b5fd !important;
  font-weight: 700 !important;
  font-style: italic;
  padding-left: 10px;
  border-left: 2px solid #7c3aed;
}

/* 落款 */
.reverie-sign {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #4a4a7a;
  margin: 4px 0 0;
  text-transform: uppercase;
}

/* 关闭提示 */
.reverie-close {
  align-self: flex-end;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #4a4a7a;
  opacity: 0.45;
  transition: opacity 0.15s;
  text-transform: uppercase;
}
.reverie-close:hover {
  opacity: 0.8;
}

/* 彩蛋 2 进出动效 */
.reverie-overlay-enter-active {
  transition: opacity 0.5s ease;
}
.reverie-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.reverie-overlay-enter-from,
.reverie-overlay-leave-to {
  opacity: 0;
}
.reverie-overlay-enter-active .reverie-card {
  transition: transform 0.55s cubic-bezier(0.22, 1.2, 0.64, 1), opacity 0.45s ease;
}
.reverie-overlay-leave-active .reverie-card {
  transition: transform 0.22s ease, opacity 0.2s ease;
}
.reverie-overlay-enter-from .reverie-card {
  transform: perspective(900px) rotateX(16deg) translateY(32px) scale(0.93);
  opacity: 0;
}
.reverie-overlay-leave-to .reverie-card {
  transform: perspective(900px) rotateX(-8deg) translateY(10px) scale(0.97);
  opacity: 0;
}
</style>
