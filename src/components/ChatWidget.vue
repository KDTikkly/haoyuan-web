<template>
  <!--
    ChatWidget.vue
    右下角悬浮「简历质询 AI 智能体」
    Memphis × Brutalist 方块气泡风格，支持 SSE 流式输出
  -->

  <!-- Trigger Button -->
  <div class="fixed bottom-6 right-6 z-[9000] flex flex-col items-end gap-3">

    <!-- Chat Panel -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="open"
        class="w-[340px] sm:w-[400px] border-[3px] border-ink bg-warm-white
               flex flex-col overflow-hidden
               shadow-[8px_8px_0_0_#1A1A1A]"
        style="max-height: min(560px, calc(100vh - 100px));"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 py-3 bg-ink text-warm-white border-b-[3px] border-ink flex-shrink-0">
          <img
            src="/assets/images/avatar.jpg"
            alt="avatar"
            class="w-8 h-8 rounded-full border-2 border-warm-white object-cover object-top flex-shrink-0"
            @error="(e) => e.target.style.display='none'"
          />
          <div class="flex-1 min-w-0">
            <div class="font-display font-bold text-sm leading-tight">Digital Twin · Haoyuan</div>
            <div class="font-mono text-[10px] text-warm-white/60 tracking-wider">
              {{ isStreaming ? '▋ 思考中...' : '● ONLINE' }}
            </div>
          </div>
          <!-- Clear history -->
          <button
            class="font-mono text-[10px] text-warm-white/50 hover:text-warm-white transition-colors px-1"
            title="清空对话"
            @click="clearHistory"
          >CLR</button>
          <!-- Close -->
          <button
            class="w-7 h-7 border-2 border-warm-white/40 flex items-center justify-center
                   font-bold text-sm hover:bg-warm-white/10 transition-colors"
            @click="open = false"
          >×</button>
        </div>

        <!-- Messages -->
        <div
          ref="messagesEl"
          class="flex-1 overflow-y-auto p-4 space-y-3"
          style="min-height: 0;"
        >
          <!-- Welcome message -->
          <div v-if="messages.length === 0" class="flex gap-2">
            <div class="w-6 h-6 border-2 border-ink bg-memphis-yellow flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-[10px] font-bold">AI</span>
            </div>
            <div class="border-[3px] border-ink bg-warm-beige px-3 py-2 max-w-[85%]
                        shadow-[3px_3px_0_0_#1A1A1A]">
              <p class="font-sans text-sm leading-relaxed text-ink">
                Hi! 我是 Haoyuan 的数字分身 👋<br>
                可以问我关于他的项目、技能、经历，或者直接问「你能做什么」。
              </p>
            </div>
          </div>

          <!-- Chat messages -->
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex gap-2"
            :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
          >
            <!-- Avatar -->
            <div
              class="w-6 h-6 border-2 border-ink flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
              :class="msg.role === 'user' ? 'bg-memphis-blue text-warm-white' : 'bg-memphis-yellow text-ink'"
            >
              {{ msg.role === 'user' ? 'U' : 'AI' }}
            </div>
            <!-- Bubble -->
            <div
              class="border-[3px] border-ink px-3 py-2 max-w-[82%] font-sans text-sm leading-relaxed"
              :class="msg.role === 'user'
                ? 'bg-memphis-blue text-warm-white shadow-[3px_3px_0_0_#1A1A1A]'
                : 'bg-warm-beige text-ink shadow-[3px_3px_0_0_#1A1A1A]'"
            >
              <!-- Render markdown-ish line breaks -->
              <span v-html="renderText(msg.content)"></span>
              <!-- Streaming cursor -->
              <span
                v-if="msg.role === 'assistant' && i === messages.length - 1 && isStreaming"
                class="inline-block w-2 h-3.5 bg-ink ml-0.5 animate-pulse align-middle"
              ></span>
            </div>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="border-[3px] border-memphis-coral bg-memphis-coral/10 px-3 py-2">
            <p class="font-mono text-xs text-memphis-coral">⚠ {{ errorMsg }}</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="flex-shrink-0 border-t-[3px] border-ink p-3 flex gap-2 bg-warm-beige">
          <input
            v-model="inputText"
            ref="inputEl"
            type="text"
            :placeholder="isStreaming ? '等待回复...' : '问点什么...'"
            :disabled="isStreaming"
            class="flex-1 border-[3px] border-ink bg-warm-white px-3 py-2
                   font-sans text-sm text-ink placeholder-ink/40
                   focus:outline-none focus:shadow-[3px_3px_0_0_#2979FF]
                   transition-shadow duration-150
                   disabled:opacity-50"
            @keydown.enter.prevent="sendMessage"
          />
          <button
            :disabled="isStreaming || !inputText.trim()"
            class="px-4 py-2 border-[3px] border-ink bg-memphis-yellow font-mono text-xs font-bold
                   shadow-[3px_3px_0_0_#1A1A1A]
                   hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]
                   active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                   transition-[transform,box-shadow] duration-150
                   disabled:opacity-40 disabled:pointer-events-none"
            @click="sendMessage"
          >
            {{ isStreaming ? '...' : 'SEND' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Floating trigger -->
    <button
      class="group relative w-14 h-14 border-[3px] border-ink bg-memphis-yellow
             flex items-center justify-center
             shadow-[5px_5px_0_0_#1A1A1A]
             hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
             active:shadow-none active:translate-x-[5px] active:translate-y-[5px]
             transition-[transform,box-shadow] duration-150"
      :title="open ? '关闭' : '向我的数字分身提问'"
      @click="toggleChat"
    >
      <!-- Avatar or icon -->
      <img
        src="/assets/images/avatar.jpg"
        alt="chat"
        class="w-9 h-9 rounded-full border-2 border-ink object-cover object-top"
        @error="(e) => { e.target.style.display='none'; showFallback=true }"
      />
      <span v-if="showFallback" class="text-xl font-bold">🤖</span>

      <!-- Unread dot -->
      <span
        v-if="!open && hasUnread"
        class="absolute -top-1 -right-1 w-3 h-3 bg-memphis-coral border-2 border-ink"
      ></span>
      <!-- Tooltip -->
      <span
        class="absolute right-full mr-3 top-1/2 -translate-y-1/2
               bg-ink text-warm-white font-mono text-[10px] px-2 py-1
               whitespace-nowrap pointer-events-none
               opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      >问 AI 分身</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const open = ref(false)
const inputText = ref('')
const messages = ref<Message[]>([])
const isStreaming = ref(false)
const errorMsg = ref('')
const hasUnread = ref(false)
const showFallback = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

function toggleChat() {
  open.value = !open.value
  if (open.value) {
    hasUnread.value = false
    nextTick(() => inputEl.value?.focus())
  }
}

function clearHistory() {
  messages.value = []
  errorMsg.value = ''
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

// Simple text renderer: newlines → <br>, **bold**
function renderText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  errorMsg.value = ''
  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  // Add empty assistant bubble for streaming
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIdx = messages.value.length - 1
  isStreaming.value = true

  try {
    const payload = messages.value
      .slice(0, -1) // exclude the empty assistant placeholder
      .map(m => ({ role: m.role, content: m.content }))

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload }),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          // OpenAI format
          if (parsed.choices?.[0]?.delta?.content) {
            messages.value[assistantIdx].content += parsed.choices[0].delta.content
            scrollToBottom()
          }
          // Gemini normalized format
          if (parsed.text) {
            messages.value[assistantIdx].content += parsed.text
            scrollToBottom()
          }
          // Error from server
          if (parsed.error) {
            throw new Error(parsed.error)
          }
        } catch (parseErr: any) {
          if (parseErr.message && !parseErr.message.includes('JSON')) {
            throw parseErr
          }
        }
      }
    }
  } catch (err: any) {
    messages.value[assistantIdx].content = ''
    errorMsg.value = err.message || '请求失败，请稍后重试'
    // Remove empty bubble
    if (!messages.value[assistantIdx].content) {
      messages.value.splice(assistantIdx, 1)
    }
  } finally {
    isStreaming.value = false
    if (!open.value) hasUnread.value = true
    scrollToBottom()
  }
}

// Watch panel open → scroll to bottom
watch(open, (val) => {
  if (val) scrollToBottom()
})
</script>
