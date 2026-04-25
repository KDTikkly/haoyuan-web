/**
 * useGlobalSearch — 全局搜索 composable
 *
 * 功能：
 * 1. 本地静态索引：覆盖所有页面的静态内容（项目/经历/技能/页面导航）
 * 2. 动态索引：从 /data/*.json 异步加载项目数据（懒加载，首次搜索时触发）
 * 3. 搜索引擎 fallback：本地无结果时，根据 IP 地区打开 Google 或 Edge
 */

import { ref, computed } from 'vue'

// ════════════════════════════════════════════
//  本地静态索引（覆盖：页面导航 + 经历 + 技能 + 简历）
// ════════════════════════════════════════════

/** @type {Array<{title:string, titleEn:string, desc:string, tags:string[], route:string, type:string}>} */
const STATIC_INDEX = [
  // ── 页面导航 ──
  { title: '首页', titleEn: 'Home', desc: '个人介绍、精选项目、核心能力', tags: ['home', '首页'], route: '/', type: 'page' },
  { title: '项目', titleEn: 'Projects', desc: '所有作品集项目', tags: ['projects', '作品'], route: '/projects', type: 'page' },
  { title: '经历', titleEn: 'Experience', desc: '教育背景、实习经历', tags: ['experience', '经历', '教育', '实习'], route: '/experience', type: 'page' },
  { title: '游玩', titleEn: 'Gaming', desc: 'Steam 游戏库、米哈游游戏分析', tags: ['gaming', '游戏', 'steam'], route: '/gaming', type: 'page' },
  { title: '简历', titleEn: 'Resume', desc: '简历下载、技能列表', tags: ['resume', '简历', 'cv'], route: '/resume', type: 'page' },

  // ── 经历：教育 ──
  { title: '深圳技术大学', titleEn: 'SZTU', desc: '工业工程与管理 本科 2021-2025', tags: ['SZTU', '深技大', '工业工程', '大学'], route: '/experience', type: 'education' },

  // ── 经历：社团 ──
  { title: 'ACG 动画俱乐部', titleEn: 'ACG Anime Club', desc: '社长 2021-2025，超过百人规模', tags: ['ACG', 'anime', '动画', '社长'], route: '/experience', type: 'experience' },

  // ── 技能 ──
  { title: 'AI 工作流', titleEn: 'AI Workflow', desc: 'Langchain、Comfy UI、AI 自动化流程整合', tags: ['AI', 'LLM', '工作流', 'automation'], route: '/resume', type: 'skill' },
  { title: '视频内容运营', titleEn: 'Video Content', desc: '短视频策划、剪辑、运营', tags: ['视频', 'video', '运营', '剪辑'], route: '/resume', type: 'skill' },
  { title: 'Vue / React', titleEn: 'Frontend Dev', desc: '前端开发，Vue 3 Composition API', tags: ['Vue', 'React', 'frontend', '前端'], route: '/resume', type: 'skill' },
  { title: 'Python', titleEn: 'Python', desc: '数据分析、自动化脚本', tags: ['python', '数据分析', 'data'], route: '/resume', type: 'skill' },

  // ── 项目 ──
  { title: 'Cosmolyra', titleEn: 'Cosmolyra', desc: '虚拟资产交易枢纽平台', tags: ['cosmolyra', '虚拟资产', '交易', '项目'], route: '/projects', type: 'project' },
  { title: 'DMAIC 热水器分析', titleEn: 'DMAIC Water Heater', desc: '质量管理 DMAIC 方法，热水器生产线优化', tags: ['DMAIC', '质量管理', '热水器', '六西格玛'], route: '/projects', type: 'project' },
]

// ── 类型图标映射 ──
const TYPE_ICON = {
  page:       '🗂',
  project:    '🚀',
  education:  '🎓',
  experience: '💼',
  skill:      '⚡',
}

// ── 类型标签（中英） ──
const TYPE_LABEL = {
  page:       { zh: '页面', en: 'Page' },
  project:    { zh: '项目', en: 'Project' },
  education:  { zh: '教育', en: 'Education' },
  experience: { zh: '经历', en: 'Experience' },
  skill:      { zh: '技能', en: 'Skill' },
}

// ════════════════════════════════════════════
//  动态索引（projects API，懒加载）
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
    const list = Array.isArray(data) ? data : data.projects || []
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
  } catch {
    // 静默失败，退化为纯静态索引
  }
}

// ════════════════════════════════════════════
//  IP → 搜索引擎（缓存在内存，避免重复请求）
// ════════════════════════════════════════════
let cachedEngine = null // 'google' | 'edge' | null

async function getSearchEngine() {
  if (cachedEngine) return cachedEngine
  try {
    const res = await fetch('/api/geo', { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      cachedEngine = data.engine || 'google'
    } else {
      cachedEngine = 'google'
    }
  } catch {
    cachedEngine = 'google'
  }
  return cachedEngine
}

function buildSearchUrl(engine, query) {
  const q = encodeURIComponent(query)
  if (engine === 'edge') {
    // 必应国际版（中国大陆可访问）
    return `https://www.bing.com/search?q=${q}&setlang=zh-Hans`
  }
  return `https://www.google.com/search?q=${q}`
}

// ════════════════════════════════════════════
//  搜索核心逻辑
// ════════════════════════════════════════════

/**
 * 对单条索引项打分，返回 0~1 的相关度（0 = 不匹配）
 */
function scoreItem(item, tokens) {
  const text = [item.title, item.titleEn, item.desc, ...item.tags]
    .join(' ')
    .toLowerCase()

  let matched = 0
  for (const t of tokens) {
    if (text.includes(t)) matched++
  }
  return tokens.length > 0 ? matched / tokens.length : 0
}

/**
 * 执行搜索，返回最多 8 条结果
 * @param {string} query
 * @returns {Array<{title, titleEn, desc, route, type, icon, typeLabel}>}
 */
export function searchLocal(query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!tokens.length) return []

  const index = [...STATIC_INDEX, ...dynamicIndex]
  const scored = index
    .map(item => ({ item, score: scoreItem(item, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  return scored.map(({ item }) => ({
    ...item,
    icon:      TYPE_ICON[item.type]  || '📄',
    typeLabel: TYPE_LABEL[item.type] || { zh: item.type, en: item.type },
  }))
}

// ════════════════════════════════════════════
//  composable 导出
// ════════════════════════════════════════════
export function useGlobalSearch() {
  const query   = ref('')
  const results = ref([])
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
    debounceTimer = setTimeout(async () => {
      await loadDynamicIndex()
      results.value = searchLocal(q)
      isOpen.value  = results.value.length > 0
    }, 180)
  }

  function close() {
    isOpen.value  = false
    results.value = []
    query.value   = ''
  }

  /**
   * 提交搜索：有本地结果则跳转第一条，无结果则打开搜索引擎
   */
  async function submit(router) {
    const q = query.value.trim()
    if (!q) return

    await loadDynamicIndex()
    const local = searchLocal(q)

    if (local.length > 0) {
      // 本地有结果 → 跳转最相关页面，并关闭搜索框
      router.push(local[0].route)
      close()
    } else {
      // fallback → 搜索引擎
      const engine = await getSearchEngine()
      const url = buildSearchUrl(engine, q)
      window.open(url, '_blank', 'noopener,noreferrer')
      close()
    }
  }

  /**
   * 点击某条本地结果
   */
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
    submit,
    selectResult,
    getSearchEngine, // 暴露给外部预热使用
  }
}
