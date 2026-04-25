<template>
  <Teleport to="body">
    <Transition name="portal-fade">
      <div v-if="visible" class="portal-overlay" @click.self="emit('cancel')">
        <div class="portal-box" :class="{ shake: isShaking, 'unlock-flash': isUnlocked }">

          <!-- ── 顶栏 ── -->
          <div class="portal-header">
            <span class="portal-badge">⬡ SECURITY PORTAL</span>
            <button class="portal-close" @click="emit('cancel')">✕</button>
          </div>

          <!-- ══════════════════════════════════════════
               STEP 1：默认面板（口令 + 支付选项）
          ══════════════════════════════════════════ -->
          <div v-if="step === 'main'" class="portal-body">
            <!-- 巨大黄色感叹号免责横幅 -->
            <div class="mega-warn-banner">
              <div class="mega-warn-exclaim">!</div>
              <div class="mega-warn-content">
                <p class="mega-warn-title">[ SYSTEM WARNING ]</p>
                <p class="mega-warn-body">本系统处于内测阶段，支付功能<strong>未对接</strong>。若付款视为<strong>无偿捐赠</strong>，不附带任何服务承诺。确认后方可继续。</p>
              </div>
            </div>

            <!-- 成功解锁提示 -->
            <div v-if="isUnlocked" class="unlock-msg">
              ✔ 认证成功，欢迎回来
            </div>

            <!-- 口令输入 -->
            <div class="field-group">
              <label class="field-label">◈ 核心授权码</label>
              <div class="input-row">
                <input
                  ref="codeInput"
                  v-model="code"
                  :type="showCode ? 'text' : 'password'"
                  class="portal-input"
                  placeholder="请输入核心授权码..."
                  autocomplete="off"
                  @keyup.enter="submitCode"
                />
                <button class="eye-btn" @click="showCode = !showCode">
                  {{ showCode ? '◉' : '◎' }}
                </button>
              </div>
              <p v-if="codeError" class="field-error">{{ codeError }}</p>
            </div>

            <button class="portal-btn portal-btn--primary" @click="submitCode">
              ▶ 验证授权码
            </button>

            <div class="portal-divider"><span>或</span></div>

            <button class="portal-btn portal-btn--donate" @click="step = 'disclaimer'">
              ◆ 通过捐赠解锁（Web3）
            </button>
          </div>

          <!-- ══════════════════════════════════════════
               STEP 2：捐赠免责声明
          ══════════════════════════════════════════ -->
          <div v-else-if="step === 'disclaimer'" class="portal-body">
            <p class="portal-title">⚠ 重要免责声明</p>
            <div class="disclaimer-box">
              <p>本系统支付模块<strong>尚未完工</strong>。</p>
              <p>若您选择向下方地址转账，该行为视为<strong>自愿无偿捐赠</strong>，不附带任何服务承诺、退款权利或功能兑现义务。</p>
              <p>确认并继续即表示您完全理解并接受上述条款。</p>
            </div>

            <label class="checkbox-row">
              <input v-model="disclaimerAccepted" type="checkbox" class="portal-checkbox" />
              <span>我已阅读并接受捐赠协议</span>
            </label>

            <div class="btn-row">
              <button class="portal-btn portal-btn--ghost" @click="step = 'main'">← 返回</button>
              <button
                class="portal-btn portal-btn--primary"
                :disabled="!disclaimerAccepted"
                @click="step = 'payment'; generateQR()"
              >
                [ 我接受捐赠协议 ] →
              </button>
            </div>
          </div>

          <!-- ══════════════════════════════════════════
               STEP 3：Web3 收款地址
          ══════════════════════════════════════════ -->
          <div v-else-if="step === 'payment'" class="portal-body">
            <p class="portal-title">◆ Web3 收款地址</p>
            <p class="portal-sub">仅接受 ETH / ERC-20 代币（ERC-20 网络）。</p>

            <!-- 真实二维码 -->
            <div class="qr-placeholder">
              <div class="qr-inner">
                <img v-if="qrDataUrl" :src="qrDataUrl" width="160" height="160" alt="ETH QR Code" />
                <div v-else class="qr-loading">生成中…</div>
                <p class="qr-label">◈ ETH / ERC-20 网络</p>
              </div>
            </div>

            <!-- 完整地址 -->
            <div class="address-box">
              <span class="address-text">{{ ETH_ADDR }}</span>
              <button class="copy-btn" @click="copyAddress">
                {{ copied ? '✔ 已复制' : '⎘ 复制' }}
              </button>
            </div>

            <p class="portal-sub" style="margin-top:6px;font-size:9px;color:#FF6B6B;">
              ⚠ 转账前请核对完整地址，错误转账不可撤销。
            </p>

            <button class="portal-btn portal-btn--ghost" style="margin-top:12px;" @click="step = 'disclaimer'">← 返回</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAdmin } from '@/composables/useAdmin'
