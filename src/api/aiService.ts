/**
 * aiService.ts — 多模型 AI 视觉分析服务层 (v8.2)
 *
 * 设计原则：
 * - 统一 Vision 调用接口，屏蔽底层模型差异
 * - API Key 硬编码于此供本地测试，后续通过环境变量或后端代理迁移
 * - 支持模型热切换 (Gemini Vision / DeepSeek V4 Pro)
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

// ── DeepSeek API Key（TODO: 迁移至后端代理 / .env）──────────────────────────
const DEEPSEEK_API_KEY = 'sk-a54879ae3bfd443aa034b2030fd11791'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions'

// ── 核心方法：分析涂鸦图像 ────────────────────────────────────────────────────
export interface VisionResult {
  text: string
  model: AiModel
  raw?: string
}

/**
 * 根据当前选中的模型调用对应 API 分析图像
 */
export async function analyzeImage(imageBase64: string): Promise<VisionResult> {
  const model = selectedVisionModel.value
  if (model === 'deepseek-v4-pro') {
    return analyzeWithDeepSeek(imageBase64)
  }
  return analyzeWithGemini(imageBase64)
}

// ── Gemini Vision（通过后端 /api/vision 代理）───────────────────────────────
async function analyzeWithGemini(imageBase64: string): Promise<VisionResult> {
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, model: 'gemini-vision' }),
  })

  const data = await res.json()

  if (data.result) {
    return { text: data.result, model: 'gemini-vision' }
  }
  throw new Error(data.error || 'Gemini Vision 分析失败')
}

// ── DeepSeek V4 Pro（直连 API，后续迁移至后端代理）─────────────────────────
async function analyzeWithDeepSeek(imageBase64: string): Promise<VisionResult> {
  const payload = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请用中文简短描述这幅涂鸦的内容、风格和可能的含义（控制在两句话以内）。回复格式：直接给出分析结果，不要前缀。',
          },
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
        ],
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  }

  const res = await fetch(DEEPSEEK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error?.message || `DeepSeek API ${res.status}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim() || '无法解析结果'
  return { text, model: 'deepseek-v4-pro' }
}

/**
 * 切换视觉识别模型
 */
export function switchVisionModel(model: AiModel) {
  selectedVisionModel.value = model
}
