/**
 * Vercel Serverless Function: /api/steam
 * 代理 Steam Web API，避免前端暴露 API Key 及 CORS 问题
 *
 * 环境变量（在 Vercel Dashboard > Settings > Environment Variables 中配置）：
 *   STEAM_API_KEY  — Steam Web API Key (https://steamcommunity.com/dev/apikey)
 *   STEAM_ID       — 你的 Steam 64-bit ID (e.g. 76561198xxxxxxxxx)
 */

export default async function handler(req, res) {
  // CORS headers（允许前端同域调用）
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600') // 缓存5分钟

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const apiKey = process.env.STEAM_API_KEY
  const steamId = process.env.STEAM_ID

  if (!apiKey || !steamId) {
    return res.status(500).json({
      error: 'Missing STEAM_API_KEY or STEAM_ID environment variables',
    })
  }

  try {
    // 获取最近游玩的游戏（最多 10 款）
    const recentUrl = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10&format=json`
    const recentRes = await fetch(recentUrl)
    if (!recentRes.ok) throw new Error(`Steam API error: ${recentRes.status}`)
    const recentData = await recentRes.json()

    // 获取全部游戏总时长（可选，较慢）
    // const ownedUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&format=json`

    const games = (recentData?.response?.games ?? []).map(game => ({
      appid: game.appid,
      name: game.name,
      // 近两周游玩时长（分钟）
      playtime_2weeks: game.playtime_2weeks ?? 0,
      // 总游玩时长（分钟）
      playtime_forever: game.playtime_forever ?? 0,
      // Steam 封面图
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      icon: game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
        : null,
    }))

    return res.status(200).json({
      steamId,
      recentGames: games,
      total: recentData?.response?.total_count ?? 0,
    })
  } catch (err) {
    console.error('[api/steam] Error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal error' })
  }
}
