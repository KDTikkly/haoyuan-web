// src/api/http.ts
// 生产环境: VITE_API_BASE_URL=https://api.haoyuanlin.uk (Fly.io 后端)
// 开发环境: VITE_API_BASE_URL 为空，Vite dev proxy 将 /api/* 转发到 localhost:8080
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const http = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

// 统一响应拦截（可扩展 token 注入等）
http.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.response?.status, err.config?.url)
    return Promise.reject(err)
  }
)

export default http
