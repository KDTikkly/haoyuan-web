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
        :aria-label="locale === 'en' ? 'A love story unlike any other' : '不同以往的浪漫故事'"
        @click.self="closeRomanceOverlay"
      >
        <!-- 粒子层（樱花 + 爱心） -->
        <div class="romance-particles" ref="particlesEl" aria-hidden="true"></div>

        <!-- 明信片主体 -->
        <div class="romance-card" @click.stop>

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
                {{ locale === 'en' ? 'To: You, who wandered here' : '致：偶然路过这里的你' }}
              </p>

              <h2 class="romance-headline">
                {{ locale === 'en'
                  ? 'Of course —\nthis must be a love story\nunlike any other.\nYou think so too, right? ♪'
                  : '当然，\n这一定是个不同以往的\n浪漫故事，\n你也是这么想的，对吧♪' }}
              </h2>

              <p class="romance-sub">
                {{ locale === 'en'
                  ? 'Every late-night debugging session,\nevery carefully nudged pixel —\nperhaps it was all quietly written,\nwaiting for someone like you\nto stumble upon this page\nand notice something small\nthat nobody else did.'
                  : '每一个深夜的调试，每一次细微的调整，\n每一行写下又删掉的代码——\n或许都是在悄悄等待，\n等一个像你一样的人，\n刚好路过这里，\n刚好多看了一眼，\n然后找到了这张明信片。' }}
              </p>

              <p class="romance-sign">
                {{ locale === 'en' ? '— Lyria  ✦  with warmth' : '— Lyria  ✦  带着温度' }}
              </p>

            </div>

            <!-- 分隔竖线 -->
            <div class="romance-vert-divider" aria-hidden="true"></div>

            <!-- 右列：邮政区域 -->
            <div class="romance-right">

              <!-- 收件人地址区 -->
              <div class="romance-address-block">
                <p class="romance-address-label">{{ locale === 'en' ? 'To' : '收件人' }}</p>
                <p class="romance-address-line">{{ locale === 'en' ? 'A curious wanderer' : '偶然路过的旅人' }}</p>
                <p class="romance-address-line">{{ locale === 'en' ? 'Somewhere on the internet' : '互联网的某个角落' }}</p>
                <p class="romance-address-line">{{ locale === 'en' ? 'haoyuan.work' : 'haoyuan.work' }}</p>
              </div>

              <!-- 邮政条码（装饰） -->
              <div class="romance-barcode" aria-hidden="true">
                <span v-for="w in [3,1,2,1,3,2,1,3,1,2,1,2,3,1]" :key="w"
                  :style="`width:${w}px;`" class="romance-barcode-bar"></span>
              </div>
              <p class="romance-barcode-num" aria-hidden="true">0422-HAOYUAN-WEB</p>

              <!-- 邮票 -->
              <div class="romance-stamp" aria-hidden="true">
                <div class="romance-stamp-heart">
                  <div v-for="(row, ri) in PIXEL_HEART_TEMPLATE" :key="ri" class="romance-stamp-row">
                    <div v-for="(cell, ci) in row" :key="ci"
                      :style="cell ? 'background:#c05070;' : 'background:transparent;'"
                      class="romance-stamp-cell">
                    </div>
                  </div>
                </div>
                <p class="romance-stamp-val">{{ locale === 'en' ? '♡ LOVE' : '爱心邮票' }}</p>
              </div>

              <!-- 邮戳 -->
              <div class="romance-postmark" aria-hidden="true">
                <span class="romance-postmark-ring">
                  <span class="romance-postmark-text">{{ locale === 'en' ? 'SEALED·WITH·LOVE' : '以·爱·寄·出' }}</span>
                </span>
              </div>

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

  <div v-if="!isDeepOverlayOpen" class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">

    <!-- ════════════════════════════════════════════
         Chat Container — 黑金 Brutalist 风格 (v6.0)
    ════════════════════════════════════════════ -->
    <transition name="slide-up" appear>
      <div
        v-if="isOpen"
        class="w-80 sm:w-96 flex flex-col"
        style="
          max-height: 500px;
          background: #1A1A1A;
          border: 3px solid #1A1A1A;
          box-shadow: 6px 6px 0 0 #FFD600;
        "
      >
        <!-- ─── Header ─── -->
        <div
          class="flex-shrink-0"
          style="border-bottom: 3px solid #FFD600;"
        >
          <!-- 顶行：关闭按钮（最右上角，最小化视觉权重） -->
          <div class="flex justify-end px-2 pt-1.5 pb-0">
            <button
              @click="close"
              class="font-mono font-bold text-[10px] leading-none px-1.5 py-1
                     transition-all duration-100"
              style="
                color: #FFD60099;
                background: transparent;
                border: 1.5px solid #FFD60044;
                letter-spacing: 0.08em;
              "
              @mouseenter="(e: any) => {
                e.currentTarget.style.color='#1A1A1A';
                e.currentTarget.style.background='#FFD600';
                e.currentTarget.style.borderColor='#FFD600';
              }"
              @mouseleave="(e: any) => {
                e.currentTarget.style.color='#FFD60099';
                e.currentTarget.style.background='transparent';
                e.currentTarget.style.borderColor='#FFD60044';
              }"
              @mousedown="(e: any) => { e.currentTarget.style.transform='translate(1px,1px)' }"
              @mouseup="(e: any) => { e.currentTarget.style.transform='' }"
              aria-label="Close chat"
            >✕</button>
          </div>

          <!-- 主行：头像 + 标题 + Model Switcher -->
          <div class="flex items-center justify-between px-4 pb-3 pt-1">
            <!-- 左侧：头像 + 标题 + ONLINE -->
            <div class="flex items-center gap-3">
              <!-- 圆形头像 -->
              <div
                class="w-9 h-9 flex-shrink-0 overflow-hidden rounded-full"
                style="border: 2px solid #FFD600;"
              >
                <img
                  :src="AVATAR_URL"
                  alt="Haoyuan"
                  class="w-full h-full object-cover"
                  @error="(e: any) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.innerHTML='<span style=\'font-size:18px;display:flex;align-items:center;justify-content:center;height:100%;\'>🤖</span>' }"
                />
              </div>
              <!-- 标题 + 状态 -->
              <div class="flex flex-col gap-0.5">
                <span class="font-display font-bold text-sm leading-none" style="color:#FFD600;">
                  Lyria · Assistant
                </span>
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full" style="background:#22C55E;"></span>
                  <span class="font-mono text-[9px] uppercase tracking-widest" style="color:#22C55E;">ONLINE</span>
                </div>
              </div>
            </div>

            <!-- 右侧：Model Switcher（视觉重心，悬浮感增强） -->
            <div
              class="flex items-center font-mono text-[9px] font-bold uppercase tracking-wider overflow-hidden flex-shrink-0"
              style="
                border: 2px solid #FFD600;
                box-shadow: 2px 2px 0 0 #FFD60060;
              "
            >
              <!-- v2.5 Free tab -->
              <button
                @click="selectedModel = 'free'"
                class="px-2.5 py-1.5 transition-all duration-100"
                :style="selectedModel === 'free'
                  ? 'background:#FFD600;color:#1A1A1A;'
                  : 'background:transparent;color:#FFD60088;'"
              >v2.5</button>
              <!-- divider -->
              <span style="width:1px;height:100%;background:#FFD600;opacity:0.4;"></span>
              <!-- Pro tab -->
              <button
                @click="onSelectPro"
                class="px-2.5 py-1.5 transition-all duration-100 flex items-center gap-0.5"
                :style="selectedModel === 'pro'
                  ? 'background:#FFD600;color:#1A1A1A;'
                  : 'background:transparent;color:#FFD60055;'"
              >
                <span>PRO</span>
                <span v-if="!isAdmin" style="font-size:8px;">🔒</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Vision Model Selector (PRO unlocked only) -->
        <div
          v-if="selectedModel === 'pro'"
          class="flex items-center justify-between px-4 py-2 gap-2 flex-shrink-0"
          style="border-bottom:2px solid #FFD60030; background:#1A1A1A;"
        >
          <span class="font-mono text-[7px] font-bold text-white/30 uppercase tracking-[0.2em] whitespace-nowrap">VISION</span>
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
          class="flex-1 overflow-y-auto p-3 space-y-3 chat-scroll"
          role="log"
          aria-live="polite"
          style="min-height: 0;"
        >
          <!-- Welcome Message -->
          <div class="flex gap-2 items-start">
            <div
              class="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
              style="border: 2px solid #FFD600;"
            >
              <img :src="AVATAR_URL" alt="AI" class="w-full h-full object-cover"
                @error="(e: any) => { e.currentTarget.style.display='none' }" />
            </div>
            <div
              class="flex-1 px-3 py-2 text-xs font-mono leading-relaxed"
              style="background:#2A2A2A; border: 2px solid #333; color: #E5E5E5;"
            >
              <span v-html="welcomeMessage"></span>
            </div>
          </div>

          <!-- 消息列表 (交替渲染 user / ai) -->
          <template v-for="(turn, idx) in conversationTurns" :key="idx">
            <!-- User Bubble -->
            <div class="flex gap-2 items-start flex-row-reverse">
              <div
                class="w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs"
                style="background: #FFD600; border: 2px solid #FFD600; color: #1A1A1A; border-radius: 2px;"
              >U</div>
              <div
                class="flex-1 px-3 py-2 text-xs font-mono leading-relaxed text-right"
                style="
                  background: #2979FF;
                  border: 2px solid #1A60CC;
                  box-shadow: 3px 3px 0 0 #1A1A1A;
                  color: #fff;
                "
              >{{ turn.user }}</div>
            </div>

            <!-- AI Bubble -->
            <div v-if="turn.ai !== undefined" class="flex gap-2 items-start">
              <div
                class="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
                style="border: 2px solid #FFD600;"
              >
                <img :src="AVATAR_URL" alt="AI" class="w-full h-full object-cover"
                  @error="(e: any) => { e.currentTarget.style.display='none' }" />
              </div>
              <div
                class="flex-1 px-3 py-2 text-xs font-mono leading-relaxed"
                style="background: #2A2A2A; border: 2px solid #333; color: #E5E5E5;"
              >
                <span v-if="idx === conversationTurns.length - 1 && isStreaming">
                  {{ turn.ai }}<span class="animate-pulse" style="color:#FFD600;">▋</span>
                </span>
                <span v-else>{{ turn.ai }}</span>
              </div>
            </div>

            <!-- AI Loading dots (最后一条 turn 且 ai 为空时) -->
            <div
              v-if="idx === conversationTurns.length - 1 && isLoading && turn.ai === ''"
              class="flex gap-2 items-start"
            >
              <div
                class="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
                style="border: 2px solid #FFD600;"
              >
                <img :src="AVATAR_URL" alt="AI" class="w-full h-full object-cover"
                  @error="(e: any) => { e.currentTarget.style.display='none' }" />
              </div>
              <div
                class="px-3 py-2 flex items-center gap-1"
                style="background: #2A2A2A; border: 2px solid #333;"
              >
                <span class="w-2 h-2 rounded-full animate-bounce" style="background:#FFD600; animation-delay:0ms;"></span>
                <span class="w-2 h-2 rounded-full animate-bounce" style="background:#FFD600; animation-delay:150ms;"></span>
                <span class="w-2 h-2 rounded-full animate-bounce" style="background:#FFD600; animation-delay:300ms;"></span>
              </div>
            </div>
          </template>

          <!-- Over Quota 警告 -->
          <div v-if="isOverQuota" class="flex gap-2 items-start">
            <span class="text-base flex-shrink-0">⚡</span>
            <div
              class="flex-1 px-3 py-2 text-xs font-mono leading-relaxed"
              style="
                background: #1A1A1A;
                border: 2px solid #FFD600;
                box-shadow: 3px 3px 0 0 #FFD600;
                color: #FFD600;
              "
            >
              <p class="font-bold mb-0.5">数据同步中...</p>
              <p style="color: #FFD60099;">当前大脑带宽已满，请稍后再试或通过邮件联系本人。</p>
            </div>
          </div>

          <!-- Error State — 红框 Brutalist -->
          <div v-if="error" class="flex gap-2 items-start">
            <span class="text-base flex-shrink-0">⚠️</span>
            <div
              class="flex-1 px-3 py-2 text-xs font-mono leading-relaxed"
              style="
                background: #1A0000;
                border: 2px solid #FF4444;
                box-shadow: 3px 3px 0 0 #FF4444;
                color: #FF4444;
              "
            >
              <p class="font-bold uppercase tracking-wide mb-0.5">
                {{ locale === 'en' ? 'ERROR' : '出错了' }}
              </p>
              <p style="color: #FF444499;">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- ─── Input Area ─── -->
        <!-- 16px 负空间（减少压迫感）+ 3px 黄线分隔 -->
        <div
          class="flex-shrink-0 px-3 pt-4 pb-3"
          style="border-top: 3px solid #FFD600; background: #1A1A1A;"
        >
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input
              v-model="inputMessage"
              type="text"
              :placeholder="locale === 'en' ? 'Ask Lyria anything...' : '问问 Lyria 吧……'"
              :disabled="isLoading"
              class="flex-1 min-w-0 px-3 py-2.5 text-sm font-mono
                     focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style="
                background: #fff;
                color: #1A1A1A;
                border: 3px solid #1A1A1A;
              "
              maxlength="200"
              aria-label="Type a message"
            />
            <!-- 明黄色 SEND 按钮（Primary Action 强化：3px 黑边 + 更大点击区域） -->
            <button
              type="submit"
              :disabled="isLoading || !inputMessage.trim()"
              class="px-5 py-2.5 font-display font-black text-sm uppercase tracking-wide
                     transition-all duration-100 flex-shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed"
              style="
                background: #FFD600;
                color: #1A1A1A;
                border: 3px solid #1A1A1A;
                box-shadow: 4px 4px 0 0 #1A1A1A;
                min-width: 64px;
              "
              @mouseenter="(e: any) => {
                if (!isLoading && inputMessage.trim()) {
                  e.currentTarget.style.boxShadow='6px 6px 0 0 #1A1A1A';
                  e.currentTarget.style.transform='translate(-1px,-1px)';
                }
              }"
              @mouseleave="(e: any) => {
                e.currentTarget.style.transform='';
                e.currentTarget.style.boxShadow='4px 4px 0 0 #1A1A1A';
              }"
              @mousedown="(e: any) => {
                if (!isLoading && inputMessage.trim()) {
                  e.currentTarget.style.transform='translate(2px,2px)';
                  e.currentTarget.style.boxShadow='2px 2px 0 0 #1A1A1A';
                }
              }"
              @mouseup="(e: any) => {
                e.currentTarget.style.transform='';
                e.currentTarget.style.boxShadow='4px 4px 0 0 #1A1A1A';
              }"
            >
              {{ isLoading ? '···' : 'SEND' }}
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
        class="relative max-w-[200px] font-mono text-[11px] leading-snug px-3 py-2 select-none cursor-pointer"
        style="
          background: #FFD600;
          color: #1A1A1A;
          border: 2.5px solid #1A1A1A;
          box-shadow: 3px 3px 0 0 #1A1A1A;
          font-weight: 700;
        "
        @click="onBubbleClick"
      >
        {{ bubbleText }}
        <!-- 气泡小尾巴 -->
        <span
          class="absolute -bottom-[9px] right-6"
          style="
            display:block;
            width:0;height:0;
            border-left:7px solid transparent;
            border-right:7px solid transparent;
            border-top:8px solid #1A1A1A;
          "
        ></span>
        <span
          class="absolute -bottom-[6px] right-[25px]"
          style="
            display:block;
            width:0;height:0;
            border-left:6px solid transparent;
            border-right:6px solid transparent;
            border-top:7px solid #FFD600;
          "
        ></span>
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
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import SecurityPortal from './SecurityPortal.vue'
import { useAdmin } from '@/composables/useAdmin'
import { useDeepOverlay } from '@/composables/useDeepOverlay'
import { selectedVisionModel, switchVisionModel, MODEL_META, type AiModel } from '@/api/aiService'

