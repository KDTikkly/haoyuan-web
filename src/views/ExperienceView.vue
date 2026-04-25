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

    <!-- ── 筛选栏 ── -->
    <div class="flex flex-wrap gap-2 mb-12">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="toggleFilter(f.key)"
        class="px-4 py-1.5 font-mono text-xs font-bold tracking-wide uppercase border-2 border-ink
               transition-[transform,box-shadow,background-color] duration-150"
        :class="activeFilter === f.key
          ? 'bg-ink text-warm-beige shadow-none translate-x-[3px] translate-y-[3px]'
          : 'bg-warm-beige text-ink shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'"
      >
        {{ locale === 'en' ? f.labelEn : f.label }}
      </button>
    </div>

    <!-- ── 教育区块 ── -->
    <section v-if="activeFilter === 'all' || activeFilter === 'education'" class="mb-20">
      <div class="flex items-center gap-4 mb-8">
        <!-- 图标 + 纵向点状连接线容器 -->
        <div class="relative flex flex-col items-center self-stretch">
          <div class="w-10 h-10 border-[3px] border-ink flex items-center justify-center font-bold text-lg
                      bg-memphis-yellow shadow-[4px_4px_0_0_#1A1A1A] flex-shrink-0">◈</div>
          <!-- 点状纵向连接线 -->
          <div class="flex-1 w-0 border-l-2 border-dashed border-memphis-yellow mt-2 min-h-[8px]"></div>
        </div>
        <div>
          <h2 class="font-display font-extrabold text-2xl leading-tight">
            {{ locale === 'en' ? 'Education' : '教育经历' }}
          </h2>
          <p class="font-mono text-xs text-ink/50 tracking-widest uppercase mt-0.5">
            {{ locale === 'en' ? 'Academic Background' : '学历背景' }}
          </p>
        </div>
        <div class="flex-1 h-[4px] bg-memphis-yellow"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          v-for="item in educationItems"
          :key="item.id"
          class="group relative border-[3px] border-ink bg-warm-beige overflow-hidden cursor-pointer
                 shadow-[5px_5px_0_0_#1A1A1A] min-h-[220px]
                 transition-[transform,box-shadow] duration-200
                 hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px]"
          @click="openItem(item)"
        >
          <!-- 右上角色块 -->
          <div
            class="absolute top-0 right-0 w-10 h-10 border-b-[3px] border-l-[3px] border-ink z-[2]"
            :style="{ background: item.color }"
          ></div>

          <div class="p-5 flex flex-col justify-between gap-3 h-full">
            <!-- 顶行：手机端纵向排列，sm以上横向 -->
            <div class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between pr-8">
              <span
                class="px-2 py-0.5 font-mono text-[12px] font-bold border-2 border-ink uppercase tracking-wider self-start"
                :style="{ background: item.color }"
              >
                {{ locale === 'en' ? item.type : item.typeCn }}
              </span>
              <!-- 时间戳：移至标题上方（手机端：type badge下、标题div之前） -->
              <span class="font-mono text-[11px] font-bold px-2 py-1 bg-ink text-warm-white shadow-[2px_2px_0_0_#555] self-start">
                {{ item.period }}
              </span>
            </div>
            <!-- 卡片标题 -->
            <div>
              <h3 class="font-display font-extrabold text-xl tracking-tight leading-tight mb-0.5">
                {{ locale === 'en' ? item.titleEn : item.title }}
              </h3>
              <p class="font-mono text-[12px] text-ink/60 uppercase tracking-wider">{{ locale === 'en' ? item.roleEn : item.role }}</p>
            </div>
            <!-- 正文：15px 1.65 行高，中文可读 -->
            <p class="border-t-2 border-ink/10 pt-3 flex-1 text-ink/65"
               style="font-size:15px; line-height:1.65;">
              {{ locale === 'en' ? item.shortDescEn : item.shortDesc }}
            </p>
            <!-- Tags：12px mono uppercase -->
            <div class="flex flex-wrap gap-1.5 mt-auto">
              <span
                v-for="t in item.tags.slice(0, 4)"
                :key="t"
                class="exp-tag px-2 py-0.5 font-mono text-[12px] border-[1.5px] border-ink/50 bg-warm-white text-ink/70
                       uppercase tracking-wider transition-colors duration-100 cursor-default"
                :style="{ '--tag-hover-bg': item.color } as any"
              >{{ t }}</span>
            </div>
            <!-- 查看详情提示 -->
            <div class="flex items-center justify-end gap-1 mt-1">
              <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider group-hover:text-ink/70 transition-colors">
                {{ locale === 'en' ? 'View details →' : '查看详情 →' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 实习区块 ── -->
    <section v-if="activeFilter === 'all' || activeFilter === 'internship'" class="mb-20">
      <div class="flex items-center gap-4 mb-8">
        <!-- 图标 + 纵向点状连接线 -->
        <div class="relative flex flex-col items-center self-stretch">
          <div class="w-10 h-10 border-[3px] border-ink flex items-center justify-center font-bold text-lg
                      bg-memphis-coral shadow-[4px_4px_0_0_#1A1A1A] flex-shrink-0">◉</div>
          <div class="flex-1 w-0 border-l-2 border-dashed border-memphis-coral mt-2 min-h-[8px]"></div>
        </div>
        <div>
          <h2 class="font-display font-extrabold text-2xl leading-tight">
            {{ locale === 'en' ? 'Internships' : '实习经历' }}
          </h2>
          <p class="font-mono text-xs text-ink/50 tracking-widest uppercase mt-0.5">
            {{ locale === 'en' ? 'Professional Experience' : '工作经历' }}
          </p>
        </div>
        <div class="flex-1 h-[4px] bg-memphis-coral"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          v-for="item in internshipItems"
          :key="item.id"
          class="group relative border-[3px] border-ink bg-warm-beige overflow-hidden cursor-pointer
                 shadow-[5px_5px_0_0_#1A1A1A] min-h-[220px]
                 transition-[transform,box-shadow] duration-200
                 hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px]"
          @click="openItem(item)"
        >
          <!-- 右上角色块 -->
          <div
            class="absolute top-0 right-0 w-10 h-10 border-b-[3px] border-l-[3px] border-ink z-[2]"
            :style="{ background: item.color }"
          ></div>

          <div class="p-5 flex flex-col gap-3 h-full">
            <div class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between pr-8">
              <span
                class="px-2 py-0.5 font-mono text-[12px] font-bold border-2 border-ink uppercase tracking-wider self-start"
                :style="{ background: item.color }"
              >
                {{ locale === 'en' ? item.type : item.typeCn }}
              </span>
              <!-- 时间戳：bg-ink text-white 高亮块 -->
              <span class="font-mono text-[11px] font-bold px-2 py-1 bg-ink text-warm-white shadow-[2px_2px_0_0_#555] self-start">
                {{ item.period }}
              </span>
            </div>
            <div>
              <h3 class="font-display font-extrabold text-xl tracking-tight leading-tight mb-0.5">
                {{ locale === 'en' ? item.titleEn : item.title }}
              </h3>
              <p class="font-mono text-[12px] text-ink/60 uppercase tracking-wider">{{ locale === 'en' ? item.roleEn : item.role }}</p>
            </div>
            <!-- 正文：15px 1.65 行高 -->
            <p class="border-t-2 border-ink/10 pt-3 flex-1 text-ink/65"
               style="font-size:15px; line-height:1.65;">
              {{ locale === 'en' ? item.shortDescEn : item.shortDesc }}
            </p>
            <!-- Tags：12px mono uppercase -->
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="t in item.tags.slice(0, 3)"
                :key="t"
                class="exp-tag px-2 py-0.5 font-mono text-[12px] border-[1.5px] border-ink/50 bg-warm-white text-ink/70
                       uppercase tracking-wider transition-colors duration-100 cursor-default"
                :style="{ '--tag-hover-bg': item.color } as any"
              >{{ t }}</span>
            </div>
            <div class="flex items-center justify-end gap-1">
              <span class="font-mono text-[9px] text-ink/40 uppercase tracking-wider group-hover:text-ink/70 transition-colors">
                {{ locale === 'en' ? 'View details →' : '查看详情 →' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- ── 侧滑详情面板 ── -->
  <ExperienceSlideOver
    :item="activeItem"
    :visible="!!activeItem"
    @close="activeItem = null"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ExperienceSlideOver from '@/components/ExperienceSlideOver.vue'
import type { ExperienceItem } from '@/components/ExperienceSlideOver.vue'

const { locale } = useI18n()

const activeItem   = ref<ExperienceItem | null>(null)
const activeFilter = ref<'all' | 'education' | 'internship'>('all')

function toggleFilter(key: 'all' | 'education' | 'internship') {
  activeFilter.value = activeFilter.value === key ? 'all' : key
}

const filters = [
  { key: 'all' as const,         label: '全部',   labelEn: 'All' },
  { key: 'education' as const,   label: '教育',   labelEn: 'Education' },
  { key: 'internship' as const,  label: '实习',   labelEn: 'Internship' },
]

// ─── Mock 数据结构 ────────────────────────────────────────────────────────────
// 字段说明：
//   id           — 唯一 ID
//   type/typeCn  — 显示在卡片 Tag 上
//   title/titleEn— 机构/公司名（卡片主标题）
//   role/roleEn  — 职位/学位
//   period       — 时间段
//   color        — 卡片强调色
//   shortDesc/En — 一句话简介（卡片展示）
//   bullets/En   — 详情面板 Bullet 列表
//   tags         — 技能标签
//   content_path — （可选）Markdown 文件路径
//   media        — （可选）媒体嵌入
//   links        — （可选）外部链接

interface ExpCard extends ExperienceItem {
  titleEn: string
  typeCn: string
  roleEn: string
  shortDescEn: string
  category: 'education' | 'internship'
  bulletsEn?: string[]
}

const allItems = computed<ExpCard[]>(() => [

  // ══ 教育 ══════════════════════════════════════════════════════════════════
  {
    id: 'cityu-msc',
    category: 'education',
    type: 'MSc', typeCn: '硕士',
    title: '香港城市大学', titleEn: 'City University of Hong Kong',
    organization: 'CityU',
    role: '理学硕士 · 创新创业—风险投资方向',
    roleEn: 'MSc Venture Creation (Innovation & Entrepreneurship)',
    period: '2026.01 — 2028.06',
    color: '#A78BFA',
    shortDesc: '聚焦创业生态系统、风险投资估值与 DeepTech 商业化路径，培养跨境创业与融资能力。',
    shortDescEn: 'Focused on startup ecosystems, VC valuation, and DeepTech commercialization.',
    bullets: [
      '风险投资与私募股权估值方法论（DCF、可比公司法、期权定价模型）',
      'DeepTech 产品商业化路径设计（从实验室到市场）',
      '跨境创业法律与合规框架（香港、内地、东南亚）',
      '天使轮/种子轮融资提案设计',
      '创业生态系统分析（GBA 创业政策、孵化器资源）',
    ],
    bulletsEn: [
      'VC & PE valuation: DCF, comps, option pricing models',
      'DeepTech commercialization: lab-to-market pathway design',
      'Cross-border startup legal & compliance (HK, Mainland, SEA)',
      'Angel/seed-round pitch deck structure and investor psychology',
      'GBA startup ecosystem analysis and incubator resource mapping',
    ],
    tags: ['VC Valuation', 'Startup Ecosystem', 'DeepTech', 'Pitch Deck', 'GBA'],
  },

  {
    id: 'sztu-bm',
    category: 'education',
    type: 'BM', typeCn: '学士',
    title: '深圳技术大学', titleEn: 'Shenzhen Technology University',
    organization: 'SZTU',
    role: '管理学学士 · 国际商务—金融方向',
    roleEn: 'BM International Business (Finance Track)',
    period: '2021.09 — 2025.06',
    color: '#34D399',
    shortDesc: '主修国际贸易、金融分析与跨文化管理，辅修数据科学；担任 ACG 社长、主导 Cosmolyra 项目。',
    shortDescEn: 'Major in international trade & financial analysis; led ACG club, explored Cosmolyra Web3 project.',
    bullets: [
      '国际贸易政策与跨文化商务谈判',
      '金融分析与商业建模（Excel、Python 数据处理）',
      '数据科学辅修：SQL、Pandas、数据可视化',
      'ACG 动画俱乐部社长：社团规模从 20 人扩至 80+，主导 10+ 大型活动',
      'Cosmolyra 项目：Web3 NFT × AI 生成内容独立探索',
      '应对 2023 年 GPA 毕业门槛改革，顺利完成学业要求',
    ],
    bulletsEn: [
      'International trade policy and cross-cultural business negotiation',
      'Financial analysis & business modeling (Excel, Python)',
      'Data science minor: SQL, Pandas, data visualization',
      'ACG Club President: scaled from 20 to 80+ members, 10+ major events',
      'Cosmolyra: independent Web3 NFT × AI-generated content project',
      "Successfully navigated SZTU's 2023 GPA graduation policy reform",
    ],
    tags: ['International Trade', 'Financial Analysis', 'Python', 'Web3', 'Team Leadership'],
  },

  // ══ 实习 ══════════════════════════════════════════════════════════════════
  {
    id: 'sztu-physics',
    category: 'internship',
    type: 'Intern', typeCn: '实习',
    title: '深圳技术大学工程物理学院', titleEn: 'College of Engineering Physics, SZTU',
    organization: 'SZTU',
    role: '科研项目管理助理',
    roleEn: 'Research Project Management Assistant',
    period: '2023 — 2024',
    color: '#FCD34D',
    shortDesc: '协助科研团队多项目并行管理，输出月度进度报告，文档归档效率提升 30%。',
    shortDescEn: 'Supported multi-project management for research team; improved doc archiving efficiency 30%.',
    bullets: [
      '统筹 3 项在研项目的里程碑追踪，协调跨部门资源协作',
      '整理标准化项目文档模板，文档归档效率提升 30%',
      '输出月度进度报告，辅助导师进行项目评审汇报',
      '参与科研经费申请材料整理，熟悉高校纵向科研项目流程',
    ],
    bulletsEn: [
      'Coordinated milestone tracking across 3 concurrent research projects',
      'Standardized documentation templates, improving archiving efficiency by 30%',
      'Produced monthly progress reports for supervisor review presentations',
      'Assisted in research funding application preparation',
    ],
    tags: ['Project Management', 'Excel', 'Research', 'Documentation'],
  },

  {
    id: 'qiyue',
    category: 'internship',
    type: 'Intern', typeCn: '实习',
    title: '深圳市启悦光电', titleEn: 'Shenzhen Qiyue Optoelectronics',
    organization: '启悦光电',
    role: '市场研究实习生',
    roleEn: 'Market Research Intern',
    period: '2023',
    color: '#60A5FA',
    shortDesc: '针对光电行业输出 5 份细分市场竞品分析报告，建立市场情报数据库，检索效率提升 50%。',
    shortDescEn: 'Delivered 5 competitive analysis reports; built market intelligence database, cut retrieval time 50%.',
    bullets: [
      '完成 5 份细分市场竞品分析报告，覆盖国内外主要竞争对手定价与技术差异',
      '整理客户访谈摘要，提炼 3 个高优先级产品改进方向',
      '协助建立市场情报数据库，缩短信息检索时间 50%',
      '参与产品宣传物料设计，提供市场侧数据支撑',
    ],
    bulletsEn: [
      'Delivered 5 competitive analysis reports covering pricing & tech differentials',
      'Synthesized customer interviews, identifying 3 high-priority product improvements',
      'Helped build a market intelligence database, reducing retrieval time by 50%',
      'Contributed market data to product marketing collateral design',
    ],
    tags: ['Competitive Analysis', 'Market Research', 'Excel', 'Report Writing'],
  },

  {
    id: 'boc',
    category: 'internship',
    type: 'Intern', typeCn: '实习',
    title: '中国银行', titleEn: 'Bank of China',
    organization: '中国银行',
    role: '综合营业部实习生',
    roleEn: 'General Business Dept. Intern',
    period: '2022',
    color: '#F87171',
    shortDesc: '每日服务 50+ 客户，协助 KYC 合规审核，完成内部金融产品培训并获优秀评价。',
    shortDescEn: 'Served 50+ customers daily; assisted KYC compliance reviews; received excellent intern evaluation.',
    bullets: [
      '每日服务 50+ 客户，处理基础存贷款、汇款及理财咨询需求',
      '协助 KYC 合规审核，熟悉银行业务流程与风控规范',
      '完成内部金融产品培训，通过考核并获优秀实习评价',
      '参与网点营销活动策划，协助提升理财产品签约率',
    ],
    bulletsEn: [
      'Served 50+ customers daily: deposits, remittances, wealth management inquiries',
      'Assisted KYC compliance reviews; familiar with banking workflows and risk control',
      'Completed internal product training; received excellent intern evaluation',
      'Supported branch marketing events to improve wealth product conversion rates',
    ],
    tags: ['Banking', 'Customer Service', 'KYC', 'Financial Compliance'],
  },
])

// 构建传给 SlideOver 的 item（根据语言注入正确的 bullets）
function openItem(card: ExpCard) {
  activeItem.value = {
    ...card,
    bullets: locale.value === 'en' ? (card.bulletsEn ?? card.bullets) : card.bullets,
  }
}

const educationItems  = computed(() => allItems.value.filter(i => i.category === 'education'))
const internshipItems = computed(() => allItems.value.filter(i => i.category === 'internship'))
</script>

<style scoped>
/* Tag hover：瞬间切换分类代表色背景（CSS 变量由 :style 注入） */
.exp-tag:hover {
  background: var(--tag-hover-bg) !important;
  color: #1A1A1A !important;
  border-color: #1A1A1A !important;
}
</style>
