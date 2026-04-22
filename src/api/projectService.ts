// src/api/projectService.ts
import http from './http'
import type { Project, ProjectsResponse } from '@/types/project'
import { i18n } from '@/i18n'

function getLang(): string {
  return (i18n.global.locale as any).value ?? 'zh'
}

/**
 * 获取项目列表（自动传递当前语言）
 */
export async function fetchProjects(tag?: string): Promise<Project[]> {
  const params: Record<string, string> = { lang: getLang() }
  if (tag && tag !== 'All') params.tag = tag

  const { data } = await http.get<ProjectsResponse>('/api/projects', { params })
  return data.data ?? []
}

/**
 * 获取单个项目详情
 */
export async function fetchProjectById(id: string): Promise<Project> {
  const { data } = await http.get<Project>(`/api/projects/${id}`, {
    params: { lang: getLang() },
  })
  return data
}

/**
 * 获取项目 Markdown 内容（原始字符串）
 */
export async function fetchProjectContent(id: string): Promise<string> {
  const { data } = await http.get<string>(`/api/projects/${id}/content`, {
    params: { lang: getLang() },
    headers: { Accept: 'text/markdown, text/plain' },
    transformResponse: [(raw) => raw],
  })
  return data
}
