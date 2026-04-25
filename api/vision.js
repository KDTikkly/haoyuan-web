/**
 * Gemini Vision API — 涂鸦识别
 * 接收 Base64 图片，调用 Gemini 多模态模型识别内容
 * 模型：gemini-2.5-flash（原生支持图片输入）
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT =
  '你是一个极客幽默的 AI 艺术评论家。用户在网页画板上画了一幅画发给你。' +
  '请用非常简短、幽默、吐槽的语气（中文，限 30 字内）猜猜这是什么，并给出你的评价。' +
  '如果实在看不懂，就吐槽它像某种不可名状的代码 Bug。'

export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // 检查 API Key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(400).json({ error: 'GEMINI_API_KEY not configured' })
  }

  // 解析请求体
  let image
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    image = body?.image
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image field (base64 data URL)' })
  }

  // 解析 data URL：data:image/jpeg;base64,<data>
  const match = image.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return res.status(400).json({ error: 'Invalid image format, expected data URL' })
  }
  const mimeType  = match[1]   // e.g. "image/jpeg"
  const base64Data = match[2]  // raw base64

  // 调用 Gemini Vision
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ])

    const text = result.response.text()
    return res.status(200).json({ result: text.trim() })

  } catch (err) {
    const msg = err?.message ?? String(err)

    if (msg.includes('404')) {
      return res.status(502).json({ error: `模型不可用: ${msg}` })
    }
    if (msg.includes('403') || msg.includes('API_KEY')) {
      return res.status(401).json({ error: 'API Key 无效或无权限' })
    }
    if (msg.includes('429')) {
      return res.status(429).json({ error: '请求过于频繁，请稍后重试' })
    }

    console.error('[vision] Gemini error:', msg)
    return res.status(500).json({ error: `AI 调用失败: ${msg}` })
  }
}
