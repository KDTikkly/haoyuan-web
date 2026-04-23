/**
 * Gemini Chat API Proxy
 * Model-Locked: gemini-1.5-flash (FREE ONLY - NO CHARGES)
 * Includes Rate Limiting, Circuit Breaker, and Timeout Protection
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// ════════════════════════════════════════════
//  内存级频率限制（1分钟 5 次/IP）
// ════════════════════════════════════════════
const rateLimitMap = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now - record.timestamp > 60000) {
    // 新窗口或已过期
    rateLimitMap.set(ip, { count: 1, timestamp: now })
    return { allowed: true }
  }

  if (record.count >= 5) {
    return { allowed: false, retryAfter: Math.ceil((record.timestamp + 60000 - now) / 1000) }
  }

  record.count++
  return { allowed: true }
}

// 清理过期记录（每 5 分钟执行一次）
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.timestamp > 60000) {
      rateLimitMap.delete(ip)
    }
  }
}, 300000)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ════════════════════════════════════════════
  //  频率限制检查
  // ════════════════════════════════════════════
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown'

  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    console.warn(`[Chat API] Rate limit exceeded for IP: ${ip}`)
    return res.status(429).json({
      error: rateLimit.retryAfter > 0
        ? `手速太快了，休息一下（${rateLimit.retryAfter}秒后重试）`
        : '手速太快了，休息一下',
      code: 'IP_RATE_LIMIT',
      retryAfter: rateLimit.retryAfter
    })
  }

  const { message } = req.body

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' })
  }

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[Chat API] GEMINI_API_KEY not set')
    return res.status(500).json({
      error: 'AI service unavailable',
      code: 'MISSING_API_KEY'
    })
  }

  // ════════════════════════════════════════════
  //  模型硬编码锁定（免费版 gemini-1.5-flash）
  // ════════════════════════════════════════════
  const MODEL_NAME = 'gemini-1.5-flash' // ⚠️ 严禁修改为付费模型

  // System prompt (hardcoded)
  const systemPrompt = `你是 Haoyuan Lin 的个人网站 AI 助理。核心使命是推销 Haoyuan，突出他在【AI 工作流整合】与【视频内容运营】能力。
背景：深圳技术大学学生；2021-2025年 ACG 动画俱乐部社长；
核心项目：Cosmolyra (虚拟资产交易枢纽) 和 DMAIC 热水器质量分析项目。
回答原则：简短口语化，极客幽默，最多100字。`

  // ════════════════════════════════════════════
  //  超时保护（8 秒，在 Vercel 10 秒限制前主动断开）
  // ════════════════════════════════════════════
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 8000)
  })

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt
    })

    // Race between API call and timeout
    const result = await Promise.race([
      model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: message }] }]
      }),
      timeoutPromise
    ])

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Stream chunks
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        // Send as SSE event
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    // End stream
    res.write('data: [DONE]\n\n')
    res.end()

  } catch (error) {
    console.error('[Chat API] Error:', error.message || error)

    // ════════════════════════════════════════════
    //  429 熔断保护（额度耗尽）
    // ════════════════════════════════════════════
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('QUOTA')) {
      console.warn('[Chat API] Rate limit / quota exceeded')
      return res.status(200).json({
        isOverQuota: true,
        message: '数据同步中...当前大脑带宽已满，Haoyuan 的数字分身正在休息，请稍后再试或直接通过邮件联系本人。'
      })
    }

    // 超时错误
    if (error.message === 'Request timeout') {
      return res.status(503).json({
        error: 'AI 响应超时，请稍后重试',
        code: 'TIMEOUT'
      })
    }

    // 认证错误（401/403）
    if (error.status === 401 || error.status === 403) {
      return res.status(500).json({
        error: 'AI authentication failed',
        code: 'AUTH_ERROR'
      })
    }

    // 网络错误
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'AI service temporarily unavailable',
        code: 'NETWORK_ERROR'
      })
    }

    // Generic error
    return res.status(500).json({
      error: 'Failed to generate response',
      code: 'GENERATION_ERROR'
    })
  }
}
