/**
 * Vercel Serverless Function: /api/steam-owned
 * 返回完整的 Steam 库存游戏列表（含时长、封面）
 * 用于 FullLibraryPortal 全量游戏终端展示
 *
 * 响应格式: { games: SteamGame[], total: number }
 * Cache: 10 分钟（全量数据更新频率低）
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

  if (!apiKey || !steamId) {
    return res.status(400).json({
      error: 'STEAM_API_KEY or STEAM_ID not configured',
      code: 'MISSING_CONFIG',
    })
  }

  if (!/^\d{17}$/.test(steamId)) {
    return res.status(400).json({
      error: 'STEAM_ID must be a 17-digit SteamID64',
      code: 'INVALID_ID_FORMAT',
    })
  }

  try {
    const BASE = 'https://api.steampowered.com'
    // include_appinfo=1 返回游戏名称
    const url = `${BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`

    let resp
    try {
      resp = await fetch(url)
    } catch (networkErr) {
      return res.status(502).json({ error: 'Network error reaching Steam API', code: 'NETWORK_ERROR' })
    }

    if (resp.status === 401 || resp.status === 403) {
      return res.status(502).json({ error: 'Steam API auth error', code: 'STEAM_AUTH_ERROR' })
    }

    let data = {}
    if (resp.ok) {
      try { data = await resp.json() } catch { /* ignore */ }
    }

    const raw = data?.response?.games ?? []
    const total = data?.response?.game_count ?? raw.length

    const games = raw
      .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
      .map(game => ({
        appid:            game.appid,
        name:             game.name ?? `App ${game.appid}`,
        playtime_forever: game.playtime_forever ?? 0,
        playtime_2weeks:  game.playtime_2weeks  ?? 0,
        rtime_last_played: game.rtime_last_played ?? 0,
        // Steam CDN 封面 header.jpg（460×215）
        cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      }))

    console.log(`[api/steam-owned] OK — ${games.length}/${total} games returned`)
    return res.status(200).json({ games, total })

  } catch (err) {
    console.error('[api/steam-owned] Unexpected error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal error', code: 'INTERNAL_ERROR' })
  }
}
