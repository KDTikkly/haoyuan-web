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

interface ProjectRaw extends Omit<Project, 'title' | 'subtitle' | 'description'> {
  title: I18nString
  subtitle: I18nString
  description: I18nString
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
  const { data } = await http.get<ProjectRaw[]>('/data/projects.json')
  _cache = data
  return data
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
 * 获取项目 Markdown 内容（原始字符串）
 * content_path 格式：/data/content/<id>.md
 */
export async function fetchProjectContent(id: string): Promise<string> {
  const raws = await loadRaw()
  const raw = raws.find(p => p.id === id)
  if (!raw || !raw.content_path) throw new Error(`No content path for: ${id}`)
  const { data } = await http.get<string>(raw.content_path, {
    headers: { Accept: 'text/markdown, text/plain' },
    transformResponse: [(raw) => raw],
  })
  return data
}
