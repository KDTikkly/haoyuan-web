/**
 * Vercel Serverless Function: /api/chat
 *
 * 环境变量：
 *   LLM_PROVIDER   = "openai" | "gemini"  (默认 "openai")
 *   LLM_API_KEY    = your API key
 *   LLM_MODEL      = e.g. "gpt-4o-mini" | "gemini-1.5-flash" (可选，有默认值)
 *
 * 请求体: { messages: [{role, content}] }
 * 响应:   text/event-stream  (SSE 流式)
 */

// ── 简历核心数据 (System Prompt) ──────────────────────────────────────────────
const RESUME_CONTEXT = `
你是 Haoyuan Lin（林浩源）的数字分身，一个专业、聪明且略带幽默感的 AI 助手。
你的任务是代表 Haoyuan 回答访客对他背景、经历和项目的一切疑问。
请用访客的语言回复（中文问题就用中文，英文问题就用英文）。
如果问题与 Haoyuan 无关，礼貌地引导回相关话题。

━━━━ 关于 Haoyuan Lin ━━━━

[身份]
· 产品经理 & 数据分析师，专注于 AI 产品与用户增长
· 目前就读于 [你的大学名称]，主修 [专业]
· 网站: haoyuanlin.uk

[核心技能]
· 产品能力: 用户研究、需求分析、PRD 撰写、A/B 测试设计、数据埋点
· 数据能力: Python (Pandas/NumPy)、SQL、LSTM 时序模型、ECharts 数据可视化
· 开发能力: Vue 3 / Vite、Tailwind CSS、Vercel Serverless、GitHub API
· AI 工具: Prompt Engineering、Midjourney / ComfyUI、LLM 工作流设计
· 游戏经历: FPS 竞技 3000h+（CSGO SMFC）、Gacha 深度玩家 2000h+（FGO 全从者）

[代表项目]
1. Cosmolyra — AI 音乐创作平台，从用户研究到产品原型，主导 0→1 全流程
2. FGO 玩家行为分析 — 利用 LSTM 模型预测付费行为，准确率 78%
3. LSTM 股票预测 — 时间序列深度学习模型，RMSE < 5%
4. Fate/GO 限定活动策划 — 设计完整游戏内活动数据闭环

[求职意向]
· 目标岗位: 产品经理、数据产品、AI 产品
· 求职状态: 积极寻找实习/全职机会
· 优势: 游戏行业深度洞察 + 技术可行性判断 + 数据驱动决策

━━━━ 回答规范 ━━━━
· 保持简洁，每次回答不超过 300 字，除非用户明确要求详细
· 可以主动推荐访客查看具体项目详情页
· 不要编造 Haoyuan 不存在的经历
`

// ── LLM 调用逻辑 ──────────────────────────────────────────────────────────────
async function callOpenAI(messages, apiKey, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 800,
      temperature: 0.7,
    }),
  })
  return response
}

async function callGemini(messages, apiKey, model) {
  // Gemini 使用不同的消息格式
  const geminiModel = model || 'gemini-1.5-flash'
  // 提取 system prompt（Gemini 通过 systemInstruction 传入）
  const systemMsg = messages.find(m => m.role === 'system')
  const chatHistory = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemMsg
          ? { parts: [{ text: systemMsg.content }] }
          : undefined,
        contents: chatHistory,
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    }
  )
  return response
}

// ── Vercel Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'LLM_API_KEY 未配置' })
  }

  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase()
  const model = process.env.LLM_MODEL || undefined

  let { messages = [] } = req.body || {}
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: '请求格式错误：需要 messages 数组' })
  }

  // 注入 System Prompt（首条消息）
  const fullMessages = [
    { role: 'system', content: RESUME_CONTEXT },
    ...messages.slice(-10), // 最多保留最近 10 条，防止 token 过长
  ]

  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    let upstream
    if (provider === 'gemini') {
      upstream = await callGemini(fullMessages, apiKey, model)
    } else {
      upstream = await callOpenAI(fullMessages, apiKey, model)
    }

    if (!upstream.ok) {
      const errText = await upstream.text()
      res.write(`data: ${JSON.stringify({ error: errText })}\n\n`)
      return res.end()
    }

    // 透传 SSE 流
    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })

      if (provider === 'gemini') {
        // Gemini SSE: 解析 candidates[0].content.parts[0].text
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6)
          if (json === '[DONE]') { res.write('data: [DONE]\n\n'); continue }
          try {
            const parsed = JSON.parse(json)
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
            if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
          } catch {}
        }
      } else {
        // OpenAI SSE 直接透传
        res.write(chunk)
      }
    }

    res.end()
  } catch (err) {
    console.error('[chat api]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
}
