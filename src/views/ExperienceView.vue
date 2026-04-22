<template>
  <div class="max-w-6xl mx-auto px-6 py-16">

    <!-- ── Page Header ── -->
    <div class="mb-16 border-b-[3px] border-ink pb-8">
      <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs mb-6 bg-memphis-coral text-warm-white">
        <span class="w-2 h-2 rounded-full bg-warm-white"></span>
        {{ $t('experience.badge') }}
      </div>
      <h1 class="font-display font-extrabold text-5xl mb-3">{{ $t('experience.title') }}</h1>
      <p class="font-mono text-sm text-ink/60 tracking-widest uppercase">
        {{ $t('experience.subtitle') }}
      </p>
    </div>

    <!-- ── Education Section (TOP) ── -->
    <div class="mb-20">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-8 h-8 border-[3px] border-ink bg-memphis-yellow flex items-center justify-center font-bold">
          ◈
        </div>
        <h2 class="font-display font-extrabold text-3xl">{{ $t('experience.edu_title') }}</h2>
      </div>

      <div class="space-y-5">
        <div
          v-for="edu in education"
          :key="edu.school.zh"
          class="
            flex flex-wrap items-start justify-between gap-6
            border-[3px] border-ink p-6
            shadow-[5px_5px_0_0_#1A1A1A]
            hover:shadow-[3px_3px_0_0_#1A1A1A]
            hover:translate-x-[2px] hover:translate-y-[2px]
            transition-[transform,box-shadow] duration-150
            bg-warm-beige
          "
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <span
                class="px-2 py-0.5 font-mono text-[10px] font-bold border-2 border-ink"
                :style="{ backgroundColor: edu.color }"
              >{{ edu.degreeType }}</span>
            </div>
            <h3 class="font-display font-bold text-xl leading-tight">
              {{ locale === 'en' ? edu.school.en : edu.school.zh }}
            </h3>
            <p class="font-mono text-sm text-ink/70 mt-1">
              {{ locale === 'en' ? edu.degree.en : edu.degree.zh }}
            </p>
            <p class="text-sm text-ink/55 mt-2 leading-relaxed">
              {{ locale === 'en' ? edu.desc.en : edu.desc.zh }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-2 flex-shrink-0">
            <span class="font-mono text-xs text-ink/50">{{ edu.period }}</span>
            <div
              class="w-10 h-10 border-[3px] border-ink flex items-center justify-center font-bold text-lg"
              :style="{ backgroundColor: edu.color }"
            >{{ edu.icon }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Work / Internship Timeline ── -->
    <div class="mb-4">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-8 h-8 border-[3px] border-ink bg-memphis-coral flex items-center justify-center font-bold">
          ◉
        </div>
        <h2 class="font-display font-extrabold text-3xl">{{ $t('experience.work_title') }}</h2>
      </div>
    </div>

    <div class="relative">
      <!-- 竖线 -->
      <div class="absolute left-[22px] top-0 bottom-0 w-[3px] bg-ink"></div>

      <div class="space-y-12">
        <div
          v-for="(exp, i) in experiences"
          :key="i"
          class="relative pl-16 group"
        >
          <!-- 时间轴圆点 -->
          <div
            class="
              absolute left-0 top-1
              w-11 h-11 flex items-center justify-center
              border-[3px] border-ink font-bold text-sm
              transition-[transform,box-shadow] duration-150
              shadow-[3px_3px_0_0_#1A1A1A]
              group-hover:shadow-none group-hover:translate-x-[3px] group-hover:translate-y-[3px]
            "
            :style="{ backgroundColor: exp.color }"
          >
            {{ exp.icon }}
          </div>

          <!-- 卡片 -->
          <div
            class="
              border-[3px] border-ink p-6
              shadow-[5px_5px_0_0_#1A1A1A]
              transition-[transform,box-shadow] duration-150
              hover:shadow-[3px_3px_0_0_#1A1A1A]
              hover:translate-x-[2px] hover:translate-y-[2px]
              bg-warm-beige
            "
          >
            <!-- 顶部：公司 + 时间 -->
            <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 class="font-display font-extrabold text-xl text-ink leading-tight">
                  {{ locale === 'en' ? exp.title.en : exp.title.zh }}
                </h2>
                <p class="font-mono text-sm text-ink/70 mt-0.5">
                  {{ locale === 'en' ? exp.company.en : exp.company.zh }}
                  <span class="mx-2 text-ink/30">·</span>
                  {{ locale === 'en' ? exp.location.en : exp.location.zh }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span
                  class="px-2.5 py-0.5 font-mono text-xs font-bold border-2 border-ink"
                  :style="{ backgroundColor: exp.color }"
                >
                  {{ locale === 'en' ? exp.type.en : exp.type.zh }}
                </span>
                <span class="font-mono text-xs text-ink/50">{{ exp.period }}</span>
              </div>
            </div>

            <!-- 描述 -->
            <p class="text-sm text-ink/80 leading-relaxed mb-5">
              {{ locale === 'en' ? exp.desc.en : exp.desc.zh }}
            </p>

            <!-- 亮点 bullet -->
            <ul class="space-y-2 mb-5">
              <li
                v-for="(point, j) in (locale === 'en' ? exp.highlights.en : exp.highlights.zh)"
                :key="j"
                class="flex items-start gap-3 text-sm text-ink/80"
              >
                <span
                  class="mt-1.5 flex-shrink-0 w-2 h-2 border-2 border-ink"
                  :style="{ backgroundColor: exp.color }"
                ></span>
                {{ point }}
              </li>
            </ul>

            <!-- 技能 tags -->
            <div class="flex flex-wrap gap-2 pt-4 border-t-2 border-ink/20">
              <span
                v-for="skill in exp.skills"
                :key="skill"
                class="px-2 py-0.5 font-mono text-[11px] font-bold border-2 border-ink bg-warm-white"
              >{{ skill }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// ── Education (bilingual, real data) ──
const education = [
  {
    icon: '🎓',
    color: '#A78BFA',
    degreeType: 'MSc',
    school: {
      zh: '香港城市大学',
      en: 'City University of Hong Kong',
    },
    degree: {
      zh: '理学硕士 · 创新创业—风险投资方向',
      en: 'MSc Venture Creation (Innovation & Entrepreneurship)',
    },
    period: '2026.01 — 2028.06',
    desc: {
      zh: '聚焦创业生态系统、风险投资估值与 DeepTech 商业化路径，培养跨境创业与融资能力。',
      en: 'Focused on startup ecosystems, VC valuation frameworks, and DeepTech commercialization pathways to develop cross-border entrepreneurship and fundraising capabilities.',
    },
  },
  {
    icon: '🏛',
    color: '#34D399',
    degreeType: 'BM',
    school: {
      zh: '深圳技术大学',
      en: 'Shenzhen Technology University',
    },
    degree: {
      zh: '管理学学士 · 国际商务—金融方向',
      en: 'BM International Business (Finance Track)',
    },
    period: '2021.09 — 2025.06',
    desc: {
      zh: '主修国际贸易、金融分析与跨文化管理，辅修数据科学应用，具备扎实的定量分析与商业建模基础。',
      en: 'Major in international trade, financial analysis, and cross-cultural management; minor in data science applications. Strong foundation in quantitative analysis and business modeling.',
    },
  },
]

// ── Work / Internship experiences (bilingual, real data skeleton) ──
const experiences = [
  {
    icon: '⚗',
    color: '#FCD34D',
    title: {
      zh: '科研项目管理助理',
      en: 'Research Project Management Assistant',
    },
    company: {
      zh: '深圳技术大学工程物理学院',
      en: 'College of Engineering Physics, SZTU',
    },
    location: { zh: '深圳', en: 'Shenzhen' },
    type: { zh: '实习', en: 'Internship' },
    period: '2023.xx — 2024.xx',
    desc: {
      zh: '协助工程物理学院科研团队进行多项目并行管理，跟踪研究进度、整理技术文档，确保项目交付节点按时达成。',
      en: 'Supported multi-project parallel management for the College of Engineering Physics research team, tracking research milestones, organizing technical documentation, and ensuring on-time delivery.',
    },
    highlights: {
      zh: [
        '统筹 3 项在研项目的里程碑追踪，协调跨部门资源协作',
        '整理标准化项目文档模板，文档归档效率提升 30%',
        '输出月度进度报告，辅助导师进行项目评审汇报',
      ],
      en: [
        'Coordinated milestone tracking across 3 concurrent research projects with cross-department resource alignment',
        'Standardized project documentation templates, improving archiving efficiency by 30%',
        'Produced monthly progress reports to support supervisor review presentations',
      ],
    },
    skills: ['项目管理', 'Project Management', 'Excel', '文档撰写', 'Research'],
  },
  {
    icon: '📡',
    color: '#60A5FA',
    title: {
      zh: '市场研究实习生',
      en: 'Market Research Intern',
    },
    company: {
      zh: '深圳市启悦光电有限公司',
      en: 'Shenzhen Qiyue Optoelectronics Co., Ltd.',
    },
    location: { zh: '深圳', en: 'Shenzhen' },
    type: { zh: '实习', en: 'Internship' },
    period: '2023.xx — 2023.xx',
    desc: {
      zh: '针对光电行业细分市场开展竞品调研与客户需求分析，输出市场洞察报告，支持销售与产品决策。',
      en: 'Conducted competitive research and customer needs analysis in the optoelectronics sector, producing market insight reports to support sales and product decisions.',
    },
    highlights: {
      zh: [
        '完成 5 份细分市场竞品分析报告，覆盖国内外主要竞争对手定价与技术差异',
        '整理客户访谈摘要，提炼 3 个高优先级产品改进方向',
        '协助建立市场情报数据库，缩短信息检索时间 50%',
      ],
      en: [
        'Delivered 5 competitive analysis reports covering domestic and international pricing/technology differentials',
        'Synthesized customer interview summaries, identifying 3 high-priority product improvement directions',
        'Helped build a market intelligence database, reducing information retrieval time by 50%',
      ],
    },
    skills: ['市场调研', 'Competitive Analysis', 'Excel', '数据可视化', 'Report Writing'],
  },
  {
    icon: '🏦',
    color: '#F87171',
    title: {
      zh: '综合营业部实习生',
      en: 'General Business Dept. Intern',
    },
    company: {
      zh: '中国银行',
      en: 'Bank of China',
    },
    location: { zh: '深圳', en: 'Shenzhen' },
    type: { zh: '实习', en: 'Internship' },
    period: '2022.xx — 2022.xx',
    desc: {
      zh: '在综合营业部参与日常客户服务与金融产品推介工作，积累金融行业合规知识与客户沟通技巧。',
      en: 'Participated in daily customer service and financial product promotion at the general operations desk, building compliance knowledge and client communication skills.',
    },
    highlights: {
      zh: [
        '每日服务 50+ 客户，处理基础存贷款、汇款及理财咨询需求',
        '协助 KYC 合规审核，熟悉银行业务流程与风控规范',
        '完成内部金融产品培训，通过考核并获优秀实习评价',
      ],
      en: [
        'Served 50+ customers daily, handling deposits, remittances, and wealth management inquiries',
        'Assisted with KYC compliance reviews, gaining familiarity with banking workflows and risk control standards',
        'Completed internal financial product training and received excellent intern evaluation',
      ],
    },
    skills: ['金融合规', 'Customer Service', 'KYC', '银行业务', 'Communication'],
  },
]
</script>
