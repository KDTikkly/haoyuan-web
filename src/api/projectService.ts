// src/api/projectService.ts
// 纯静态架构：数据来自 /public/data/projects.json，无需后端 API
import http from './http'
import type { Project } from '@/types/project'
import { i18n } from '@/i18n'

// projects.json 中双语字段的原始结构
interface I18nString {
  zh: string
  en: string
}

interface I18nContentPath {
  zh: string
  en: string
}

interface ProjectRaw extends Omit<Project, 'title' | 'subtitle' | 'description'> {
  title: I18nString
  subtitle: I18nString
  description: I18nString
  content_path?: string | I18nContentPath
  galleryImage?: string
}

function getLang(): string {
  return (i18n.global.locale as any).value ?? 'zh'
}

function pick(s: I18nString, lang: string): string {
  return lang === 'en' ? s.en : s.zh
}

function flatten(raw: ProjectRaw, lang: string): Project {
  return {
    ...raw,
    title: pick(raw.title, lang),
    subtitle: pick(raw.subtitle, lang),
    description: pick(raw.description, lang),
  }
}

let _cache: ProjectRaw[] | null = null

async function loadRaw(): Promise<ProjectRaw[]> {
  if (_cache) return _cache
  const { data } = await http.get<ProjectRaw[] | { data?: ProjectRaw[] } | unknown>('/data/projects.json')
  // 防御：Axios 某些配置可能将数组包在 { data: [...] } 中
  let rows: ProjectRaw[]
  if (Array.isArray(data)) {
    rows = data as ProjectRaw[]
  } else if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    rows = (data as any).data as ProjectRaw[]
  } else {
    console.error('[projectService] Unexpected response shape:', data)
    rows = []
  }
  _cache = rows
  return rows
}

/**
 * 获取项目列表（可按 tag 过滤，自动解析当前语言）
 */
export async function fetchProjects(tag?: string): Promise<Project[]> {
  const lang = getLang()
  const raws = await loadRaw()
  const filtered = tag && tag !== 'All'
    ? raws.filter(p => p.tags.includes(tag))
    : raws
  return filtered.map(p => flatten(p, lang))
}

/**
 * 获取单个项目详情
 */
export async function fetchProjectById(id: string): Promise<Project> {
  const lang = getLang()
  const raws = await loadRaw()
  const raw = raws.find(p => p.id === id)
  if (!raw) throw new Error(`Project not found: ${id}`)
  return flatten(raw, lang)
}

/**
 * 获取项目 Markdown 内容（原始字符串），自动按当前语言选择对应文件
 * content_path 支持字符串（旧格式）或 { zh, en } 双语对象
 */
export async function fetchProjectContent(id: string): Promise<string> {
  const lang = getLang()
  const raws = await loadRaw()
  const raw = raws.find(p => p.id === id)
  if (!raw || !raw.content_path) throw new Error(`No content path for: ${id}`)

  let path: string
  if (typeof raw.content_path === 'object') {
    path = lang === 'en' ? raw.content_path.en : raw.content_path.zh
  } else {
    path = raw.content_path
  }

  const { data } = await http.get<string>(path, {
    headers: { Accept: 'text/markdown, text/plain' },
    transformResponse: [(raw) => raw],
  })
  return data
}
