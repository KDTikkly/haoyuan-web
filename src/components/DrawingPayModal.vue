<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 flex items-center justify-center z-[110] px-4"
      style="background: rgba(0,0,0,0.8);"
      @click.self="$emit('close')"
    >
      <div
        class="w-full max-w-sm flex flex-col"
        style="background:#FAF8F0;border:3px solid #1A1A1A;box-shadow:8px 8px 0 0 #1A1A1A;"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3"
          style="border-bottom:3px solid #1A1A1A;background:#1A1A1A;"
        >
          <span class="font-display font-black text-sm uppercase tracking-wider" style="color:#FFD600;">
            [ 🎨 UNLOCK AI CANVAS ]
          </span>
          <button
            @click="$emit('close')"
            class="font-mono font-bold text-xs px-2 py-1 transition-all duration-100"
            style="color:#1A1A1A;background:#FFD600;border:2px solid #FFD600;"
            @mouseenter="(e:any)=>{e.currentTarget.style.background='#fff'}"
            @mouseleave="(e:any)=>{e.currentTarget.style.background='#FFD600'}"
          >[ X ]</button>
        </div>

        <!-- Body -->
        <div class="p-5 flex flex-col gap-4">

          <!-- 说明 + 价格 -->
          <div class="flex items-center gap-3">
            <p class="font-mono text-[11px] leading-relaxed flex-1" style="color:#1A1A1A99;">
              你已用完 <b style="color:#1A1A1A;">23 次</b>免费 AI 猜测。<br/>
              支付 <b style="color:#1A1A1A;">10 USDT</b> 解锁无限次数。
            </p>
            <span
              class="font-display font-black text-2xl px-3 py-1 flex-shrink-0"
              style="background:#FFD600;border:3px solid #1A1A1A;box-shadow:4px 4px 0 0 #1A1A1A;color:#1A1A1A;"
            >10 USDT</span>
          </div>

          <!-- 地址 + QR -->
          <div class="flex flex-col gap-2 p-3" style="background:#1A1A1A;border:2px solid #FFD600;">
            <span class="font-mono text-[9px] uppercase tracking-widest" style="color:#FFD60088;">USDT Address</span>
            <div class="flex items-start gap-3">
              <span
                class="font-mono text-[10px] break-all leading-relaxed select-all flex-1"
                style="color:#FFD600;"
              >{{ WALLET_ADDRESS }}</span>
              <canvas
                ref="qrCanvas"
                class="flex-shrink-0"
                style="width:72px;height:72px;border:2px solid #FFD600;background:#fff;"
              ></canvas>
            </div>
            <button
              @click="copyAddress"
              class="self-start font-mono font-bold text-[10px] uppercase tracking-wide px-3 py-1.5 transition-all duration-100 mt-1"
              :style="copied
                ? 'background:#00E5A0;color:#1A1A1A;border:2px solid #00E5A0;'
                : 'background:#FFD600;color:#1A1A1A;border:2px solid #FFD600;box-shadow:3px 3px 0 0 #FFD600aa;'"
            >{{ copied ? '✓ COPIED!' : '[ 📋 COPY ADDRESS ]' }}</button>
          </div>

          <!-- TxHash 验证 -->
          <div class="flex flex-col gap-2">
            <label class="font-mono text-[9px] uppercase tracking-widest" style="color:#1A1A1A66;">
              交易哈希验证
            </label>
            <input
              v-model="txHash"
              type="text"
              placeholder="输入 TxHash 进行验证..."
              class="w-full px-3 py-2 font-mono text-xs focus:outline-none"
              style="background:#fff;border:2px solid #1A1A1A;color:#1A1A1A;"
              :disabled="verifyState !== 'idle'"
            />
            <button
              @click="verifyTx"
              :disabled="!txHash.trim() || verifyState !== 'idle'"
              class="font-display font-black text-sm uppercase tracking-wide px-4 py-2 transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              style="background:#1A1A1A;color:#FFD600;border:2px solid #1A1A1A;box-shadow:4px 4px 0 0 #FFD600;"
              @mousedown="(e:any)=>{ if(txHash.trim()&&verifyState==='idle'){ e.currentTarget.style.transform='translate(4px,4px)';e.currentTarget.style.boxShadow='none'; }}"
              @mouseup="(e:any)=>{ e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='4px 4px 0 0 #FFD600'; }"
              @mouseleave="(e:any)=>{ e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='4px 4px 0 0 #FFD600'; }"
            >
              <span v-if="verifyState==='verifying'" class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full animate-ping" style="background:#FFD600;"></span>
                VERIFYING...
              </span>
              <span v-else>[ VERIFY ]</span>
            </button>

            <Transition name="fade-msg">
              <div
                v-if="verifyState==='done'"
                class="px-3 py-2 font-mono text-[11px] leading-relaxed"
                style="background:#1A1A1A;border:2px solid #FFD600;box-shadow:3px 3px 0 0 #FFD600;color:#FFD600;"
              >
                <p class="font-bold mb-0.5">⚡ 支付网络确认中</p>
                <p style="color:#FFD60088;">请稍后刷新或联系 Haoyuan 手动激活无限次数。</p>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 flex items-center gap-2" style="border-top:2px solid #1A1A1A22;">
          <span class="font-mono text-[9px]" style="color:#1A1A1A44;">支持 ERC-20 / TRC-20 网络</span>
          <span class="ml-auto font-mono text-[9px] px-1.5 py-0.5 font-bold uppercase"
            style="background:#FFD60022;color:#1A1A1A66;border:1px solid #1A1A1A22;">MOCK DEMO</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const emit = defineEmits<{ close: []; unlocked: [] }>()

const WALLET_ADDRESS = '0xb492cefe694f31628bac0305aa5445486618f797'
const qrCanvas    = ref<HTMLCanvasElement | null>(null)
const copied      = ref(false)
const txHash      = ref('')
const verifyState = ref<'idle' | 'verifying' | 'done'>('idle')

onMounted(async () => {
  if (qrCanvas.value) {
    await QRCode.toCanvas(qrCanvas.value, WALLET_ADDRESS, {
      width: 72, margin: 1, color: { dark: '#1A1A1A', light: '#FFFFFF' },
    })
  }
})

function copyAddress() {
  navigator.clipboard.writeText(WALLET_ADDRESS).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function verifyTx() {
  if (!txHash.value.trim() || verifyState.value !== 'idle') return
  verifyState.value = 'verifying'
  setTimeout(() => { verifyState.value = 'done' }, 2000)
}
</script>

<style scoped>
.fade-msg-enter-active { transition: all 0.25s ease; }
.fade-msg-leave-active { transition: all 0.15s ease; }
.fade-msg-enter-from, .fade-msg-leave-to { opacity: 0; transform: translateY(6px); }
</style>
