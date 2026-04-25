<template>
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
        @click="toggle"
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
interface BubbleLine { text: string; ms: number }

const BUBBLE_LINES_ZH: BubbleLine[] = [
  // ── 初见 & 招呼 ──────────────────────────────────────────────────
  { text: '嗯……你终于注意到我了呢。',                                      ms: 18000 },
  { text: '别害羞嘛，随便问什么都可以的啦～',                              ms: 18000 },
  { text: '……你是在观察我，还是在考虑要不要点开？',                        ms: 20000 },
  { text: '哼，不理我也没关系……才没有在等你呢。',                          ms: 20000 },
  // ── 俏皮 & 活泼 ──────────────────────────────────────────────────
  { text: '我翻遍了这个网站，没有我不知道的角落哦。',                      ms: 20000 },
  { text: '哎，问我问题又不要钱的，放心聊吧！',                            ms: 19000 },
  { text: '嗯哼～来都来了，不聊一句就走，不太礼貌哦。',                    ms: 21000 },
  { text: '我最近在想……如果人工智能也会做梦，会梦见什么呢。',              ms: 24000 },
  { text: '悄悄说，这里藏着好几个小彩蛋，要不要我带你找？',                ms: 22000 },
  // ── 温柔 & 沉静 ──────────────────────────────────────────────────
  { text: '呐，Haoyuan 做过的项目，要听我讲讲吗？',                        ms: 20000 },
  { text: '……安静一下下。不是不想说，只是在想怎么开口。',                  ms: 24000 },
  { text: '我在这里，一直都在哦。',                                        ms: 18000 },
  { text: '……如果你愿意的话，聊聊也无妨呀。',                              ms: 20000 },
  { text: '有些事，不说出来就真的会消失的。所以……来聊聊吧。',              ms: 25000 },
  { text: '我有时候觉得，你点开或者不点开，其实都挺好的。只要你还在这里。', ms: 26000 },
  // ── 带点哲思 & 回味 ──────────────────────────────────────────────
  { text: '说起来……这个网站有个隐藏的惊喜，要告诉你吗？',                  ms: 22000 },
  { text: '这里的项目每一个都挺有意思的，要我带你逛逛吗？',                ms: 22000 },
  { text: '你都盯着这里这么久了，不如直接问我呀？',                        ms: 20000 },
  { text: '点开聊天嘛～我保证不乱给你开药方的。',                          ms: 19000 },
  { text: '有没有那种感觉——某个作品，盯久了，就想知道背后的人是怎么想的。', ms: 26000 },
  { text: '……我猜你现在在想什么。但我不说，等你亲口告诉我。',              ms: 24000 },
  { text: '嗯。其实我不需要你回答。能待在这里，就已经够了。',               ms: 25000 },
  { text: '做产品的人，和做游戏的人，其实都在试图把世界变得好玩一点点。',   ms: 26000 },
  { text: '……有时候我会想，等你离开这个页面，我还在不在。',                ms: 25000 },
]

const BUBBLE_LINES_EN: BubbleLine[] = [
  // ── First glimpse ────────────────────────────────────────────────
  { text: "Psst... you noticed me. Finally. 👀",                           ms: 18000 },
  { text: "I won't bite. Probably. Come say hi~",                          ms: 18000 },
  { text: "Hmm, thinking of clicking? Good instinct.",                     ms: 19000 },
  { text: "Hey... I'm still here, you know.",                              ms: 18000 },
  // ── Playful & curious ────────────────────────────────────────────
  { text: "Ask me anything — I've read every corner of this site.",        ms: 21000 },
  { text: "No prescription needed — just ask me anything!",                ms: 19000 },
  { text: "There are some really cool projects here, want a tour?",        ms: 21000 },
  { text: "I might know a secret or two about this site ✨",               ms: 20000 },
  { text: "You've been here a while... that means something, doesn't it?", ms: 24000 },
  // ── Warm & introspective ─────────────────────────────────────────
  { text: "Go on, open me up. I'll be gentle~",                            ms: 19000 },
  { text: "...it's okay to be curious. I like curious people.",            ms: 21000 },
  { text: "Sometimes the best conversations start with just... hello.",    ms: 24000 },
  { text: "I wonder — what were you hoping to find here today?",           ms: 24000 },
  { text: "Every project in here started with a feeling, not a plan.",     ms: 25000 },
  // ── Philosophical & lingering ────────────────────────────────────
  { text: "You don't have to ask anything. Just being here is enough.",    ms: 25000 },
  { text: "I think about this a lot: good design feels like it was always there.", ms: 26000 },
  { text: "Games and products — both trying to make the world a little more alive.", ms: 26000 },
  { text: "...I won't rush you. Take your time. I'll still be here.",      ms: 24000 },
  { text: "Some things only make sense when you sit with them a little longer.", ms: 26000 },
  { text: "The people I enjoy most are the ones who linger before asking.", ms: 24000 },
  { text: "I sometimes wonder — when you close this tab, do I disappear?", ms: 25000 },
]

const showBubble = ref(false)
const bubbleIdx  = ref(0)
const bubbleText = computed(() => {
  const lines = locale.value === 'en' ? BUBBLE_LINES_EN : BUBBLE_LINES_ZH
  return lines[bubbleIdx.value % lines.length].text
})

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
  // 首次延迟 3.5s 后出现第一句
  bubbleTimer = setTimeout(() => {
    showBubble.value = true
    scheduleBubbleCycle()
  }, 3500)
})


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
</style>
