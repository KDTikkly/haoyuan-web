/**
 * aiService.ts — 多模型 AI 视觉分析服务层 (v8.3)
 *
 * 设计原则：
 * - 统一 Vision 调用接口，屏蔽底层模型差异
 * - 所有 API Key 仅存于 Vercel 后端环境变量中，前端代码零 key
 * - Gemini 与 DeepSeek 均通过后端代理 /api/vision 调用
 * - 调用方无需关心底层 endpoint / headers 差异
 */

export type AiModel = 'gemini-vision' | 'deepseek-v4-pro'

// ── 模型元数据 ────────────────────────────────────────────────────────────────
export const MODEL_META: Record<AiModel, { label: string; tag: string; color: string }> = {
  'gemini-vision':  { label: 'Gemini Vision',   tag: '◈ GEMINI',  color: '#FFD600' },
  'deepseek-v4-pro': { label: 'DeepSeek V4 Pro', tag: '◆ DSEEK',  color: '#2979FF' },
}

// ── 当前选中模型（全局响应式）────────────────────────────────────────────────
import { ref } from 'vue'

export const selectedVisionModel = ref<AiModel>('gemini-vision')

// ── 核心方法：分析涂鸦图像 ────────────────────────────────────────────────────
export interface VisionResult {
  text: string
  model: AiModel
  raw?: string
}

/**
 * 根据当前选中的模型调用后端代理 API 分析图像
 * API Key 存于 Vercel 环境变量，前端仅传 model 标识
 */
export async function analyzeImage(imageBase64: string): Promise<VisionResult> {
  const model = selectedVisionModel.value
  return analyzeViaProxy(imageBase64, model)
}

// ── 统一代理请求（Gemini & DeepSeek 均走 /api/vision）────────────────────────
async function analyzeViaProxy(imageBase64: string, model: AiModel): Promise<VisionResult> {
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, model }),
  })

  const data = await res.json()

  if (data.result) {
    return { text: data.result, model }
  }
  throw new Error(data.error || `${model} 分析失败`)
}

/**
 * 切换视觉识别模型
 */
export function switchVisionModel(model: AiModel) {
  selectedVisionModel.value = model
}
