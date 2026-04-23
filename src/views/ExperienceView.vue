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

    <!-- ── 三级折叠菜单 ── -->
    <MemphisAccordion
      :sections="accordionData"
      accent="#FFD600"
    />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MemphisAccordion from '@/components/MemphisAccordion.vue'
import type { AccordionSection } from '@/components/MemphisAccordion.vue'

const { locale } = useI18n()
const zh = computed(() => locale.value !== 'en')

// ─────────────────────────────────────────────────────────────────────────────
// 三级折叠数据
// 结构：一级(大分类) → 二级(机构/公司) → 三级(详情块)
// ─────────────────────────────────────────────────────────────────────────────
const accordionData = computed<AccordionSection[]>(() => [

  // ══ 一级：教育经历 ══════════════════════════════════════════════════════════
  {
    icon: '◈',
    title: zh.value ? '教育经历' : 'Education',
    subtitle: zh.value ? '学历背景 / Academic Background' : 'Academic Background',
    items: [

      // 二级：香港城市大学
      {
        name: zh.value ? '香港城市大学' : 'City University of Hong Kong',
        role: zh.value ? '理学硕士 · 创新创业—风险投资方向' : 'MSc Venture Creation (Innovation & Entrepreneurship)',
        period: '2026.01 — 2028.06',
        tag: 'MSc',
        color: '#A78BFA',
        slideOver: {
          title: zh.value ? '香港城市大学 · 理学硕士' : 'City University of Hong Kong · MSc',
          description: zh.value
            ? '聚焦创业生态系统、风险投资估值与 DeepTech 商业化路径，培养跨境创业与融资能力。课程以实战为导向，结合香港独特的国际金融中心背景，深度链接湾区创业资源。'
            : 'Focused on startup ecosystems, VC valuation frameworks, and DeepTech commercialization pathways, leveraging Hong Kong\'s unique position as an international financial hub and GBA innovation gateway.',
          bullets: zh.value
            ? [
                '风险投资与私募股权估值方法论（DCF、可比公司法、期权定价模型）',
                'DeepTech 产品商业化路径设计（从实验室到市场）',
                '跨境创业法律与合规框架（香港、内地、东南亚）',
                '天使轮/种子轮融资提案设计（Pitch Deck 结构与投资人心理）',
                '创业生态系统分析（GBA 创业政策、孵化器资源链接）',
              ]
            : [
                'VC & PE valuation: DCF, comps, option pricing models',
                'DeepTech commercialization: lab-to-market pathway design',
                'Cross-border startup legal & compliance (HK, Mainland, SEA)',
                'Angel/seed-round pitch deck structure and investor psychology',
                'GBA startup ecosystem analysis and incubator resource mapping',
              ],
          tags: ['VC Valuation', 'Startup Ecosystem', 'DeepTech', 'Pitch Deck', 'GBA'],
        },
        details: [
          {
            title: zh.value ? '项目核心方向' : 'Program Focus',
            collapsible: false,
            text: zh.value
              ? '聚焦创业生态系统、风险投资估值与 DeepTech 商业化路径，培养跨境创业与融资能力。'
              : 'Focused on startup ecosystems, VC valuation frameworks, and DeepTech commercialization pathways to develop cross-border entrepreneurship and fundraising capabilities.',
          },
          {
            title: zh.value ? '核心课程与技能' : 'Core Courses & Skills',
            collapsible: true,
            bullets: zh.value
              ? ['风险投资与私募股权估值方法论', 'DeepTech 产品商业化路径设计', '跨境创业法律与合规框架', '天使轮/种子轮融资提案设计']
              : ['VC & PE valuation methodologies', 'DeepTech product commercialization pathways', 'Cross-border startup legal & compliance frameworks', 'Angel / seed-round pitch deck design'],
            tags: ['VC Valuation', 'Startup Ecosystem', 'DeepTech', 'Pitch Deck'],
          },
        ],
      },

      // 二级：深圳技术大学
      {
        name: zh.value ? '深圳技术大学' : 'Shenzhen Technology University',
        role: zh.value ? '管理学学士 · 国际商务—金融方向' : 'BM International Business (Finance Track)',
        period: '2021.09 — 2025.06',
        tag: 'BM',
        color: '#34D399',
        slideOver: {
          title: zh.value ? '深圳技术大学 · 管理学学士' : 'SZTU · BM International Business',
          description: zh.value
            ? '主修国际贸易、金融分析与跨文化管理，辅修数据科学应用。在校期间担任 ACG 社长、主导 Cosmolyra Web3 项目探索，具备扎实的定量分析与商业建模基础。'
            : 'Major in international trade, financial analysis, and cross-cultural management; minor in data science. Led ACG club, explored Cosmolyra Web3 × AI project, with strong quantitative analysis and business modeling foundations.',
          bullets: zh.value
            ? [
                '国际贸易政策与跨文化商务谈判',
                '金融分析与商业建模（Excel、Python 数据处理）',
                '数据科学应用辅修（SQL、Pandas、数据可视化）',
                'ACG 动画俱乐部社长：社团规模从 20 人扩至 80+，主导 10+ 大型活动',
                'Cosmolyra 项目：Web3 NFT × AI 生成内容独立探索',
                '应对 2023 年 GPA 毕业门槛改革，顺利完成学业要求',
              ]
            : [
                'International trade policy and cross-cultural business negotiation',
                'Financial analysis & business modeling (Excel, Python)',
                'Data science minor: SQL, Pandas, data visualization',
                'ACG Club President: scaled from 20 to 80+ members, 10+ major events',
                'Cosmolyra: independent Web3 NFT × AI-generated content project',
                'Successfully navigated SZTU\'s 2023 GPA graduation policy reform',
              ],
          tags: ['International Trade', 'Financial Analysis', 'Python', 'Web3', 'Team Leadership'],
        },
        details: [
          {
            title: zh.value ? '学历概述' : 'Overview',
            collapsible: false,
            text: zh.value
              ? '主修国际贸易、金融分析与跨文化管理，辅修数据科学应用，具备扎实的定量分析与商业建模基础。'
              : 'Major in international trade, financial analysis, and cross-cultural management; minor in data science applications. Strong foundation in quantitative analysis and business modeling.',
          },
          {
            title: zh.value ? 'ACG 动画俱乐部 · 社长 (2021–2025)' : 'ACG Animation Club · President (2021–2025)',
            collapsible: true,
            bullets: zh.value
              ? ['统筹 4 年社团运营，团队规模从 20 人扩至 80 人+', '主导策划 10+ 场校内大型活动，累计参与人数 2000+', '建立跨部门协作机制，设计招新/留存/晋升完整运营体系', '将 AI 工具（Midjourney / CapCut）引入内容生产流程，降本 40%']
              : ['Scaled club from 20 to 80+ members over 4 years', 'Organized 10+ major campus events with 2000+ cumulative attendees', 'Built cross-department collaboration and a complete recruit/retain/promote ops system', 'Integrated AI tools (Midjourney/CapCut) into content production, reducing costs by 40%'],
            tags: ['社团运营', 'Event Planning', 'Team Building', 'AI Content'],
          },
          {
            title: zh.value ? 'GPA 毕业门槛改革应对方案' : 'GPA Policy Reform Response',
            collapsible: true,
            text: zh.value
              ? '2023 年学校调整毕业 GPA 标准，针对性重构课程优先级，兼顾短期成绩提升与长期能力构建，最终顺利完成学业要求。'
              : 'In response to SZTU\'s 2023 GPA graduation policy reform, restructured course priority and study strategy to balance short-term grade recovery with long-term skill development.',
          },
          {
            title: zh.value ? 'Cosmolyra · Web3 × AI 项目探索' : 'Cosmolyra · Web3 × AI Project',
            collapsible: true,
            text: zh.value
              ? '在校期间独立探索将 Web3 NFT 机制与 AI 生成内容结合的 Cosmolyra 项目，覆盖产品设计、AI 工作流搭建与社区冷启动全流程。'
              : 'Independently explored Cosmolyra — a Web3 NFT × AI-generated content project — covering product design, AI workflow construction, and community cold-start strategy.',
            tags: ['Web3', 'NFT', 'AI Workflow', 'Midjourney', 'Product Design'],
          },
        ],
      },

    ],
  },

  // ══ 一级：实习经历 ══════════════════════════════════════════════════════════
  {
    icon: '◉',
    title: zh.value ? '实习经历' : 'Internships',
    subtitle: zh.value ? '工作经历 / Professional Experience' : 'Professional Experience',
    items: [

      // 二级：深圳技术大学工程物理学院
      {
        name: zh.value ? '深圳技术大学工程物理学院' : 'College of Engineering Physics, SZTU',
        role: zh.value ? '科研项目管理助理' : 'Research Project Management Assistant',
        period: '2023 — 2024',
        tag: zh.value ? '实习' : 'Intern',
        color: '#FCD34D',
        slideOver: {
          title: zh.value ? '科研项目管理助理' : 'Research Project Management Assistant',
          description: zh.value
            ? '协助工程物理学院科研团队进行多项目并行管理，跟踪研究进度、整理技术文档，确保项目交付节点按时达成。'
            : 'Supported multi-project parallel management for the College of Engineering Physics research team, tracking milestones, organizing documentation, and ensuring on-time delivery.',
          bullets: zh.value
            ? [
                '统筹 3 项在研项目的里程碑追踪，协调跨部门资源协作',
                '整理标准化项目文档模板，文档归档效率提升 30%',
                '输出月度进度报告，辅助导师进行项目评审汇报',
                '参与科研经费申请材料整理，熟悉高校纵向科研项目流程',
              ]
            : [
                'Coordinated milestone tracking across 3 concurrent research projects',
                'Standardized documentation templates, improving archiving efficiency by 30%',
                'Produced monthly progress reports for supervisor review presentations',
                'Assisted in research funding application preparation; familiar with university research fund workflows',
              ],
          tags: ['项目管理', 'Project Management', 'Excel', 'Research', 'Documentation'],
        },
        details: [
          {
            title: zh.value ? '职责概述' : 'Overview',
            collapsible: false,
            text: zh.value
              ? '协助工程物理学院科研团队进行多项目并行管理，跟踪研究进度、整理技术文档，确保项目交付节点按时达成。'
              : 'Supported multi-project parallel management for the College of Engineering Physics research team, tracking milestones, organizing documentation, and ensuring on-time delivery.',
          },
          {
            title: zh.value ? '核心亮点' : 'Key Highlights',
            collapsible: true,
            bullets: zh.value
              ? ['统筹 3 项在研项目的里程碑追踪，协调跨部门资源协作', '整理标准化项目文档模板，文档归档效率提升 30%', '输出月度进度报告，辅助导师进行项目评审汇报']
              : ['Coordinated milestone tracking across 3 concurrent research projects', 'Standardized documentation templates, improving archiving efficiency by 30%', 'Produced monthly progress reports for supervisor review presentations'],
            tags: ['项目管理', 'Project Management', 'Excel', 'Research'],
          },
        ],
      },

      // 二级：深圳市启悦光电
      {
        name: zh.value ? '深圳市启悦光电有限公司' : 'Shenzhen Qiyue Optoelectronics Co., Ltd.',
        role: zh.value ? '市场研究实习生' : 'Market Research Intern',
        period: '2023',
        tag: zh.value ? '实习' : 'Intern',
        color: '#60A5FA',
        slideOver: {
          title: zh.value ? '市场研究实习生' : 'Market Research Intern',
          description: zh.value
            ? '针对光电行业细分市场开展竞品调研与客户需求分析，输出市场洞察报告，支持销售与产品决策。'
            : 'Conducted competitive research and customer needs analysis in the optoelectronics sector, producing market insight reports to support sales and product decisions.',
          bullets: zh.value
            ? [
                '完成 5 份细分市场竞品分析报告，覆盖国内外主要竞争对手定价与技术差异',
                '整理客户访谈摘要，提炼 3 个高优先级产品改进方向',
                '协助建立市场情报数据库，缩短信息检索时间 50%',
                '参与产品宣传物料设计，提供市场侧数据支撑',
              ]
            : [
                'Delivered 5 competitive analysis reports covering domestic/international pricing & technology differentials',
                'Synthesized customer interviews, identifying 3 high-priority product improvements',
                'Helped build a market intelligence database, reducing retrieval time by 50%',
                'Contributed market data support to product marketing collateral design',
              ],
          tags: ['市场调研', 'Competitive Analysis', 'Excel', 'Report Writing', 'Optoelectronics'],
        },
        details: [
          {
            title: zh.value ? '职责概述' : 'Overview',
            collapsible: false,
            text: zh.value
              ? '针对光电行业细分市场开展竞品调研与客户需求分析，输出市场洞察报告，支持销售与产品决策。'
              : 'Conducted competitive research and customer needs analysis in the optoelectronics sector, producing market insight reports to support sales and product decisions.',
          },
          {
            title: zh.value ? '核心亮点' : 'Key Highlights',
            collapsible: true,
            bullets: zh.value
              ? ['完成 5 份细分市场竞品分析报告，覆盖国内外主要竞争对手定价与技术差异', '整理客户访谈摘要，提炼 3 个高优先级产品改进方向', '协助建立市场情报数据库，缩短信息检索时间 50%']
              : ['Delivered 5 competitive analysis reports covering domestic and international pricing/technology differentials', 'Synthesized customer interviews, identifying 3 high-priority product improvements', 'Helped build a market intelligence database, reducing retrieval time by 50%'],
            tags: ['市场调研', 'Competitive Analysis', 'Excel', 'Report Writing'],
          },
        ],
      },

      // 二级：中国银行
      {
        name: zh.value ? '中国银行' : 'Bank of China',
        role: zh.value ? '综合营业部实习生' : 'General Business Dept. Intern',
        period: '2022',
        tag: zh.value ? '实习' : 'Intern',
        color: '#F87171',
        slideOver: {
          title: zh.value ? '中国银行综合营业部实习生' : 'Bank of China — General Business Intern',
          description: zh.value
            ? '在综合营业部参与日常客户服务与金融产品推介工作，积累金融行业合规知识与客户沟通技巧。'
            : 'Participated in daily customer service and financial product promotion at the general operations desk, building compliance knowledge and client communication skills.',
          bullets: zh.value
            ? [
                '每日服务 50+ 客户，处理基础存贷款、汇款及理财咨询需求',
                '协助 KYC 合规审核，熟悉银行业务流程与风控规范',
                '完成内部金融产品培训，通过考核并获优秀实习评价',
                '参与网点营销活动策划，协助提升理财产品签约率',
              ]
            : [
                'Served 50+ customers daily: deposits, remittances, wealth management inquiries',
                'Assisted KYC compliance reviews; familiar with banking workflows and risk control',
                'Completed internal product training; received excellent intern evaluation',
                'Supported branch marketing events to improve wealth product conversion rates',
              ],
          tags: ['金融合规', 'Customer Service', 'KYC', 'Banking', 'Wealth Management'],
        },
        details: [
          {
            title: zh.value ? '职责概述' : 'Overview',
            collapsible: false,
            text: zh.value
              ? '在综合营业部参与日常客户服务与金融产品推介工作，积累金融行业合规知识与客户沟通技巧。'
              : 'Participated in daily customer service and financial product promotion at the general operations desk, building compliance knowledge and client communication skills.',
          },
          {
            title: zh.value ? '核心亮点' : 'Key Highlights',
            collapsible: true,
            bullets: zh.value
              ? ['每日服务 50+ 客户，处理基础存贷款、汇款及理财咨询需求', '协助 KYC 合规审核，熟悉银行业务流程与风控规范', '完成内部金融产品培训，通过考核并获优秀实习评价']
              : ['Served 50+ customers daily with deposits, remittances, and wealth management inquiries', 'Assisted KYC compliance reviews, gaining familiarity with banking workflows', 'Completed internal training and received excellent intern evaluation'],
            tags: ['金融合规', 'Customer Service', 'KYC', 'Banking'],
          },
        ],
      },

    ],
  },

])
</script>
