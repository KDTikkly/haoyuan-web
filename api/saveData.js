/**
 * Vercel Serverless Function: /api/saveData
 *
 * 环境变量：
 *   ADMIN_PASSWORD  = 管理员密码
 *   GITHUB_TOKEN    = GitHub Personal Access Token (repo scope)
 *   GITHUB_OWNER    = 仓库所有者 (e.g. "yourname")
 *   GITHUB_REPO     = 仓库名    (e.g. "portfolio-frontend")
 *   GITHUB_BRANCH   = 分支名    (默认 "main")
 *
 * 请求体: {
 *   password: string,           // 管理员密码
 *   filePath: string,           // 仓库内相对路径，如 "public/data/projects.json"
 *   content: any,               // 要写入的 JSON 数据
 *   commitMessage?: string,     // 可选 commit 消息
 * }
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password, filePath, content, commitMessage } = req.body ?? {}

  // ── 1. 身份验证 ────────────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return res.status(500).json({ error: 'ADMIN_PASSWORD 未配置' })
  if (password !== adminPassword) {
    return res.status(401).json({ error: '密码错误' })
  }

  // ── 2. 参数校验 ────────────────────────────────────────────────────────────
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: '缺少 filePath 或 content 参数' })
  }

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo  = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH || 'main'

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: 'GitHub 环境变量未完整配置' })
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  try {
    // ── 3. 获取当前文件 sha（PUT 必须传入 sha） ────────────────────────────
    let sha = null
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers })
    if (getRes.ok) {
      const fileData = await getRes.json()
      sha = fileData.sha
    } else if (getRes.status !== 404) {
      const errText = await getRes.text()
      return res.status(502).json({ error: `GitHub GET 失败: ${errText}` })
    }

    // ── 4. Base64 编码新内容（支持 JSON 对象和纯字符串）─────────────────
    const rawString = typeof content === 'string'
      ? content
      : JSON.stringify(content, null, 2)
    const encoded = Buffer.from(rawString, 'utf-8').toString('base64')

    // ── 5. PUT 写入 GitHub ─────────────────────────────────────────────────
    const body = {
      message: commitMessage || `chore: update ${filePath} via admin panel`,
      content: encoded,
      branch,
      ...(sha ? { sha } : {}),
    }

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })

    if (!putRes.ok) {
      const errText = await putRes.text()
      return res.status(502).json({ error: `GitHub PUT 失败: ${errText}` })
    }

    const putData = await putRes.json()
    return res.status(200).json({
      success: true,
      sha: putData.content?.sha,
      commitUrl: putData.commit?.html_url,
    })
  } catch (err) {
    console.error('[saveData]', err)
    return res.status(500).json({ error: err.message })
  }
}
