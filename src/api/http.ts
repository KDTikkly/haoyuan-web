// src/api/http.ts
// 同源 Serverless 架构：前后端部署在同一 Vercel 域名下
// 开发环境: Vite dev proxy 将 /api/* 转发到本地 Go 服务（见 vite.config.js）
// 生产环境: /api/* 直接由 Vercel Serverless Function 处理，无需跨域
import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
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