const { locale } = useI18n()
const { isAdmin, unlockAdmin } = useAdmin()
const { isDeepOverlayOpen } = useDeepOverlay()

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
  { text: "Of course — this must be a love story unlike any other. You think so too, right? ♪", ms: 22000, isEasterEgg: true },
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

// 粒子特效：全局注入 keyframes（绕过 scoped 限制）
const PARTICLE_STYLE_ID = 'rp-particle-style'
function ensureParticleStyle() {
  if (document.getElementById(PARTICLE_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = PARTICLE_STYLE_ID
  s.textContent = `
    @keyframes rp-fall {
      0%   { opacity: 0;   transform: translateY(0)     translateX(0)              rotate(0deg);   }
      8%   { opacity: 1; }
      85%  { opacity: 0.8; }
      100% { opacity: 0;   transform: translateY(110vh) translateX(var(--rp-swing)) rotate(360deg); }
    }
  `
  document.head.appendChild(s)
}

// 像素爱心：用 grid 方块拼成 ♥ 形（符合 Brutalist 像素风）
// 矩阵：1=粉色方块, 0=空（供 JS 粒子和模板邮票共用）
const PIXEL_HEART = [
  [0,1,1,0,0,1,1,0],
  [1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,0,0,0,0,0],
]
// 模板中直接用（Vue 模板不能引用普通 const，需暴露）
const PIXEL_HEART_TEMPLATE = PIXEL_HEART

function makePixelHeart(size: number, color: string): HTMLElement {
  const wrap = document.createElement('div')
  const px = size  // 每个像素格的尺寸
  wrap.style.cssText = `
    display: grid;
    grid-template-columns: repeat(8, ${px}px);
    grid-template-rows: repeat(7, ${px}px);
    gap: 0;
  `
  for (const row of PIXEL_HEART) {
    for (const cell of row) {
      const d = document.createElement('div')
      d.style.cssText = `width:${px}px;height:${px}px;background:${cell ? color : 'transparent'};`
      wrap.appendChild(d)
    }
  }
  return wrap
}

const SAKURA = ['🌸', '🌺', '✿', '❀']

function spawnParticles() {
  ensureParticleStyle()
  const container = particlesEl.value
  if (!container) return
  container.innerHTML = ''

  const total = 32
  const heartColors = ['#f06090', '#e8759a', '#d4608a', '#f090b0', '#c05070']

  for (let i = 0; i < total; i++) {
    const isHeart = Math.random() < 0.42
    const xPct  = 3 + Math.random() * 94
    const delay = Math.random() * 2.2
    const dur   = 3.8 + Math.random() * 3.5
    const swing = ((Math.random() - 0.5) * 140).toFixed(1) + 'px'

    if (isHeart) {
      // 像素爱心
      const pxSize = 2 + Math.floor(Math.random() * 2)  // 2~3px 每格
      const color = heartColors[Math.floor(Math.random() * heartColors.length)]
      const heart = makePixelHeart(pxSize, color)
      heart.style.cssText += `
        position: absolute;
        left: ${xPct}%;
        top: -40px;
        opacity: 0;
        --rp-swing: ${swing};
        animation: rp-fall ${dur}s ${delay}s ease-in forwards;
        pointer-events: none;
        user-select: none;
        image-rendering: pixelated;
      `
      container.appendChild(heart)
    } else {
      // 樱花 emoji
      const size = 14 + Math.random() * 16
      const span = document.createElement('span')
      span.textContent = SAKURA[Math.floor(Math.random() * SAKURA.length)]
      span.style.cssText = `
        position: absolute;
        left: ${xPct}%;
        top: -40px;
        font-size: ${size}px;
        opacity: 0;
        --rp-swing: ${swing};
        animation: rp-fall ${dur}s ${delay}s ease-in forwards;
        pointer-events: none;
        user-select: none;
        line-height: 1;
      `
      container.appendChild(span)
    }
  }
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
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showRomanceOverlay.value) {
    closeRomanceOverlay()
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
      body: JSON.stringify({ message }),
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
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* 气泡弹出动效 */
.bubble-pop-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bubble-pop-leave-active {
  transition: all 0.15s ease-in;
}
.bubble-pop-enter-from {
  opacity: 0;
  transform: scale(0.7) translateY(8px);
}
.bubble-pop-leave-to {
  opacity: 0;
  transform: scale(0.85) translateY(4px);
}

/* 滑入动效 */
.slide-up-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

/* 自定义深色滚动条 */
.chat-scroll::-webkit-scrollbar {
  width: 4px;
}
.chat-scroll::-webkit-scrollbar-track {
  background: #1A1A1A;
}
.chat-scroll::-webkit-scrollbar-thumb {
  background: #FFD600;
  border-radius: 0;
}
.chat-scroll::-webkit-scrollbar-thumb:hover {
  background: #FFC300;
}

.chat-model-select {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 18px 3px 6px;
  border: 2px solid #FFD60044;
  background: #1A1A1A;
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
  background: #1A1A1A;
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
  background: #fffdf8;
  border: 2.5px solid #c8a0be;
  box-shadow:
    5px 5px 0 0 #b888aa,
    0 0 0 5px #fffdf8,
    0 0 0 7px #c8a0be;
  padding: 24px 28px 18px;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

/* 右列：邮政区域 */
.romance-right {
  flex: 0.75;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 20px;
  align-items: flex-start;
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

/* ── 右列：收件人地址 */
.romance-address-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.romance-address-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7.5px;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #b0607a;
  text-transform: uppercase;
  opacity: 0.5;
  margin: 0;
}
.romance-address-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 600;
  color: #4a3040;
  opacity: 0.6;
  margin: 0;
  line-height: 1.5;
}

/* ── 右列：条形码 */
.romance-barcode {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 24px;
  margin-top: 4px;
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

/* ── 右列：像素爱心邮票 */
.romance-stamp {
  border: 2px solid #c8a0be;
  padding: 6px 8px 4px;
  background: #fff5f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  /* 锯齿边 */
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
.romance-stamp-heart {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.romance-stamp-row {
  display: flex;
}
.romance-stamp-cell {
  width: 3px;
  height: 3px;
}
.romance-stamp-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 6px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #b0607a;
  text-transform: uppercase;
  margin: 0;
  opacity: 0.7;
}

/* ── 右列：邮戳 */
.romance-postmark {
  margin-top: auto;
  opacity: 0.15;
  transform: rotate(-12deg);
}
.romance-postmark-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: 2.5px solid #8b4567;
  border-radius: 50%;
}
.romance-postmark-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 5.5px;
  font-weight: 800;
  letter-spacing: 0.18em;
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
  transition: transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.4s ease;
}
.romance-overlay-leave-active .romance-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.romance-overlay-enter-from .romance-card {
  transform: translateY(28px) scale(0.95);
  opacity: 0;
}
.romance-overlay-leave-to .romance-card {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}
</style>
