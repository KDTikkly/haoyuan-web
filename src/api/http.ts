// src/api/http.ts
// Axios 实例 — 从 Vite 环境变量读取 baseURL
// 开发环境: VITE_API_BASE_URL 为空，Vite dev proxy 将 /api/* 转发到 localhost:8080
// 生产环境: VITE_API_BASE_URL = https://your-backend.up.railway.app
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const http = axios.create({
  baseURL: BASE,
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
