<template>
  <!--
    MemphisAccordion.vue — 三级折叠菜单
    数据结构：
      sections[]                → 一级（大分类）
        .items[]                → 二级（机构/公司）
          .details[]            → 三级（具体内容块）

    Props:
      sections  AccordionSection[]  — 完整数据
      accent    string              — 强调色（默认 memphis-yellow #FFD600）
  -->
  <div class="accordion-root">
    <!-- ══ 一级：大分类 ══ -->
    <div
      v-for="(section, si) in sections"
      :key="si"
      class="accordion-l1"
      :class="{ 'accordion-l1--open': openL1 === si }"
    >
      <!-- 一级头部 -->
      <button
        class="accordion-l1-header"
        :style="openL1 === si ? { background: accent, borderColor: INK } : {}"
        @click="toggleL1(si)"
        :aria-expanded="openL1 === si"
      >
        <!-- 左侧图标 + 文案 -->
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="l1-icon"
            :style="openL1 === si ? { background: INK, color: accent } : { background: accent }"
          >{{ section.icon ?? '◈' }}</span>
          <div class="min-w-0">
            <div class="l1-title">{{ section.title }}</div>
            <div v-if="section.subtitle" class="l1-sub">{{ section.subtitle }}</div>
          </div>
        </div>
        <!-- 右侧指示器 -->
        <span class="l1-indicator" :class="{ 'l1-indicator--open': openL1 === si }">
          {{ openL1 === si ? '−' : '+' }}
        </span>
      </button>

      <!-- 一级内容展开 -->
      <div
        class="accordion-l1-body"
        :class="{ 'accordion-l1-body--open': openL1 === si }"
      >
        <div class="l1-body-inner">

          <!-- ══ 二级：机构/公司 ══ -->
          <div
            v-for="(item, ii) in section.items"
            :key="ii"
            class="accordion-l2"
            :class="{ 'accordion-l2--open': isL2Open(si, ii) }"
          >
            <!-- 二级头部 -->
            <button
              class="accordion-l2-header"
              :style="isL2Open(si, ii) ? { background: item.color ?? '#F5F0E8' } : {}"
              @click="toggleL2(si, ii)"
              :aria-expanded="isL2Open(si, ii)"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <!-- 左侧色块徽标 -->
                <span
                  class="l2-dot"
                  :style="{ background: item.color ?? accent, borderColor: INK }"
                ></span>
                <div class="min-w-0 flex-1">
                  <div class="l2-title">{{ item.name }}</div>
                  <div class="l2-meta">
                    <span v-if="item.role" class="l2-role">{{ item.role }}</span>
                    <span v-if="item.role && item.period" class="l2-sep">·</span>
                    <span v-if="item.period" class="l2-period">{{ item.period }}</span>
                  </div>
                </div>
              </div>
              <!-- 右侧标签 + 指示器 -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <span
                  v-if="item.tag"
                  class="l2-tag"
                  :style="{ background: item.color ?? accent }"
                >{{ item.tag }}</span>
                <span class="l2-indicator" :class="{ 'l2-indicator--open': isL2Open(si, ii) }">
                  {{ isL2Open(si, ii) ? '−' : '+' }}
                </span>
              </div>
            </button>

            <!-- 二级内容展开 -->
            <div
              class="accordion-l2-body"
              :class="{ 'accordion-l2-body--open': isL2Open(si, ii) }"
            >
              <div class="l2-body-inner">

                <!-- ══ 三级：详情块 ══ -->
                <div
                  v-for="(detail, di) in item.details"
                  :key="di"
                  class="accordion-l3"
                  :class="{ 'accordion-l3--open': isL3Open(si, ii, di), 'accordion-l3--plain': !detail.collapsible }"
                >
                  <!-- 如果三级可折叠 -->
                  <template v-if="detail.collapsible">
                    <button
                      class="accordion-l3-header"
                      @click="toggleL3(si, ii, di)"
                      :aria-expanded="isL3Open(si, ii, di)"
                    >
                      <span class="l3-bullet" :style="{ background: item.color ?? accent }"></span>
                      <span class="l3-title">{{ detail.title }}</span>
                      <span class="l3-indicator">{{ isL3Open(si, ii, di) ? '▲' : '▼' }}</span>
                    </button>
                    <div
                      class="accordion-l3-body"
                      :class="{ 'accordion-l3-body--open': isL3Open(si, ii, di) }"
                    >
                      <div class="l3-body-inner">
                        <!-- 纯文本 -->
                        <p v-if="detail.text" class="l3-text">{{ detail.text }}</p>
                        <!-- 列表 -->
                        <ul v-if="detail.bullets?.length" class="l3-list">
                          <li
                            v-for="(b, bi) in detail.bullets"
                            :key="bi"
                            class="l3-list-item"
                          >
                            <span class="l3-list-dot" :style="{ background: item.color ?? accent }"></span>
                            {{ b }}
                          </li>
                        </ul>
                        <!-- 技能 tags -->
                        <div v-if="detail.tags?.length" class="l3-tags">
                          <span
                            v-for="(t, ti) in detail.tags"
                            :key="ti"
                            class="l3-tag"
                          >{{ t }}</span>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- 三级不折叠（直接展示） -->
                  <template v-else>
                    <div class="l3-plain">
                      <div class="l3-plain-header">
                        <span class="l3-bullet" :style="{ background: item.color ?? accent }"></span>
                        <span class="l3-title">{{ detail.title }}</span>
                      </div>
                      <p v-if="detail.text" class="l3-text l3-text--plain">{{ detail.text }}</p>
                      <ul v-if="detail.bullets?.length" class="l3-list l3-list--plain">
                        <li
                          v-for="(b, bi) in detail.bullets"
                          :key="bi"
                          class="l3-list-item"
                        >
                          <span class="l3-list-dot" :style="{ background: item.color ?? accent }"></span>
                          {{ b }}
                        </li>
                      </ul>
                      <div v-if="detail.tags?.length" class="l3-tags">
                        <span
                          v-for="(t, ti) in detail.tags"
                          :key="ti"
                          class="l3-tag"
                        >{{ t }}</span>
                      </div>
                    </div>
                  </template>
                </div>
                <!-- /三级 -->

              </div>
            </div>
            <!-- /二级内容 -->
          </div>
          <!-- /二级 -->

        </div>
      </div>
      <!-- /一级内容 -->
    </div>
    <!-- /一级 -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// ── 类型定义 ──────────────────────────────────────────────────────────────────
