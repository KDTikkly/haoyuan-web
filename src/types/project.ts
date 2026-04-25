// src/types/project.ts
export interface MediaItem {
  type: 'image' | 'bilibili' | 'youtube' | 'video'
  url: string
}

export interface ExternalLink {
  label: string
  url: string
}

export interface Project {
  id: string
  title: string
  subtitle: string
  tags: string[]
  cover: string
  description: string
  content_type: 'markdown' | 'embed'
  content_path: string
  media: MediaItem[]
  external_links: ExternalLink[]
  featured: boolean
  date: string
}

export interface ProjectsResponse {
  data: Project[]
  total: number
}