import QRCode from 'qrcode'

const SECRET  = 'Corealis0514'
const ETH_ADDR = '0xb492cefe694f31628bac0305aa5445486618f797'

const props = defineProps<{
  visible: boolean
  /** 验证成功后执行的回调动作 */
  pendingAction?: () => void
}>()

const emit = defineEmits<{
  (e: 'unlock'): void
  (e: 'cancel'): void
}>()

const { unlockAdmin } = useAdmin()

// ── 状态 ──────────────────────────────────────────────────────────────────────
const step               = ref<'main' | 'disclaimer' | 'payment'>('main')
const code               = ref('')
const showCode           = ref(false)
const codeError          = ref('')
const isShaking          = ref(false)
const isUnlocked         = ref(false)
const disclaimerAccepted = ref(false)
const copied             = ref(false)
const codeInput          = ref<HTMLInputElement | null>(null)
const qrDataUrl          = ref('')

async function generateQR() {
  if (qrDataUrl.value) return
  qrDataUrl.value = await QRCode.toDataURL(ETH_ADDR, {
    width: 160,
    margin: 2,
    color: { dark: '#1A1A1A', light: '#FAF8F5' },
  })
}

// 每次打开时重置状态
watch(() => props.visible, (v) => {
  if (v) {
    step.value               = 'main'
    code.value               = ''
    codeError.value          = ''
    isUnlocked.value         = false
    disclaimerAccepted.value = false
    copied.value             = false
    nextTick(() => {
      codeInput.value?.focus()
    })
  }
})

// ── 口令校验 ──────────────────────────────────────────────────────────────────
function submitCode() {
  if (code.value === SECRET) {
    unlockAdmin()
    isUnlocked.value = true
    props.pendingAction?.()
    emit('unlock')
  } else {
    codeError.value = '授权码无效，请重试。'
    triggerShake()
    code.value = ''
  }
}

function triggerShake() {
  isShaking.value = true
  setTimeout(() => { isShaking.value = false }, 500)
}

// ── 复制地址 ──────────────────────────────────────────────────────────────────
function copyAddress() {
  navigator.clipboard?.writeText(ETH_ADDR).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}
</script>

<style scoped>
/* ── 遮罩 ── */
.portal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 26, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

/* ── 弹窗主体 ── */
.portal-box {
  background: #FAF8F5;
  border: 3px solid #1A1A1A;
  box-shadow: 8px 8px 0 0 #1A1A1A;
  width: 100%;
  max-width: 380px;
  max-height: calc(100vh - 48px); /* 移动端防溢出 */
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  /* 隐藏弹窗内部滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.portal-box::-webkit-scrollbar { display: none; }

/* 抖动动效 */
.shake {
  animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90%  { transform: translateX(-3px); }
  20%, 80%  { transform: translateX(5px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60%  { transform: translateX(7px); }
}

/* ── 顶栏 ── */
.portal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1A1A1A;
  padding: 10px 14px;
}

.portal-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #FFD600;
}

.portal-close {
  background: #FFD600;
  border: 2px solid #FFD60066;
  color: #1A1A1A;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  padding: 3px 7px;
  transition: background 0.1s, border-color 0.1s;
  font-family: 'JetBrains Mono', monospace;
}
.portal-close:hover {
  background: #fff;
  border-color: #fff;
}

/* ── Body ── */
.portal-body {
  padding: 20px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.portal-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1A1A1A;
  letter-spacing: -0.02em;
  margin: 0;
}

.portal-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #1A1A1A80;
  margin: 0;
}

/* ── 输入框 ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #1A1A1A80;
  text-transform: uppercase;
}

.input-row {
  display: flex;
  gap: 0;
  border: 3px solid #1A1A1A;
}

.portal-input {
  flex: 1;
  background: #FAF8F5;
  border: none;
  outline: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1A1A1A;
  padding: 8px 10px;
  letter-spacing: 0.1em;
}

.eye-btn {
  background: #1A1A1A;
  border: none;
  color: #FFD600;
  cursor: pointer;
  padding: 0 10px;
  font-size: 13px;
  transition: background 0.15s;
}
.eye-btn:hover { background: #333; }

.field-error {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #FF6B6B;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.05em;
}

/* ── 按钮 ── */
.portal-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 9px 14px;
  border: 3px solid #1A1A1A;
  cursor: pointer;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transition: transform 0.1s, box-shadow 0.1s;
  text-transform: uppercase;
  text-align: center;
}
.portal-btn:active:not(:disabled) {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #1A1A1A;
}
.portal-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transform: none;
}

