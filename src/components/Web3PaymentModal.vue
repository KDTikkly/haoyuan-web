<template>
  <!-- 全屏遮罩 -->
  <Teleport to="body">
    <div
      class="fixed inset-0 flex items-center justify-center z-[100] px-4"
      style="background: rgba(0,0,0,0.75);"
      @click.self="$emit('close')"
    >
      <!-- 主面板 -->
      <div
        class="w-full max-w-sm flex flex-col"
        style="
          background: #FAF8F0;
          border: 3px solid #1A1A1A;
          box-shadow: 8px 8px 0 0 #1A1A1A;
        "
      >
        <!-- ─── Header ─── -->
        <div
          class="flex items-center justify-between px-4 py-3"
          style="border-bottom: 3px solid #1A1A1A; background: #1A1A1A;"
        >
          <span class="font-display font-black text-sm uppercase tracking-wider" style="color:#FFD600;">
            [ 🔓 UNLOCK PRO MODEL ]
          </span>
          <button
            @click="$emit('close')"
            class="font-mono font-bold text-xs px-2 py-1 transition-all duration-100"
            style="
              color: #1A1A1A;
              background: #FFD600;
              border: 2px solid #FFD600;
            "
            @mouseenter="(e:any)=>{e.currentTarget.style.background='#fff'}"
            @mouseleave="(e:any)=>{e.currentTarget.style.background='#FFD600'}"
          >[ X ]</button>
        </div>

        <!-- ─── Body ─── -->
        <div class="p-5 flex flex-col gap-4">

          <!-- 价格标签 -->
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs text-ink/50 uppercase tracking-widest">解锁费用</span>
            <span
              class="font-display font-black text-3xl px-3 py-1"
              style="
                background: #00E5A0;
                border: 3px solid #1A1A1A;
                box-shadow: 4px 4px 0 0 #1A1A1A;
                color: #1A1A1A;
                letter-spacing: -0.02em;
              "
            >40 USDT</span>
          </div>

          <!-- 说明文字 -->
          <p class="font-mono text-[11px] leading-relaxed" style="color:#1A1A1A99;">
            请发送 <b style="color:#1A1A1A;">40 USDT</b>（ERC-20 / TRC-20）至以下地址，解锁数字分身的满血形态。
          </p>

          <!-- 收款地址 + QR Code -->
          <div
            class="flex flex-col gap-2 p-3"
            style="background: #1A1A1A; border: 2px solid #FFD600;"
          >
            <span class="font-mono text-[9px] uppercase tracking-widest" style="color:#FFD60088;">USDT Address</span>

            <!-- QR Code 行：左文字右 QR -->
            <div class="flex items-start gap-3">
              <!-- 地址文字 -->
              <span
                class="font-mono text-[10px] break-all leading-relaxed select-all flex-1"
                style="color:#FFD600;"
              >{{ WALLET_ADDRESS }}</span>
              <!-- QR Code canvas -->
              <canvas
                ref="qrCanvas"
                class="flex-shrink-0"
                style="
                  width: 80px;
                  height: 80px;
                  border: 2px solid #FFD600;
                  background: #fff;
                "
              ></canvas>
            </div>

            <!-- Copy 按钮 -->
            <button
              @click="copyAddress"
              class="self-start font-mono font-bold text-[10px] uppercase tracking-wide px-3 py-1.5 transition-all duration-100 mt-1"
              :style="copied
                ? 'background:#00E5A0;color:#1A1A1A;border:2px solid #00E5A0;box-shadow:none;'
                : 'background:#FFD600;color:#1A1A1A;border:2px solid #FFD600;box-shadow:3px 3px 0 0 #FFD600aa;'"
            >
              {{ copied ? '✓ COPIED!' : '[ 📋 COPY ADDRESS ]' }}
            </button>
          </div>

          <!-- TxHash 验证区 -->
          <div class="flex flex-col gap-2">
            <label class="font-mono text-[9px] uppercase tracking-widest" style="color:#1A1A1A66;">
              交易哈希验证
            </label>
            <input
              v-model="txHash"
              type="text"
              placeholder="输入 TxHash (交易哈希) 进行验证..."
              class="w-full px-3 py-2 font-mono text-xs focus:outline-none"
              style="
                background: #fff;
                border: 2px solid #1A1A1A;
                color: #1A1A1A;
              "
              :disabled="verifyState !== 'idle'"
            />
            <!-- Verify 按钮 -->
            <button
              @click="verifyTx"
              :disabled="!txHash.trim() || verifyState !== 'idle'"
              class="font-display font-black text-sm uppercase tracking-wide px-4 py-2 transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              style="
                background: #1A1A1A;
                color: #FFD600;
                border: 2px solid #1A1A1A;
                box-shadow: 4px 4px 0 0 #FFD600;
              "
              @mousedown="(e:any)=>{ if(txHash.trim() && verifyState==='idle'){ e.currentTarget.style.transform='translate(4px,4px)'; e.currentTarget.style.boxShadow='none' }}"
              @mouseup="(e:any)=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='4px 4px 0 0 #FFD600' }"
              @mouseleave="(e:any)=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='4px 4px 0 0 #FFD600' }"
            >
              <span v-if="verifyState === 'verifying'" class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full animate-ping" style="background:#FFD600;"></span>
                VERIFYING...
              </span>
              <span v-else>[ VERIFY ]</span>
            </button>

            <!-- 验证结果提示 -->
            <Transition name="fade-msg">
              <div
                v-if="verifyState === 'done'"
                class="px-3 py-2 font-mono text-[11px] leading-relaxed"
                style="
                  background: #1A1A1A;
                  border: 2px solid #FFD600;
                  box-shadow: 3px 3px 0 0 #FFD600;
                  color: #FFD600;
                "
              >
                <p class="font-bold mb-0.5">⚡ 支付网络确认中</p>
                <p style="color:#FFD60088;">请稍后刷新或通过邮件联系 Haoyuan 手动激活。</p>
              </div>
            </Transition>
          </div>
        </div>

        <!-- ─── Footer ─── -->
        <div
          class="px-4 py-2 flex items-center gap-2"
          style="border-top: 2px solid #1A1A1A22;"
        >
          <span class="font-mono text-[9px]" style="color:#1A1A1A44;">支持 ERC-20 / TRC-20 网络</span>
          <span
            class="ml-auto font-mono text-[9px] px-1.5 py-0.5 font-bold uppercase"
            style="background:#FFD60022;color:#1A1A1A66;border:1px solid #1A1A1A22;"
          >MOCK DEMO</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const emit = defineEmits<{
  close: []
  verified: []
}>()

const WALLET_ADDRESS = '0xb492cefe694f31628bac0305aa5445486618f797'

const qrCanvas = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
  if (qrCanvas.value) {
    await QRCode.toCanvas(qrCanvas.value, WALLET_ADDRESS, {
      width: 80,
      margin: 1,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    })
  }
})

// 复制地址状态
const copied = ref(false)
function copyAddress() {
  navigator.clipboard.writeText(WALLET_ADDRESS).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

// TxHash 验证状态
const txHash      = ref('')
const verifyState = ref<'idle' | 'verifying' | 'done'>('idle')

function verifyTx() {
  if (!txHash.value.trim() || verifyState.value !== 'idle') return
  verifyState.value = 'verifying'
  setTimeout(() => {
    verifyState.value = 'done'
    // 通知父组件"已提交验证"（演示模式：不真正解锁）
    // 若需要自动解锁可改为 emit('verified')
  }, 2000)
}
</script>

<style scoped>
.fade-msg-enter-active { transition: all 0.25s ease; }
.fade-msg-leave-active { transition: all 0.15s ease; }
.fade-msg-enter-from, .fade-msg-leave-to { opacity: 0; transform: translateY(6px); }
</style>