export interface AccordionDetail {
  title: string
  text?: string
  bullets?: string[]
  tags?: string[]
  collapsible?: boolean   // 默认 false（直接展开显示）
}

export interface AccordionItem {
  name: string
  role?: string
  period?: string
  tag?: string            // 右侧徽标文字（如 "实习" / "社团"）
  color?: string          // 二级/三级强调色
  details: AccordionDetail[]
}

export interface AccordionSection {
  title: string
  subtitle?: string
  icon?: string
  items: AccordionItem[]
}

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  sections: AccordionSection[]
  accent?: string
}>(), {
  accent: '#FFD600',
})

const INK = '#1A1A1A'

// ── 展开状态 ──────────────────────────────────────────────────────────────────
// 一级：同一时间只开一个（Exclusive）
const openL1 = ref<number | null>(null)

// 二级：Map key = "si-ii"，允许多开
const openL2 = ref<Set<string>>(new Set())

// 三级：Map key = "si-ii-di"，允许多开
const openL3 = ref<Set<string>>(new Set())

function toggleL1(si: number) {
  openL1.value = openL1.value === si ? null : si
}

function l2Key(si: number, ii: number) { return `${si}-${ii}` }
function l3Key(si: number, ii: number, di: number) { return `${si}-${ii}-${di}` }

function isL2Open(si: number, ii: number) { return openL2.value.has(l2Key(si, ii)) }
function isL3Open(si: number, ii: number, di: number) { return openL3.value.has(l3Key(si, ii, di)) }

function toggleL2(si: number, ii: number) {
  const k = l2Key(si, ii)
  if (openL2.value.has(k)) openL2.value.delete(k)
  else openL2.value.add(k)
}

function toggleL3(si: number, ii: number, di: number) {
  const k = l3Key(si, ii, di)
  if (openL3.value.has(k)) openL3.value.delete(k)
  else openL3.value.add(k)
}
</script>

<style scoped>
/* ════════════════════════════════════════════
   根容器
═══════════════════════════════════════════ */
.accordion-root {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ════════════════════════════════════════════
   一级
═══════════════════════════════════════════ */
.accordion-l1 {
  border: 3px solid #1A1A1A;
  margin-bottom: 16px;
  box-shadow: 6px 6px 0 0 #1A1A1A;
  transition: box-shadow 0.15s, transform 0.15s;
}
.accordion-l1--open {
  box-shadow: 3px 3px 0 0 #1A1A1A;
  transform: translate(3px, 3px);
}

.accordion-l1-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #FAF8F5;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 12px;
  transition: background 0.2s;
}
.accordion-l1-header:hover {
  background: #F5F0E8;
}

