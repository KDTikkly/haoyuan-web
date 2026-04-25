/**
 * Vercel Serverless Function: /api/verifyAdmin
 *
 * 简单密码验证接口，返回 { ok: true } 表示密码正确
 * 环境变量: ADMIN_PASSWORD
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body ?? {}
  const correct = process.env.ADMIN_PASSWORD

  if (!correct) return res.status(500).json({ error: 'ADMIN_PASSWORD 未配置' })
  if (password !== correct) return res.status(401).json({ error: '密码错误' })

  return res.status(200).json({ ok: true })
}