.portal-btn--primary {
  background: #FFD600;
  color: #1A1A1A;
}
.portal-btn--primary:hover:not(:disabled) {
  background: #FFC400;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transform: translate(-1px, -1px);
}

.portal-btn--donate {
  background: #FAF8F5;
  color: #1A1A1A;
  border-style: dashed;
}
.portal-btn--donate:hover {
  background: #A78BFA;
  color: #fff;
  border-style: solid;
}

.portal-btn--ghost {
  background: transparent;
  color: #1A1A1A;
}
.portal-btn--ghost:hover {
  background: #1A1A1A08;
}

/* ── 分隔线 ── */
.portal-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #1A1A1A40;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.portal-divider::before,
.portal-divider::after {
  content: '';
  flex: 1;
  height: 2px;
  background: #1A1A1A20;
}

/* ── 免责声明框 ── */
.disclaimer-box {
  border: 3px solid #1A1A1A;
  background: #FFF9C4;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  box-shadow: 3px 3px 0 0 #1A1A1A;
}
.disclaimer-box p {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.6;
  color: #1A1A1A;
  margin: 0;
}
.disclaimer-box strong {
  font-weight: 800;
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #1A1A1A;
  user-select: none;
}
.portal-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #1A1A1A;
  accent-color: #FFD600;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-row {
  display: flex;
  gap: 10px;
}
.btn-row .portal-btn {
  flex: 1;
}

/* ── QR 占位 ── */
.qr-placeholder {
  display: flex;
  justify-content: center;
}
.qr-inner {
  border: 3px solid #1A1A1A;
  padding: 12px;
  background: #FAF8F5;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.qr-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A1A60;
  margin: 0;
  letter-spacing: 0.1em;
}
.qr-loading {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #1A1A1A40;
}

/* ── 地址框 ── */
.address-box {
  display: flex;
  align-items: center;
  border: 3px solid #1A1A1A;
  background: #1A1A1A;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  overflow: hidden;
}
.address-text {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #00E5A0;
  padding: 8px 10px;
  letter-spacing: 0.04em;
  word-break: break-all;
  line-height: 1.5;
}
.copy-btn {
  background: #FFD600;
  border: none;
  border-left: 3px solid #FAF8F5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A1A;
  padding: 8px 12px;
  cursor: pointer;
  letter-spacing: 0.08em;
  transition: background 0.15s;
  white-space: nowrap;
}
.copy-btn:hover { background: #FFC400; }

/* ── 进出动画 ── */
.portal-fade-enter-active { animation: portal-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.portal-fade-leave-active { animation: portal-in 0.15s ease-in reverse; }
@keyframes portal-in {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── 巨大感叹号免责横幅 ── */
.mega-warn-banner {
  display: flex;
  align-items: stretch;
  border: 4px solid #1A1A1A;
  background: #FFD600;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  overflow: hidden;
}
.mega-warn-exclaim {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1A1A1A;
  color: #FFD600;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 64px;
  font-weight: 900;
  width: 68px;
  flex-shrink: 0;
  letter-spacing: -3px;
  line-height: 1;
}
.mega-warn-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mega-warn-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: #1A1A1A;
  margin: 0;
}
.mega-warn-body {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  line-height: 1.65;
  color: #1A1A1A;
  margin: 0;
  font-weight: 600;
}
.mega-warn-body strong {
  font-weight: 900;
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

/* ── 解锁成功提示 ── */
.unlock-msg {
  background: #00E5A018;
  border: 2px solid #00E5A0;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #00A070;
  letter-spacing: 0.08em;
  text-align: center;
}

/* ── 成功闪烁动效 ── */
.unlock-flash {
  animation: flash-green 0.65s ease;
}
@keyframes flash-green {
  0%   { box-shadow: 8px 8px 0 0 #1A1A1A; }
  25%  { box-shadow: 8px 8px 0 0 #00E5A0, 0 0 20px 4px #00E5A055; border-color: #00E5A0; }
  60%  { box-shadow: 8px 8px 0 0 #00E5A0, 0 0 10px 2px #00E5A033; border-color: #00E5A0; }
  100% { box-shadow: 8px 8px 0 0 #1A1A1A; border-color: #1A1A1A; }
}

</style>

