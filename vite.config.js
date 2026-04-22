import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // 加载 .env 文件（开发时 VITE_API_BASE_URL 为空，由 proxy 处理）
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      // 开发代理：仅当 VITE_API_BASE_URL 未设置时生效
      proxy: env.VITE_API_BASE_URL ? {} : {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        '/assets': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  }
})
