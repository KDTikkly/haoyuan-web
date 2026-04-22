<template>
  <!--
    LangToggle.vue v2
    左右分段按钮：[ZH] [EN]，孟菲斯硬阴影，激活侧实心填充
  -->
  <div class="lang-seg" role="group" :aria-label="$t('lang.toggle_label')">
    <button
      class="seg-btn seg-left"
      :class="{ active: !isEn }"
      @click="setLocale('zh')"
    >ZH</button>
    <button
      class="seg-btn seg-right"
      :class="{ active: isEn }"
      @click="setLocale('en')"
    >EN</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toggleLocale } from '@/i18n'

const { locale } = useI18n()
const isEn = computed(() => locale.value === 'en')

function setLocale(lang: 'zh' | 'en') {
  if (locale.value !== lang) toggleLocale()
}
</script>

<style scoped>
.lang-seg {
  display: inline-flex;
  border: 3px solid #1A1A1A;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  border-radius: 0;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  user-select: none;
  transition: box-shadow 0.12s ease, transform 0.12s ease;
}

.lang-seg:active {
  box-shadow: 2px 2px 0 0 #1A1A1A;
  transform: translate(2px, 2px);
}

.seg-btn {
  padding: 4px 10px;
  background: #FAF8F5;
  color: #1A1A1A;
  border: none;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.12s ease, color 0.12s ease;
  outline: none;
}

/* 中间分隔线 */
.seg-left {
  border-right: 2px solid #1A1A1A;
}

/* 激活状态：实心黑底白字 */
.seg-btn.active {
  background: #1A1A1A;
  color: #FAF8F5;
}

.seg-btn:not(.active):hover {
  background: #F0EDE8;
}
</style>
