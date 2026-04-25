/**
 * useGlobalSearch — 全局搜索 composable v2
 *
 * 改进：
 * 1. 只要有输入内容就显示下拉（不要求精确匹配）
 * 2. 前缀匹配权重 > 包含匹配，给出更自然的预测顺序
 * 3. 每条结果附带 matchedText（高亮原始文字 + 匹配词）
 * 4. 固定末尾追加"在网上搜索 XXX"建议行
 */

import { ref } from 'vue'

// ════════════════════════════════════════════
//  本地静态索引
// ════════════════════════════════════════════
/** @type {Array<{title:string, titleEn:string, desc:string, tags:string[], route:string, type:string}>} */
const STATIC_INDEX = [
  { title: '首页',   titleEn: 'Home',       desc: '个人介绍、精选项目、核心能力', tags: ['home', '首页'],                         route: '/',           type: 'page'       },
  { title: '项目',   titleEn: 'Projects',   desc: '所有作品集项目',               tags: ['projects', '作品'],                    route: '/projects',   type: 'page'       },
  { title: '经历',   titleEn: 'Experience', desc: '教育背景、实习经历',           tags: ['experience', '经历', '教育', '实习'],   route: '/experience', type: 'page'       },
  { title: '游玩',   titleEn: 'Gaming',     desc: 'Steam 游戏库、米哈游游戏分析', tags: ['gaming', '游戏', 'steam'],             route: '/gaming',     type: 'page'       },
  { title: '简历',   titleEn: 'Resume',     desc: '简历下载、技能列表',           tags: ['resume', '简历', 'cv'],               route: '/resume',     type: 'page'       },

  { title: '深圳技术大学', titleEn: 'SZTU',          desc: '工业工程与管理 本科 2021-2025', tags: ['SZTU', '深技大', '工业工程', '大学'],       route: '/experience', type: 'education'  },
  { title: 'ACG 动画俱乐部', titleEn: 'ACG Anime Club', desc: '社长 2021-2025，超过百人规模', tags: ['ACG', 'anime', '动画', '社长'],           route: '/experience', type: 'experience' },

  { title: 'AI 工作流',   titleEn: 'AI Workflow',   desc: 'Langchain、Comfy UI、AI 自动化', tags: ['AI', 'LLM', '工作流', 'automation'],   route: '/resume', type: 'skill' },
  { title: '视频内容运营', titleEn: 'Video Content', desc: '短视频策划、剪辑、运营',        tags: ['视频', 'video', '运营', '剪辑'],         route: '/resume', type: 'skill' },
  { title: 'Vue / React', titleEn: 'Frontend Dev',  desc: '前端开发，Vue 3 Composition API', tags: ['Vue', 'React', 'frontend', '前端'],    route: '/resume', type: 'skill' },
  { title: 'Python',      titleEn: 'Python',        desc: '数据分析、自动化脚本',           tags: ['python', '数据分析', 'data'],            route: '/resume', type: 'skill' },

  { title: 'Cosmolyra',      titleEn: 'Cosmolyra',         desc: '虚拟资产交易枢纽平台',              tags: ['cosmolyra', '虚拟资产', '交易', '项目'],              route: '/projects', type: 'project' },
  { title: 'DMAIC 热水器分析', titleEn: 'DMAIC Water Heater', desc: '质量管理 DMAIC，热水器生产线优化', tags: ['DMAIC', '质量管理', '热水器', '六西格玛'],            route: '/projects', type: 'project' },
]

// ── 类型图标 ──
const TYPE_ICON = {
  page: '🗂', project: '🚀', education: '🎓', experience: '💼', skill: '⚡',
}
const TYPE_LABEL = {
  page:       { zh: '页面', en: 'Page'       },
  project:    { zh: '项目', en: 'Project'    },
  education:  { zh: '教育', en: 'Education'  },
  experience: { zh: '经历', en: 'Experience' },
  skill:      { zh: '技能', en: 'Skill'      },
}

// ════════════════════════════════════════════
//  动态索引（懒加载）
// ════════════════════════════════════════════
let dynamicIndexLoaded = false
const dynamicIndex = []

async function loadDynamicIndex() {
  if (dynamicIndexLoaded) return
  dynamicIndexLoaded = true
  try {
    const res = await fetch('/api/projects')
    if (!res.ok) return
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.projects || [])
    for (const p of list) {
      dynamicIndex.push({
        title:   p.title   || '',
        titleEn: p.titleEn || p.title || '',
        desc:    p.description || p.subtitle || '',
        tags:    Array.isArray(p.tags) ? p.tags : [],
        route:   '/projects',
        type:    'project',
      })
    }
  } catch { /* 静默失败 */ }
}

