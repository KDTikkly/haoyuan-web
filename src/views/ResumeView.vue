<template>
  <div class="max-w-6xl mx-auto px-6 py-16">

    <!-- ── Page Header ── -->
    <div class="mb-16 border-b-[3px] border-ink pb-8">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-yellow">
        <span class="w-2 h-2 rounded-full bg-ink"></span>
        RESUME
      </div>
      <h1 class="font-display font-extrabold text-5xl mb-3">Resume Hub</h1>
      <p class="font-mono text-sm text-ink/60 tracking-widest uppercase">
        选择适合场景的简历版本
      </p>
    </div>

    <!-- ── Dual Resume Cards ── -->
    <div class="grid md:grid-cols-2 gap-8 mb-16">
      <div
        v-for="resume in resumes"
        :key="resume.id"
        class="
          border-[3px] border-ink p-8 flex flex-col bg-warm-beige
          shadow-[5px_5px_0_0_#1A1A1A]
        "
      >
        <!-- Icon badge -->
        <div
          class="w-14 h-14 flex items-center justify-center border-[3px] border-ink mb-6"
          :style="{ background: resume.color }"
          v-html="resume.icon"
        ></div>

        <h2 class="font-display font-extrabold text-2xl mb-2">{{ resume.title }}</h2>
        <p class="text-sm text-ink/70 leading-relaxed mb-6 flex-1">{{ resume.desc }}</p>

        <!-- Hard-shadow button -->
        <button
          class="
            w-full px-6 py-3
            font-display font-bold text-base
            border-[3px] border-ink
            transition-[transform,box-shadow] duration-150
            shadow-[5px_5px_0_0_#1A1A1A]
            hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]
            active:shadow-none active:translate-x-[5px] active:translate-y-[5px]
          "
          @click="downloadResume(resume)"
        >↓ 下载 {{ resume.short }} 版简历</button>
      </div>
    </div>

    <!-- ── Memphis Divider ── -->
    <div class="flex items-center gap-4 mb-16">
      <div class="flex-1 h-[3px] bg-ink"></div>
      <div class="flex gap-2">
        <span class="w-4 h-4 bg-memphis-yellow border-2 border-ink inline-block rotate-45"></span>
        <span class="w-4 h-4 bg-memphis-coral border-2 border-ink rounded-full inline-block"></span>
        <span class="w-4 h-4 bg-memphis-blue border-2 border-ink inline-block"></span>
      </div>
      <div class="flex-1 h-[3px] bg-ink"></div>
    </div>

    <!-- ── Skills Snapshot ── -->
    <div class="border-[3px] border-ink p-8 shadow-[5px_5px_0_0_#1A1A1A] bg-warm-beige">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-mint">
        <span class="w-2 h-2 rounded-full bg-ink"></span>
        SKILLS
      </div>
      <h2 class="font-display font-extrabold text-2xl mb-6">核心技能 &amp; 背景</h2>
      <div class="grid sm:grid-cols-2 gap-8">
        <div v-for="skill in skills" :key="skill.category">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 inline-block border-2 border-ink" :style="{ background: skill.color }"></span>
            <h3 class="font-mono font-bold text-xs uppercase tracking-widest">{{ skill.category }}</h3>
          </div>
          <ul class="space-y-1.5">
            <li v-for="item in skill.items" :key="item" class="flex items-center gap-2 text-sm text-ink/70">
              <span class="flex-shrink-0 w-1.5 h-1.5 border border-ink" :style="{ background: skill.color }"></span>
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
function downloadResume(resume) {
  const a = document.createElement('a')
  a.href = resume.file
  a.download = resume.file.split('/').pop()
  a.click()
}

const resumes = [
  {
    id: 'general',
    // 通用/商务版：叠层文件 + 右上角趋势箭头，传达策略/分析感
    icon: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 底层文件 -->
      <rect x="4" y="6" width="14" height="17" stroke="#1A1A1A" stroke-width="2.5"/>
      <!-- 顶层文件（偏移叠压） -->
      <rect x="8" y="2" width="14" height="17" fill="#FFD600" stroke="#1A1A1A" stroke-width="2.5"/>
      <!-- 文字线条 -->
      <line x1="11" y1="8"  x2="19" y2="8"  stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
      <line x1="11" y1="12" x2="19" y2="12" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
      <line x1="11" y1="16" x2="16" y2="16" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    color: '#FFD600',
    title: '通用 / 商业运营版',
    short: '通用',
    desc: '涵盖商科运营、市场推广、活动策划及数据分析等综合背景，适合投递互联网产品、运营类及商业分析岗位。',
    file: '/resumes/resume-general.pdf'
  },
  {
    id: 'game',
    // 游戏版：完整手柄剪影（机体+握把+D-Pad+AB），与导航图标呼应
    icon: `<svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 主机体 -->
      <path d="M6 4 L22 4 L22 14 L20 18 L8 18 L6 14 Z" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- 左握把 -->
      <path d="M6 14 L4 17 L3 21 L7 21 L8 18" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/>
      <!-- 右握把 -->
      <path d="M22 14 L24 17 L25 21 L21 21 L20 18" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/>
      <!-- D-Pad 竖 -->
      <line x1="9" y1="8"  x2="9" y2="14" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
      <!-- D-Pad 横 -->
      <line x1="6" y1="11" x2="12" y2="11" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round"/>
      <!-- A 按钮（实心） -->
      <circle cx="21" cy="9"  r="2" fill="#1A1A1A"/>
      <!-- B 按钮（空心） -->
      <circle cx="17" cy="13" r="2" stroke="#1A1A1A" stroke-width="2"/>
      <!-- START 按钮（小横线） -->
      <line x1="12.5" y1="11" x2="15.5" y2="11" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    color: '#2979FF',
    title: '游戏行业特化版',
    short: '游戏',
    desc: '深度聚焦游戏产品策划、养成体系拆解与玩家运营，结合 Web3 及 AI 游戏融合经历，适配游戏公司投递。',
    file: '/resumes/resume-game.pdf'
  }
]

const skills = [
  {
    category: 'Product & Strategy',
    color: '#FFD600',
    items: ['游戏养成体系设计', '用户生命周期管理', 'PRD / BRD 撰写', '竞品分析']
  },
  {
    category: 'Engineering & AI',
    color: '#2979FF',
    items: ['Python (ML/DL)', 'Vue 3 + Go', 'LLM Agent 开发', 'AIGC 内容生产']
  },
  {
    category: 'Data & Analytics',
    color: '#00E5A0',
    items: ['LSTM 时序预测', 'SQL / Pandas', '数据可视化', '量化回测']
  },
  {
    category: 'Operations',
    color: '#FF6B6B',
    items: ['IP 线下活动全链路', '社群运营', '供应商管理', '项目管理 (PMP)']
  }
]
</script>
