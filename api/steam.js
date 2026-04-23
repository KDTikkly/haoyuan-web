/**
 * Vercel Serverless Function: /api/steam
 * 代理 Steam Web API，返回：
 *   - recentGames   近期游戏列表
 *   - ownedStats    { totalGames, totalHours, estimatedValue }
 *
 * ─── 必须配置的 Vercel 环境变量 ─────────────────────────────────────────────
 *   STEAM_API_KEY  — Steam Web API Key（https://steamcommunity.com/dev/apikey）
 *   STEAM_ID       — 你的 Steam 64-bit SteamID（e.g. 76561198xxxxxxxxx）
 *
 * ─── 常见 500 / 403 排查清单 ───────────────────────────────────────────────
 *   ① STEAM_API_KEY 未在 Vercel Dashboard > Settings > Environment Variables 中配置
 *      → 函数返回 400 { code: "MISSING_KEY" }
 *   ② STEAM_ID 未配置或非 17 位数字
 *      → 函数返回 400 { code: "MISSING_ID" / "INVALID_ID_FORMAT" }
 *   ③ Steam 个人资料未设置为"公开"
 *      → Steam 返回空 games 数组或 403
 *   ④ Steam API Key 已被封禁或请求频率超限
 *      → 重新申请：https://steamcommunity.com/dev/apikey
 *   ⑤ Vercel Serverless 函数超时（默认 10s）
 *      → vercel.json 中设置 "maxDuration": 15
 */

/** 账号估值：Steam 估均价约 ¥30，打 5 折算已购比例 */
const AVG_PRICE_CNY = 30
const OWN_RATIO     = 0.5   // 平均只买了约一半的游戏

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' })

  // ── 环境变量校验（前置，立即返回 400，防止 500 崩溃）────────────────────
  const apiKey  = process.env.STEAM_API_KEY?.trim()
  const steamId = process.env.STEAM_ID?.trim()

  if (!apiKey) {
    console.error('[api/steam] STEAM_API_KEY not configured.')
    return res.status(400).json({
      error: 'STEAM_API_KEY not configured. Set it in Vercel Environment Variables.',
      code: 'MISSING_KEY',
    })
  }
  if (!steamId) {
    console.error('[api/steam] STEAM_ID not configured.')
    return res.status(400).json({
      error: 'STEAM_ID not configured. Set it in Vercel Environment Variables.',
      code: 'MISSING_ID',
    })
  }
  if (!/^\d{17}$/.test(steamId)) {
    console.error(`[api/steam] STEAM_ID format invalid: "${steamId}"`)
    return res.status(400).json({
      error: `STEAM_ID format invalid ("${steamId}"). Must be a 17-digit SteamID64.`,
      code: 'INVALID_ID_FORMAT',
    })
  }

  // ── 主逻辑 ────────────────────────────────────────────────────────────────
  try {
    const BASE = 'https://api.steampowered.com'
    const recentUrl = `${BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10&format=json`
    const ownedUrl  = `${BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_played_free_games=1&format=json`

    // 并行请求两个接口
    let recentRes, ownedRes
    try {
      ;[recentRes, ownedRes] = await Promise.all([fetch(recentUrl), fetch(ownedUrl)])
    } catch (networkErr) {
      console.error('[api/steam] Network error:', networkErr)
      return res.status(502).json({
        error: 'Failed to reach Steam API. Check Vercel network connectivity.',
        code: 'NETWORK_ERROR',
        detail: networkErr.message,
      })
    }

    // 处理 Auth 错误（401/403）
    for (const r of [recentRes, ownedRes]) {
      if (r.status === 401 || r.status === 403) {
        console.error(`[api/steam] Steam API returned ${r.status}.`)
        return res.status(502).json({
          error: `Steam API returned ${r.status}. Invalid API key or profile is private.`,
          code: 'STEAM_AUTH_ERROR',
          steamStatus: r.status,
        })
      }
    }

    // 解析 Recent
    let recentData = {}
    if (recentRes.ok) {
      try { recentData = await recentRes.json() } catch { /* ignore parse error */ }
    }

    // 解析 Owned
    let ownedData = {}
    if (ownedRes.ok) {
      try { ownedData = await ownedRes.json() } catch { /* ignore parse error */ }
    }

    // ── 构建 recentGames ──
    const games = (recentData?.response?.games ?? []).map(game => ({
      appid:            game.appid,
      name:             game.name,
      playtime_2weeks:  game.playtime_2weeks  ?? 0,
      playtime_forever: game.playtime_forever ?? 0,
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      icon: game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
        : null,
    }))

    // ── 构建 ownedStats ──
    const ownedList   = ownedData?.response?.games ?? []
    const totalGames  = ownedData?.response?.game_count ?? ownedList.length
    // 总游戏时长（分钟 → 小时，保留 1 位）
    const totalMins   = ownedList.reduce((s, g) => s + (g.playtime_forever ?? 0), 0)
    const totalHours  = Math.round(totalMins / 60 * 10) / 10
    // 账号估值：totalGames × 均价 × 购入率（取整到十位）
    const rawValue    = Math.round(totalGames * AVG_PRICE_CNY * OWN_RATIO / 10) * 10
    const estimatedValue = rawValue  // CNY

    if (games.length === 0) {
      console.warn('[api/steam] 0 recent games — profile may be private or no recent activity.')
    }

    console.log(`[api/steam] OK — recent:${games.length} owned:${totalGames} hours:${totalHours}`)

    return res.status(200).json({
      steamId,
      recentGames:  games,
      total:        recentData?.response?.total_count ?? 0,
      ownedStats: {
        totalGames,
        totalHours,
        estimatedValue,   // CNY，前端自行格式化
      },
    })

  } catch (err) {
    console.error('[api/steam] Unexpected error:', err)
    return res.status(500).json({
      error: err.message ?? 'Unexpected internal error.',
      code: 'INTERNAL_ERROR',
    })
  }
}
