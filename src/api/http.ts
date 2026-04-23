// src/api/http.ts
// 纯静态架构：所有数据从 Vite public/ 目录直接获取，无需外部 API
import axios from 'axios'

const http = axios.create({
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.response.use(
  res => res,
  err => {
    console.error('[Fetch Error]', err.response?.status, err.config?.url)
    return Promise.reject(err)
  }
)

export default http