.l1-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #1A1A1A;
  font-size: 16px;
  font-weight: 900;
  transition: background 0.2s, color 0.2s;
}

.l1-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1A1A1A;
  line-height: 1.2;
}

.l1-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #1A1A1A80;
  margin-top: 2px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.l1-indicator {
  flex-shrink: 0;
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 1;
  width: 28px;
  text-align: center;
  transition: transform 0.2s;
}
.l1-indicator--open {
  transform: none;
}

/* 折叠动画 */
.accordion-l1-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 0px solid #1A1A1A;
}
.accordion-l1-body--open {
  grid-template-rows: 1fr;
  border-top-width: 3px;
}

.l1-body-inner {
  overflow: hidden;
  padding: 0;
}
.accordion-l1-body--open .l1-body-inner {
  padding: 16px;
}

/* ════════════════════════════════════════════
   二级
═══════════════════════════════════════════ */
.accordion-l2 {
  border: 3px solid #1A1A1A;
  margin-bottom: 10px;
  background: #FAF8F5;
  box-shadow: 4px 4px 0 0 #1A1A1A;
  transition: box-shadow 0.15s, transform 0.15s;
}
.accordion-l2:last-child { margin-bottom: 0; }
.accordion-l2--open {
  box-shadow: 2px 2px 0 0 #1A1A1A;
  transform: translate(2px, 2px);
}

.accordion-l2-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 8px;
  transition: background 0.2s;
}
.accordion-l2-header:hover {
  background: #F5F0E830;
}

.l2-dot {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 2px solid #1A1A1A;
  display: block;
}

.l2-title {
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.l2-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.l2-role {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #1A1A1A90;
  font-weight: 600;
}
.l2-sep {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #1A1A1A40;
}
.l2-period {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #1A1A1A60;
}

.l2-tag {
  flex-shrink: 0;
  padding: 1px 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  border: 2px solid #1A1A1A;
  color: #1A1A1A;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.l2-indicator {
  flex-shrink: 0;
  font-family: 'Space Grotesk', Inter, sans-serif;
  font-size: 18px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 1;
  width: 22px;
  text-align: center;
}
.l2-indicator--open { color: #1A1A1A; }

.accordion-l2-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 0px solid #1A1A1A30;
}
.accordion-l2-body--open {
  grid-template-rows: 1fr;
  border-top-width: 2px;
}

.l2-body-inner {
  overflow: hidden;
  padding: 0;
}
.accordion-l2-body--open .l2-body-inner {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ════════════════════════════════════════════
   三级
═══════════════════════════════════════════ */
.accordion-l3 {
  border-left: 3px solid #1A1A1A;
  padding-left: 12px;
}
.accordion-l3--plain {
  border-left-color: #1A1A1A30;
}

.accordion-l3-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}
.accordion-l3-header:hover .l3-title {
  text-decoration: underline;
}

.l3-bullet {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border: 2px solid #1A1A1A;
  display: block;
}

.l3-title {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.4;
}

.l3-indicator {
  flex-shrink: 0;
  font-size: 9px;
  color: #1A1A1A60;
  font-family: 'JetBrains Mono', monospace;
}

.accordion-l3-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s ease;
}
.accordion-l3-body--open {
  grid-template-rows: 1fr;
}

.l3-body-inner {
  overflow: hidden;
  padding: 0;
}
.accordion-l3-body--open .l3-body-inner {
  padding: 6px 0 10px 16px;
}

/* Plain 三级（不折叠） */
.l3-plain { padding: 4px 0 8px; }
.l3-plain-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

/* 内容样式 */
.l3-text {
  font-family: Inter, sans-serif;
  font-size: 13px;
  color: #1A1A1A90;
  line-height: 1.65;
  margin: 0 0 6px;
}
.l3-text--plain { padding-left: 16px; }

.l3-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.l3-list--plain { padding-left: 16px; }
.l3-list-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-family: Inter, sans-serif;
  font-size: 13px;
  color: #1A1A1A80;
  line-height: 1.5;
}
.l3-list-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border: 1.5px solid #1A1A1A;
  margin-top: 5px;
}

.l3-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.l3-tag {
  padding: 1px 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  border: 2px solid #1A1A1A;
  background: #FAF8F5;
  color: #1A1A1A;
}
</style>
