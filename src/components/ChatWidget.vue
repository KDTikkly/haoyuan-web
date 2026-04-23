<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

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
          class="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style="border-bottom: 3px solid #FFD600;"
        >
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
                Digital Twin · Haoyuan
              </span>
              <div class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full" style="background:#22C55E;"></span>
                <span class="font-mono text-[9px] uppercase tracking-widest" style="color:#22C55E;">ONLINE</span>
              </div>
            </div>
          </div>

          <!-- 右侧：关闭按钮 -->
          <button
            @click="close"
            class="font-mono font-bold text-xs px-2 py-1 transition-all duration-100"
            style="
              color: #1A1A1A;
              background: #FFD600;
              border: 2px solid #FFD600;
            "
            @mouseenter="(e: any) => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#1A1A1A' }"
            @mouseleave="(e: any) => { e.currentTarget.style.background='#FFD600'; e.currentTarget.style.color='#1A1A1A' }"
            aria-label="Close chat"
          >[ x ]</button>
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
        <div
          class="flex-shrink-0 p-3"
          style="border-top: 3px solid #FFD600; background: #1A1A1A;"
        >
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input
              v-model="inputMessage"
              type="text"
              :placeholder="locale === 'en' ? 'Ask about Haoyuan...' : '问问 Haoyuan 的事...'"
              :disabled="isLoading"
              class="flex-1 min-w-0 px-3 py-2 text-sm font-mono
                     focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style="
                background: #fff;
                color: #1A1A1A;
                border: 2px solid #1A1A1A;
              "
              maxlength="200"
              aria-label="Type a message"
            />
            <!-- 明黄色 SEND 按钮 -->
            <button
              type="submit"
              :disabled="isLoading || !inputMessage.trim()"
              class="px-4 py-2 font-display font-black text-sm uppercase tracking-wide
                     transition-all duration-100 flex-shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed"
              style="
                background: #FFD600;
                color: #1A1A1A;
                border: 2px solid #1A1A1A;
                box-shadow: 3px 3px 0 0 #1A1A1A;
              "
              @mousedown="(e: any) => {
                if (!isLoading && inputMessage.trim()) {
                  e.currentTarget.style.transform='translate(3px,3px)';
                  e.currentTarget.style.boxShadow='none';
                }
              }"
              @mouseup="(e: any) => {
                e.currentTarget.style.transform='';
                e.currentTarget.style.boxShadow='3px 3px 0 0 #1A1A1A';
              }"
              @mouseleave="(e: any) => {
                e.currentTarget.style.transform='';
                e.currentTarget.style.boxShadow='3px 3px 0 0 #1A1A1A';
              }"
            >
              {{ isLoading ? '...' : 'SEND' }}
            </button>
          </form>
        </div>
      </div>
    </transition>

    <!-- ════════════════════════════════════════════
         浮动开关按钮 — 头像风格
    ════════════════════════════════════════════ -->
    <button
      @click="toggle"
      class="w-14 h-14 flex items-center justify-center transition-all duration-150 overflow-hidden"
      style="
        background: #FFD600;
        border: 3px solid #1A1A1A;
        box-shadow: 4px 4px 0 0 #1A1A1A;
        border-radius: 50%;
        padding: 0;
        position: relative;
      "
      @mouseenter="(e: any) => { e.currentTarget.style.boxShadow='6px 6px 0 0 #1A1A1A'; e.currentTarget.style.transform='translate(-1px,-1px)' }"
      @mouseleave="(e: any) => { e.currentTarget.style.boxShadow='4px 4px 0 0 #1A1A1A'; e.currentTarget.style.transform='' }"
      @mousedown="(e: any) => { e.currentTarget.style.boxShadow='2px 2px 0 0 #1A1A1A'; e.currentTarget.style.transform='translate(2px,2px)' }"
      @mouseup="(e: any) => { e.currentTarget.style.boxShadow='4px 4px 0 0 #1A1A1A'; e.currentTarget.style.transform='' }"
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
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 头像路径（public 静态资源，用变量避免 Rollup 误解析）
const AVATAR_URL = '/assets/images/avatar.jpg'

// ════════════════════════════════════════════
//  状态
// ════════════════════════════════════════════
const isOpen         = ref(false)
const inputMessage   = ref('')
const isStreaming    = ref(false)
const isLoading      = ref(false)
const error          = ref('')
const isOverQuota    = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

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
    ? 'Hey! I\'m <b style="color:#FFD600;">Haoyuan\'s Digital Twin</b>. Ask me about his projects, skills, or just say hi!'
    : '嘿！我是 <b style="color:#FFD600;">Haoyuan 的数字分身</b>。问我他的项目、技能，或者随便聊聊！'
)

// ════════════════════════════════════════════
//  开关
// ════════════════════════════════════════════
function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) nextTick(scrollToBottom)
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
})
</script>

<style scoped>
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
</style>