// ════════════════════════════════════════════
//  搜索引擎 Geo 检测
// ════════════════════════════════════════════
let cachedEngine = null
async function getSearchEngine() {
  if (cachedEngine) return cachedEngine
  try {
    const res = await fetch('/api/geo', { cache: 'force-cache' })
    cachedEngine = res.ok ? ((await res.json()).engine || 'google') : 'google'
  } catch { cachedEngine = 'google' }
  return cachedEngine
}
function buildSearchUrl(engine, query) {
  const q = encodeURIComponent(query)
  return engine === 'edge'
    ? `https://www.bing.com/search?q=${q}&setlang=zh-Hans`
    : `https://www.google.com/search?q=${q}`
}

// ════════════════════════════════════════════
//  匹配与打分
// ════════════════════════════════════════════

/**
 * 对单条索引项打分（0 = 不匹配）
 * 前缀匹配权重 2，包含匹配权重 1
 */
function scoreItem(item, ql) {
  const fields = [item.title, item.titleEn, item.desc, ...item.tags]
  let score = 0
  for (const f of fields) {
    const fl = f.toLowerCase()
    if (fl.startsWith(ql)) score += 2
    else if (fl.includes(ql)) score += 1
  }
  return score
}

/**
 * 生成用于渲染高亮的数组：[{text, highlight}]
 * 仅对 displayTitle 处理
 */
function buildHighlight(title, ql) {
  if (!ql) return [{ text: title, highlight: false }]
  const lower = title.toLowerCase()
  const idx   = lower.indexOf(ql)
  if (idx === -1) return [{ text: title, highlight: false }]
  return [
    { text: title.slice(0, idx),           highlight: false },
    { text: title.slice(idx, idx + ql.length), highlight: true  },
    { text: title.slice(idx + ql.length),  highlight: false },
  ].filter(p => p.text.length > 0)
}

/**
 * 搜索并返回结果（含高亮信息）
 * 注意：始终返回，即使为空（调用方自行决定是否渲染"无结果"行）
 */
export function searchLocal(query) {
  const ql = query.trim().toLowerCase()
  if (!ql) return []

  const index = [...STATIC_INDEX, ...dynamicIndex]
  const results = index
    .map(item => ({ item, score: scoreItem(item, ql) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)

  return results.map(({ item }) => ({
    ...item,
    icon:       TYPE_ICON[item.type]  || '📄',
    typeLabel:  TYPE_LABEL[item.type] || { zh: item.type, en: item.type },
    highlights: buildHighlight(item.title, ql),
    highlightsEn: buildHighlight(item.titleEn, ql),
  }))
}

// ════════════════════════════════════════════
//  composable 导出
// ════════════════════════════════════════════
export function useGlobalSearch() {
  const query   = ref('')
  const results = ref([])
  /** isOpen：只要有输入内容 + 下拉未被手动关闭 */
  const isOpen  = ref(false)

  let debounceTimer = null

  function onInput() {
    clearTimeout(debounceTimer)
    const q = query.value.trim()
    if (!q) {
      results.value = []
      isOpen.value  = false
      return
    }
    // 有输入内容：立即打开下拉（先清空旧结果防闪烁），再 debounce 搜索
    isOpen.value = true
    debounceTimer = setTimeout(async () => {
      await loadDynamicIndex()
      results.value = searchLocal(q)
      // isOpen 保持 true（有输入就保持）
    }, 150)
  }

  function close() {
    isOpen.value  = false
    results.value = []
    query.value   = ''
  }

  function closePanel() {
    isOpen.value = false
  }

  async function submit(router) {
    const q = query.value.trim()
    if (!q) return
    await loadDynamicIndex()
    const local = searchLocal(q)
    if (local.length > 0) {
      router.push(local[0].route)
      close()
    } else {
      const engine = await getSearchEngine()
      window.open(buildSearchUrl(engine, q), '_blank', 'noopener,noreferrer')
      close()
    }
  }

  function selectResult(item, router) {
    router.push(item.route)
    close()
  }

  return {
    query,
    results,
    isOpen,
    onInput,
    close,
    closePanel,
    submit,
    selectResult,
    getSearchEngine,
  }
}
