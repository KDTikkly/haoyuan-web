/**
 * Geo API — 根据 IP 返回推荐搜索引擎
 * 利用 Vercel 自动注入的 x-vercel-ip-country 请求头，无需第三方 GeoIP 服务
 * 中国大陆（CN）→ Edge（必应国际版）；其余 → Google
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600') // 客户端缓存 1 小时

  // Vercel 自动注入 ISO 3166-1 alpha-2 国家码
  const country =
    (req.headers['x-vercel-ip-country'] || '').toUpperCase().trim()

  const engine = country === 'CN' ? 'edge' : 'google'

  return res.status(200).json({ engine, country: country || 'unknown' })
}
