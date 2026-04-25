<template>
  <Teleport to="body">
    <Transition name="cookie-slide">
      <div
        v-if="visible"
        class="cookie-banner"
        role="dialog"
        aria-modal="false"
        aria-label="Cookie 使用告知"
        aria-describedby="cookie-desc"
      >
        <!-- 左侧色条装饰 -->
        <div class="cookie-accent" aria-hidden="true"></div>

        <!-- 内容区 -->
        <div class="cookie-body">
          <div class="cookie-heading">
            <span class="cookie-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9" fill="#FFD600" stroke="#1A1A1A" stroke-width="2.5"/>
                <circle cx="7.5" cy="8.5" r="1.4" fill="#1A1A1A"/>
                <circle cx="13" cy="6.5" r="1.1" fill="#1A1A1A"/>
                <circle cx="15" cy="13" r="1.4" fill="#1A1A1A"/>
                <circle cx="8.5" cy="14" r="1.1" fill="#1A1A1A"/>
                <circle cx="11" cy="10.5" r="0.9" fill="#1A1A1A"/>
              </svg>
            </span>
            <span class="cookie-title">COOKIES &amp; 隐私</span>
          </div>

          <p id="cookie-desc" class="cookie-desc">
            本站使用 Cookie 改善体验、统计匿名访问数据。继续使用即视为同意。
            <button
              class="cookie-link"
              @click="showDetail = !showDetail"
              :aria-expanded="showDetail"
              aria-controls="cookie-detail"
            >{{ showDetail ? '收起 ↑' : '了解更多 ↓' }}</button>
          </p>

          <Transition name="detail-expand">
            <div v-if="showDetail" id="cookie-detail" class="cookie-detail" role="region">
              <div class="detail-row">
                <span class="detail-tag detail-tag--required">必要</span>
                <span class="detail-text">会话 / 安全 / 语言偏好，无法关闭，保障基础功能。</span>
              </div>
              <div class="detail-row">
                <span class="detail-tag detail-tag--analytics">统计</span>
                <span class="detail-text">匿名页面浏览统计，不含个人身份信息，点击"接受"后启用。</span>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 操作按钮 -->
        <div class="cookie-actions">
          <button class="cookie-btn cookie-btn--accept" @click="accept">接受</button>
          <button class="cookie-btn cookie-btn--decline" @click="decline">仅必要</button>
        </div>

        <!-- 关闭 × -->
        <button class="cookie-close" @click="decline" aria-label="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="1" y1="1" x2="9" y2="9" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="square"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="square"/>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'cookie_consent'
const visible = ref(false)
const showDetail = ref(false)

onMounted(() => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(() => { visible.value = true }, 800)
  }
})

function accept() {
  localStorage.setItem(STORAGE_KEY, 'accepted')
  visible.value = false
}

function decline() {
  localStorage.setItem(STORAGE_KEY, 'declined')
  visible.value = false
}
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: stretch;
  gap: 0;
  background: #FAF8F5;
  border: 3px solid #1A1A1A;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  max-width: 620px;
  width: calc(100vw - 48px);
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
}

/* 左侧黄色色条 */
.cookie-accent {
  width: 8px;
  flex-shrink: 0;
  background: #FFD600;
  border-right: 3px solid #1A1A1A;
}

/* 内容主体 */
.cookie-body {
  flex: 1;
  padding: 14px 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* 标题行 */
.cookie-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cookie-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.cookie-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  color: #1A1A1A;
  text-transform: uppercase;
}

/* 说明文字 */
.cookie-desc {
  font-size: 10px;
  font-weight: 600;
  color: #1A1A1A99;
  line-height: 1.6;
  margin: 0;
  letter-spacing: 0.02em;
}

.cookie-link {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  font-weight: 800;
  color: #1A1A1A;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  margin-left: 4px;
}

.cookie-link:hover { color: #2979FF; }

/* 详情展开 */
.cookie-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 2px solid #1A1A1A20;
  padding-top: 8px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.detail-tag {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 6px;
  border: 2px solid #1A1A1A;
}

.detail-tag--required {
  background: #1A1A1A;
  color: #FAF8F5;
}

.detail-tag--analytics {
  background: #FFD600;
  color: #1A1A1A;
}

.detail-text {
  font-size: 9px;
  font-weight: 600;
  color: #1A1A1A80;
  line-height: 1.5;
}

/* 操作按钮组 */
.cookie-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  justify-content: center;
  flex-shrink: 0;
  border-left: 3px solid #1A1A1A;
}

.cookie-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 8px 16px;
  border: 2px solid #1A1A1A;
  cursor: pointer;
  white-space: nowrap;
  transition: box-shadow 0.1s, transform 0.1s;
}

.cookie-btn--accept {
  background: #1A1A1A;
  color: #FFD600;
  box-shadow: 3px 3px 0 0 #FFD600;
}

.cookie-btn--accept:hover {
  box-shadow: 5px 5px 0 0 #FFD600;
  transform: translate(-1px, -1px);
}

.cookie-btn--accept:active {
  box-shadow: none;
  transform: translate(3px, 3px);
}

.cookie-btn--decline {
  background: #FAF8F5;
  color: #1A1A1A60;
  box-shadow: 3px 3px 0 0 #1A1A1A30;
}

.cookie-btn--decline:hover {
  color: #1A1A1A;
  box-shadow: 3px 3px 0 0 #1A1A1A;
}

/* 关闭按钮 */
.cookie-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  opacity: 0.35;
  transition: opacity 0.1s, border-color 0.1s;
}

.cookie-close:hover {
  opacity: 1;
  border-color: #1A1A1A;
  background: #FFD60030;
}

/* 进场动画 */
.cookie-slide-enter-active {
  transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cookie-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.cookie-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(24px);
}
.cookie-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

/* 详情展开动画 */
.detail-expand-enter-active,
.detail-expand-leave-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  overflow: hidden;
  max-height: 200px;
}
.detail-expand-enter-from,
.detail-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* 移动端适配 */
@media (max-width: 540px) {
  .cookie-banner {
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    transform: none;
    border-left: none;
    border-right: none;
    border-bottom: none;
    border-radius: 0;
    box-shadow: 0 -4px 0 0 #1A1A1A;
  }
  .cookie-slide-enter-from {
    transform: translateY(100%);
    opacity: 0;
  }
  .cookie-slide-leave-to {
    transform: translateY(20px);
    opacity: 0;
  }
  .cookie-actions {
    flex-direction: row;
    border-left: none;
    border-top: 3px solid #1A1A1A;
    padding: 10px 12px;
  }
  .cookie-btn {
    flex: 1;
    text-align: center;
  }
}
</style>
