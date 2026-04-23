<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <!-- Chat Container (Brutalist Card) -->
    <transition name="slide-up" appear>
      <div
        v-if="isOpen"
        class="w-80 sm:w-96 max-h-[480px] flex flex-col bg-warm-white
               border-[3px] border-ink shadow-hard
               rounded-sm"
      >
        <!-- Header -->
        <div class="border-b-[3px] border-ink bg-pastel-yellow p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-display font-bold text-lg leading-none">🤖</span>
            <span class="font-display font-bold text-sm uppercase tracking-wide">
              {{ locale === 'en' ? 'AI Assistant' : 'AI 助理' }}
            </span>
          </div>
          <button
            @click="close"
            class="w-8 h-8 border-[2px] border-ink bg-warm-white
                   flex items-center justify-center
                   hover:bg-ink hover:text-warm-white
                   transition-colors duration-150"
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        <!-- Messages Area -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-3 space-y-3"
          role="log"
          aria-live="polite"
        >
          <!-- System Welcome Message -->
          <div class="flex gap-2">
            <div class="w-6 h-6 border-[2px] border-ink bg-pastel-pink flex items-center justify-center text-xs font-bold flex-shrink-0">
              🤖
            </div>
            <div class="flex-1 bg-warm-white border-[2px] border-ink/30 p-2 text-sm leading-relaxed">
              <span v-html="welcomeMessage"></span>
            </div>
          </div>

          <!-- User Messages -->
          <div
            v-for="(msg, idx) in userMessages"
            :key="`user-${idx}`"
            class="flex gap-2 flex-row-reverse"
          >
            <div class="w-6 h-6 border-[2px] border-ink bg-pastel-blue flex items-center justify-center text-xs font-bold flex-shrink-0">
              👤
            </div>
            <div class="flex-1 bg-pastel-blue border-[2px] border-ink p-2 text-sm leading-relaxed text-right">
              {{ msg }}
            </div>
          </div>

          <!-- AI Response (Streaming) -->
          <div v-if="aiResponse" class="flex gap-2">
            <div class="w-6 h-6 border-[2px] border-ink bg-pastel-pink flex items-center justify-center text-xs font-bold flex-shrink-0">
              🤖
            </div>
            <div class="flex-1 bg-warm-white border-[2px] border-ink/30 p-2 text-sm leading-relaxed">
              <span v-if="isStreaming" class="inline-flex items-center gap-1">
                {{ aiResponse }}
                <span class="animate-pulse">▋</span>
              </span>
              <span v-else>{{ aiResponse }}</span>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading && !aiResponse" class="flex gap-2">
            <div class="w-6 h-6 border-[2px] border-ink bg-pastel-pink flex items-center justify-center text-xs font-bold flex-shrink-0">
              🤖
            </div>
            <div class="flex-1 bg-warm-white border-[2px] border-ink/30 p-2 flex items-center gap-1">
              <span class="w-2 h-2 bg-ink rounded-full animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-2 h-2 bg-ink rounded-full animate-bounce" style="animation-delay: 150ms"></span>
              <span class="w-2 h-2 bg-ink rounded-full animate-bounce" style="animation-delay: 300ms"></span>
            </div>
          </div>

          <!-- Error State -->
          <div v-if="error" class="flex gap-2">
            <div class="w-6 h-6 border-[2px] border-ink bg-pastel-red flex items-center justify-center text-xs font-bold flex-shrink-0">
              ⚠️
            </div>
            <div class="flex-1 bg-pastel-red/10 border-[2px] border-pastel-red p-2 text-sm text-ink">
              <p class="font-bold">{{ locale === 'en' ? 'Something went wrong' : '出错了' }}</p>
              <p class="text-xs text-ink/70">{{ error }}</p>
            </div>
          </div>

          <!-- Over Quota State (Memphis Brutalist Warning) -->
          <div v-if="isOverQuota" class="flex gap-2">
            <div class="w-6 h-6 border-[2px] border-ink bg-pastel-yellow flex items-center justify-center text-xs font-bold flex-shrink-0">
              ⚡
            </div>
            <div class="flex-1 bg-pastel-yellow border-[3px] border-ink shadow-[4px_4px_0_0_#1A1A1A] p-3">
              <p class="font-display font-bold text-sm mb-1">（数据同步中...）</p>
              <p class="font-mono text-xs text-ink/80 leading-tight">
                当前大脑带宽已满，Haoyuan 的数字分身正在休息，请稍后再试或直接通过邮件联系本人。
              </p>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="border-t-[3px] border-ink p-3 bg-warm-white">
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input
              v-model="inputMessage"
              type="text"
              :placeholder="locale === 'en' ? 'Ask about Haoyuan...' : '问问 Haoyuan 的事...'"
              :disabled="isLoading"
              class="flex-1 min-w-0 border-[2px] border-ink bg-warm-white
                     px-3 py-2 text-sm font-mono
                     focus:outline-none focus:shadow-[3px_3px_0_0_#1A1A1A]
                     disabled:opacity-50 disabled:cursor-not-allowed"
              maxlength="200"
              aria-label="Type a message"
            />
            <button
              type="submit"
              :disabled="isLoading || !inputMessage.trim()"
              class="px-4 py-2 bg-pastel-green border-[2px] border-ink
                     font-display font-bold text-sm uppercase tracking-wide
                     hover:shadow-[3px_3px_0_0_#1A1A1A] hover:-translate-x-[2px] hover:-translate-y-[2px]
                     transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {{ isLoading ? '...' : '→' }}
            </button>
          </form>
        </div>
      </div>
    </transition>

    <!-- Floating Toggle Button -->
    <button
      @click="toggle"
      class="w-14 h-14 bg-pastel-yellow border-[3px] border-ink shadow-hard
             flex items-center justify-center
             hover:shadow-[4px_4px_0_0_#1A1A1A] hover:-translate-x-[1px] hover:-translate-y-[1px]
             active:shadow-[2px_2px_0_0_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px]
             transition-all duration-150"
      :aria-label="isOpen ? 'Close chat' : 'Open chat'"
      :aria-expanded="isOpen"
    >
      <span class="font-display font-bold text-2xl">{{ isOpen ? '✕' : '💬' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// State
const isOpen = ref(false)
const inputMessage = ref('')
const userMessages = ref<string[]>([])
const aiResponse = ref('')
const isStreaming = ref(false)
const isLoading = ref(false)
const error = ref('')
const isOverQuota = ref(false) // 额度耗尽状态
const messagesContainer = ref<HTMLElement | null>(null)

// AbortController for cancelling requests
let abortController: AbortController | null = null

// Welcome message
const welcomeMessage = computed(() =>
  locale.value === 'en'
    ? 'Hey! I\'m <b>Haoyuan\'s AI assistant</b>. Ask me anything about his projects, skills, or just say hi! 🚀'
    : '嘿！我是 <b>Haoyuan 的 AI 助理</b>。问我关于他的项目、技能的事，或者打个招呼！🚀'
)

// Toggle chat
function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

function close() {
  isOpen.value = false
}

// Send message
async function sendMessage() {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  // 如果额度耗尽，不允许发送
  if (isOverQuota.value) {
    error.value = locale.value === 'en' ? 'Please try again later' : '请稍后再试'
    return
  }

  // Add to user messages
  userMessages.value.push(message)
  inputMessage.value = ''
  error.value = ''
  isOverQuota.value = false // 重置额度状态

  // Prepare for streaming response
  aiResponse.value = ''
  isStreaming.value = true
  isLoading.value = true

  // Create new abort controller
  abortController = new AbortController()

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: abortController.signal
    })

    // Check for non-JSON response (over quota case)
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json().catch(() => ({}))

      // 429 熔断保护：检查 isOverQuota 标识
      if (data.isOverQuota) {
        isOverQuota.value = true
        isStreaming.value = false
        isLoading.value = false
        return
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
    } else if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // Read stream
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            isStreaming.value = false
            isLoading.value = false
            break
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              aiResponse.value += parsed.text
              await nextTick()
              scrollToBottom()
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    isStreaming.value = false
    isLoading.value = false

  } catch (err: any) {
    // Handle abort
    if (err.name === 'AbortError') {
      console.log('[Chat] Request cancelled')
      return
    }

    // Handle errors
    console.error('[Chat] Error:', err)
    error.value = err.message || (locale.value === 'en' ? 'Failed to send message' : '发送消息失败')
    isStreaming.value = false
    isLoading.value = false
  } finally {
    abortController = null
  }
}

// Scroll to bottom of messages
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
  }
})
</script>

<style scoped>
/* Slide up animation */
.slide-up-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Custom scrollbar */
:deep(.overflow-y-auto)::-webkit-scrollbar {
  width: 6px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: #F5F5DC;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
  background: #1A1A1A;
  border-radius: 0;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: #000;
}
</style>
