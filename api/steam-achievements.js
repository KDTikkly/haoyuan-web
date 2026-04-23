/**
 * Vercel Serverless Function: /api/steam-achievements?appid=xxxxx
 * 懒加载单款游戏的成就数据：
 *   - total      成就总数
 *   - unlocked   已解锁数
 *   - pct        完成百分比（0-100）
 *
 * 使用 GetSchemaForGame（获取成就总数）+
 *      GetPlayerAchievements（获取玩家解锁数）并行请求
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })

  const apiKey  = process.env.STEAM_API_KEY?.trim()
  const steamId = process.env.STEAM_ID?.trim()

  if (!apiKey || !steamId)
    return res.status(400).json({ error: 'Missing Steam credentials', code: 'MISSING_CREDS' })

  const { appid } = req.query
  if (!appid || !/^\d+$/.test(appid))
    return res.status(400).json({ error: 'Missing or invalid appid', code: 'INVALID_APPID' })

  const BASE = 'https://api.steampowered.com'
  const schemaUrl  = `${BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appid}&format=json`
  const playerUrl  = `${BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appid}&format=json`

  try {
    const [schemaRes, playerRes] = await Promise.all([
      fetch(schemaUrl).catch(() => null),
      fetch(playerUrl).catch(() => null),
    ])

    // 获取成就总数（schema）
    let total = 0
    if (schemaRes?.ok) {
      try {
        const d = await schemaRes.json()
        total = d?.game?.availableGameStats?.achievements?.length ?? 0
      } catch { /* ignore */ }
    }

    // 获取玩家已解锁成就数
    let unlocked = 0
    let playerOk = false
    if (playerRes?.ok) {
      try {
        const d = await playerRes.json()
        if (d?.playerstats?.success && Array.isArray(d.playerstats.achievements)) {
          unlocked = d.playerstats.achievements.filter(a => a.achieved === 1).length
          if (total === 0) total = d.playerstats.achievements.length
          playerOk = true
        }
      } catch { /* ignore */ }
    }

    const pct = total > 0 ? Math.round(unlocked / total * 100) : 0

    return res.status(200).json({
      appid: Number(appid),
      total,
      unlocked,
      pct,
      playerOk,
    })
  } catch (err) {
    console.error('[api/steam-achievements]', err)
    return res.status(500).json({ error: err.message ?? 'Unexpected error', code: 'INTERNAL_ERROR' })
  }
}
