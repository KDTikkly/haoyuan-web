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
          class="w-14 h-14 flex items-center justify-center border-[3px] border-ink mb-6 text-2xl font-bold"
          :style="{ background: resume.color }"
        >{{ resume.icon }}</div>

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
    icon: '◈',
    color: '#FFD600',
    title: '通用 / 商业运营版',
    short: '通用',
    desc: '涵盖商科运营、市场推广、活动策划及数据分析等综合背景，适合投递互联网产品、运营类及商业分析岗位。',
    file: '/resumes/resume-general.pdf'
  },
  {
    id: 'game',
    icon: '◉',
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
