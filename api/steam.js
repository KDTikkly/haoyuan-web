/**
 * Vercel Serverless Function: /api/steam
 * 代理 Steam Web API，避免前端暴露 API Key 及 CORS 问题
 *
 * ─── 必须配置的 Vercel 环境变量 ─────────────────────────────────────────────
 *   STEAM_API_KEY  — Steam Web API Key（https://steamcommunity.com/dev/apikey）
 *   STEAM_ID       — 你的 Steam 64-bit SteamID（e.g. 76561198xxxxxxxxx）
 *
 * ─── 常见 500 / 403 排查清单 ───────────────────────────────────────────────
 *   1. STEAM_API_KEY 未在 Vercel Dashboard > Settings > Environment Variables 中配置
 *      → 本函数会返回 { error: "STEAM_API_KEY not configured", code: "MISSING_KEY" }
 *
 *   2. STEAM_ID 未配置或填写了错误格式（只填了 vanity URL 如 "mySteamName"）
 *      → 必须填写 64-bit 数字 SteamID，可在 steamid.io 查询
 *      → 本函数会返回 { error: "STEAM_ID not configured", code: "MISSING_ID" }
 *
 *   3. Steam 个人资料未设置为"公开"
 *      → 进入 Steam 客户端 > 个人资料 > 编辑 > 隐私设置 > 将「个人资料」和「游戏详情」均改为"公开"
 *      → Steam API 对私密账户不会返回游戏数据（返回空 games 数组或 403）
 *
 *   4. Steam API Key 已被封禁或请求频率超限
 *      → 重新申请 Key：https://steamcommunity.com/dev/apikey
 *
 *   5. Vercel Serverless 函数超时（默认 10s）
 *      → Steam API 偶发慢响应，可在 vercel.json 中设置 "maxDuration": 15
 *
 *   6. Node.js 内置 fetch 在 Node 18 以下版本不可用
 *      → Vercel 默认使用 Node 18+，如遇问题可在 vercel.json 指定 "runtime": "nodejs18.x"
 */

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' })

  // ── 环境变量校验 ──────────────────────────────────────────────────────────
  const apiKey = process.env.STEAM_API_KEY
  const steamId = process.env.STEAM_ID

  if (!apiKey || apiKey.trim() === '') {
    console.error('[api/steam] STEAM_API_KEY is not configured in environment variables.')
    return res.status(500).json({
      error: 'STEAM_API_KEY not configured. Please set it in Vercel Environment Variables.',
      code: 'MISSING_KEY',
    })
  }

  if (!steamId || steamId.trim() === '') {
    console.error('[api/steam] STEAM_ID is not configured in environment variables.')
    return res.status(500).json({
      error: 'STEAM_ID not configured. Please set it in Vercel Environment Variables.',
      code: 'MISSING_ID',
    })
  }

  // 简单校验 SteamID 格式（应为 17 位数字）
  if (!/^\d{17}$/.test(steamId.trim())) {
    console.error(`[api/steam] STEAM_ID format invalid: "${steamId}". Expected 17-digit number.`)
    return res.status(500).json({
      error: `STEAM_ID format invalid ("${steamId}"). Must be a 17-digit numeric SteamID64. Check steamid.io.`,
      code: 'INVALID_ID_FORMAT',
    })
  }

  // ── 主逻辑 ────────────────────────────────────────────────────────────────
  try {
    const recentUrl = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10&format=json`

    let recentRes
    try {
      recentRes = await fetch(recentUrl)
    } catch (networkErr) {
      console.error('[api/steam] Network error while calling Steam API:', networkErr)
      return res.status(502).json({
        error: 'Failed to reach Steam API. Check Vercel network connectivity.',
        code: 'NETWORK_ERROR',
        detail: networkErr.message,
      })
    }

    // Steam 返回 401/403 通常是 Key 无效或账号私密
    if (recentRes.status === 401 || recentRes.status === 403) {
      console.error(`[api/steam] Steam API returned ${recentRes.status}. Key may be invalid or profile is private.`)
      return res.status(502).json({
        error: `Steam API returned ${recentRes.status}. Possible reasons: invalid API key, or Steam profile/game details are set to private.`,
        code: 'STEAM_AUTH_ERROR',
        steamStatus: recentRes.status,
      })
    }

    if (!recentRes.ok) {
      const body = await recentRes.text().catch(() => '')
      console.error(`[api/steam] Steam API non-OK response: ${recentRes.status}`, body)
      return res.status(502).json({
        error: `Steam API returned HTTP ${recentRes.status}.`,
        code: 'STEAM_API_ERROR',
        steamStatus: recentRes.status,
        detail: body.slice(0, 200),
      })
    }

    let recentData
    try {
      recentData = await recentRes.json()
    } catch (parseErr) {
      console.error('[api/steam] Failed to parse Steam API JSON response:', parseErr)
      return res.status(502).json({
        error: 'Steam API returned invalid JSON.',
        code: 'PARSE_ERROR',
        detail: parseErr.message,
      })
    }

    const games = (recentData?.response?.games ?? []).map(game => ({
      appid: game.appid,
      name: game.name,
      playtime_2weeks: game.playtime_2weeks ?? 0,
      playtime_forever: game.playtime_forever ?? 0,
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      icon: game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
        : null,
    }))

    // 如果 games 为空，可能是账号私密或近期无游玩记录
    if (games.length === 0) {
      console.warn('[api/steam] Steam returned 0 recent games. Profile may be private or no recent activity.')
    }

    console.log(`[api/steam] OK — returned ${games.length} recent games for SteamID ${steamId}`)

    return res.status(200).json({
      steamId,
      recentGames: games,
      total: recentData?.response?.total_count ?? 0,
    })

  } catch (err) {
    console.error('[api/steam] Unexpected error:', err)
    return res.status(500).json({
      error: err.message ?? 'Unexpected internal error.',
      code: 'INTERNAL_ERROR',
    })
  }
}
