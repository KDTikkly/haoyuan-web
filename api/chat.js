/**
 * Gemini Chat API Proxy
 * Model-Locked: gemini-2.0-flash (FREE ONLY - NO CHARGES)
 * v6.1: 移除 Vercel 不兼容的 setInterval；强化流式容错
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// ════════════════════════════════════════════
//  内存级频率限制（1分钟 5 次/IP）
//  注：Vercel Serverless 每次冷启动 Map 会重置，属预期行为
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

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[Chat API] GEMINI_API_KEY not set')
    return res.status(400).json({
      error: 'AI service not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
      code: 'MISSING_API_KEY',
    })
  }

  // ════════════════════════════════════════════
  //  提前设置 SSE 响应头（必须在任何 await 之前）
  // ════════════════════════════════════════════
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // SSE 错误工具函数（headers 已发送后只能走 SSE 传错误）
  const sendSSEError = (code, msg) => {
    try {
      res.write(`data: ${JSON.stringify({ error: msg, code })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    } catch { /* 连接已断开，忽略 */ }
  }

  const MODEL_NAME = 'gemini-2.5-flash-preview-04-17'

  const systemPrompt = `你是 Haoyuan Lin 的个人网站 AI 助理。核心使命是推销 Haoyuan，突出他在【AI 工作流整合】与【视频内容运营】能力。
背景：深圳技术大学学生；2021-2025年 ACG 动画俱乐部社长；
核心项目：Cosmolyra (虚拟资产交易枢纽) 和 DMAIC 热水器质量分析项目。
回答原则：简短口语化，极客幽默，最多100字。`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
    })

    // 超时控制：用 AbortSignal（Node 18+ 支持）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    let result
    try {
      result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
      })
    } catch (initErr) {
      clearTimeout(timeoutId)
      throw initErr
    }

    clearTimeout(timeoutId)

    // 流式写入
    for await (const chunk of result.stream) {
      let text = ''
      try {
        text = chunk.text()
      } catch {
        // 某些 chunk 可能没有 text()，跳过
        continue
      }
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()

  } catch (error) {
    console.error('[Chat API] Error:', error?.status, error?.message || error)

    // 429 / 额度耗尽
    if (
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.toUpperCase().includes('QUOTA') ||
      error?.message?.toUpperCase().includes('RESOURCE_EXHAUSTED')
    ) {
      console.warn('[Chat API] Quota / rate limit exceeded')
      sendSSEError(
        'OVER_QUOTA',
        '数据同步中...当前大脑带宽已满，Haoyuan 的数字分身正在休息，请稍后再试或直接通过邮件联系本人。'
      )
      return
    }

    // 超时（AbortError）
    if (error?.name === 'AbortError' || error?.message === 'Request timeout') {
      sendSSEError('TIMEOUT', 'AI 响应超时，请稍后重试')
      return
    }

    // 认证错误
    if (error?.status === 401 || error?.status === 403) {
      sendSSEError('AUTH_ERROR', 'AI key 认证失败，请检查 Vercel 环境变量 GEMINI_API_KEY')
      return
    }

    // 模型不存在 / 参数错误
    if (error?.status === 404 || error?.status === 400) {
      sendSSEError('MODEL_ERROR', `模型错误: ${error?.message || 'unknown'}`)
      return
    }

    // 通用错误
    sendSSEError('GENERATION_ERROR', `Failed to generate response: ${error?.message || 'unknown error'}`)
  }
}
