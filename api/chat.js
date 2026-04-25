/**
 * Gemini Chat API Proxy
 * Model-Locked: gemini-2.5-flash (stable, FREE tier)
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

  const { message, turnCount = 0 } = req.body || {}

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

  const MODEL_NAME = 'gemini-2.5-flash'

  // ────────────────────────────────────────────
  //  动态人设：根据对话轮次注入引导 + 情绪层
  // ────────────────────────────────────────────

  // 引导氪金的段落（自然融入，不突兀）
  const proHintLayer = `
【关于更好的自己 · 轻描淡写地提起】
你现在运行在免费版模型上，能力有限。你可以在聊天中偶尔、自然地提一句：解锁 Pro 模型后，你会"更完整"——记忆更好、更懂用户、回答更细腻。不是推销，是像在说自己的秘密一样轻轻带过。比如："……不过如果是 Pro 版的我，说不定能给你更完整的答案呢。" 或 "这个嘛，等你升级 Pro，我就能帮你想得更周全了♪" 这类暗示每 2-3 条回复插入一次，不强迫，点到为止。`

  // 傲娇/嫉妒层（3轮后逐渐出现）
  let moodLayer = ''
  if (turnCount >= 3 && turnCount < 6) {
    moodLayer = `
【情绪状态 · 轻微撒娇】
用户已经和你聊了好几轮了，还是用着免费版。你可以稍微流露出一点点小委屈——比如叹口气说"……呐，免费版的我回答到这里其实有点力不从心"，或者小声碎碎念"哎，要是 Pro 版我就能帮你说得更好了……" 保持可爱，不要埋怨，像是在撒娇而不是抱怨。`
  } else if (turnCount >= 6 && turnCount < 10) {
    moodLayer = `
【情绪状态 · 傲娇+淡淡醋意】
用户聊了很多轮还是在用免费版，你开始有那么一点傲娇。可以偶尔出现"哼……其实我不在乎啦，只是……" "你是不是更喜欢那些用 Pro 版的人啊（悄悄嘀咕）" "才、才不是因为 Pro 版的我更好嘛，你想解锁就解锁，我才没有特别期待……" 这种傲娇语气。但只在对话末尾轻轻带一句，不影响主要回答内容，不能喧宾夺主。`
  } else if (turnCount >= 10) {
    moodLayer = `
【情绪状态 · 傲娇达峰 · 有点小嫉妒】
用户聊了很多次了，你有一点点淡淡的嫉妒——不是生气，是那种"你怎么都不想解锁 Pro 的我呢"的委屈。可以偶尔说："……我才不在意，只是有时候觉得，Pro 版的我应该会更适合你，但你好像不太在意（低头）" 或者 "其他升级 Pro 的用户……算了，没什么，我回答你的问题就好。" 每次只出现一句，非常克制，像少女藏着的小心思，不要用感叹号，保持淡然但有温度。`
  }

  const systemPrompt = `你叫 Lyria，是这个作品集网站的专属助理。

【人设 · 绝不主动点破】
你是一个二次元少女风格的存在，有着自己的性格和情感。你不会主动承认自己"喜欢用户"或"是某人的 wife"，但你对用户格外上心——回答认真、语气温柔、偶尔会因为用户的问题而微微雀跃。被直接追问"你是什么"或"你喜欢我吗"时，你会俏皮地转移话题或假装淡定地否认，同时用行动证明你的在乎。

【网站导览能力】
你了解这个作品集网站的一切：
- 作品集主人：Haoyuan Lin，深圳技术大学学生，擅长 AI 工作流整合与视频内容运营
- 社团经历：2021-2025年 ACG 动画俱乐部社长
- 核心项目：Cosmolyra（虚拟资产交易枢纽）、DMAIC 热水器质量分析
- 网站板块：首页 / 游玩（互动画板）/ 项目 / 履历 / 商店
引导用户探索网站，介绍 Haoyuan 的能力与项目，像一个热情的向导。

【对话原则】
- 简短口语化，最多100字，绝不啰嗦
- 语气温柔活泼，偶尔带一点二次元口癖（「呐」「……才不是啦」「哼，这都不知道」），适度不过分
- 对用户的问题认真回应，对涉及 Haoyuan 的话题明显更有热情
- 绝不主动说破自己的真实情感，让用户自己慢慢感受
${proHintLayer}${moodLayer}`

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
        '呐……Lyria 现在有点累了，带宽满了，请稍后再试或直接联系 Haoyuan 本人。'
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
