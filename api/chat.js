/**
 * Gemini Chat API Proxy
 * Model-Locked: gemini-1.5-flash (FREE ONLY - NO CHARGES)
 * v6.0: 修复 500 — SSE headers 前移，race 逻辑重构，容错加固
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
    if (now - record.timestamp > 60000) rateLimitMap.delete(ip)
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
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'

  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    console.warn(`[Chat API] Rate limit exceeded for IP: ${ip}`)
    return res.status(429).json({
      error:
        rateLimit.retryAfter > 0
          ? `手速太快了，休息一下（${rateLimit.retryAfter}秒后重试）`
          : '手速太快了，休息一下',
      code: 'IP_RATE_LIMIT',
      retryAfter: rateLimit.retryAfter,
    })
  }

  const { message } = req.body || {}

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required', code: 'EMPTY_MESSAGE' })
  }

  // Check API key — 缺失时返回 400（明确错误，非 500 崩溃）
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[Chat API] GEMINI_API_KEY not set')
    return res.status(400).json({
      error: 'AI service not configured',
      code: 'MISSING_API_KEY',
    })
  }

  // ════════════════════════════════════════════
  //  模型硬编码锁定（免费版 gemini-1.5-flash）
  // ════════════════════════════════════════════
  const MODEL_NAME = 'gemini-1.5-flash' // ⚠️ 严禁修改为付费模型

  const systemPrompt = `你是 Haoyuan Lin 的个人网站 AI 助理。核心使命是推销 Haoyuan，突出他在【AI 工作流整合】与【视频内容运营】能力。
背景：深圳技术大学学生；2021-2025年 ACG 动画俱乐部社长；
核心项目：Cosmolyra (虚拟资产交易枢纽) 和 DMAIC 热水器质量分析项目。
回答原则：简短口语化，极客幽默，最多100字。`

  // ════════════════════════════════════════════
  //  提前设置 SSE 响应头（必须在任何 await 之前）
  //  避免 Promise.race 结束后 setHeader 抛 "headers already sent"
  // ════════════════════════════════════════════
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁止 Nginx 缓冲

  // 标记：响应头已发送，错误处理不能再 res.status().json()
  let headersSent = true // 仅作标注，实际由 res.headersSent 决定

  // ════════════════════════════════════════════
  //  超时保护（8 秒）
  // ════════════════════════════════════════════
  const timeoutMs = 8000
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  })

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
    })

    // 只竞争"拿到 result 对象"，不包含流迭代
    const result = await Promise.race([
      model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
      }),
      timeoutPromise,
    ])

    // 取消超时计时器（race 已完成）
    clearTimeout(timeoutId)

    // 流式写入
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()

  } catch (error) {
    clearTimeout(timeoutId)
    console.error('[Chat API] Error:', error.message || error)

    // SSE 响应头已发送，只能通过 SSE 事件传递错误，不能再 res.status()
    const sendSSEError = (code, msg) => {
      try {
        res.write(`data: ${JSON.stringify({ error: msg, code })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
      } catch { /* 连接已断开 */ }
    }

    // 429 / 额度耗尽
    if (
      error.status === 429 ||
      error.message?.includes('429') ||
      error.message?.includes('QUOTA') ||
      error.message?.toLowerCase().includes('quota')
    ) {
      console.warn('[Chat API] Quota / rate limit exceeded')
      sendSSEError(
        'OVER_QUOTA',
        '数据同步中...当前大脑带宽已满，Haoyuan 的数字分身正在休息，请稍后再试或直接通过邮件联系本人。'
      )
      return
    }

    // 超时
    if (error.message === 'Request timeout') {
      sendSSEError('TIMEOUT', 'AI 响应超时，请稍后重试')
      return
    }

    // 认证错误
    if (error.status === 401 || error.status === 403) {
      sendSSEError('AUTH_ERROR', 'AI authentication failed')
      return
    }

    // 网络错误
    if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      sendSSEError('NETWORK_ERROR', 'AI service temporarily unavailable')
      return
    }

    // 通用错误
    sendSSEError('GENERATION_ERROR', 'Failed to generate response')
  }
}
