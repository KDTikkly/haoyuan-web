/**
 * Cloudinary 图片回退池
 * 包含所有已上传的 covers、games 封面和 gallery 图片（共 83 张）
 * 用于任何图片加载失败时随机替换
 *
 * 轮换策略：
 * - coverRotateIndex 是全局 reactive ref，每 ROTATE_INTERVAL ms 自增 1
 * - galleryFallback(id) 使用 (hash + rotateIndex) % pool.length
 *   → 同一 project 在同一轮换周期内 Card / SlideOver 取到同一张
 *   → 下一周期自动切换到下一张，实现定时轮换
 * - 初始值为随机数，确保每次页面刷新起始图不同
 */
import { ref } from 'vue'

/** 轮换间隔（毫秒）*/
const ROTATE_INTERVAL = 8000

/** 全局轮换索引（reactive，所有组件共享同一值） */
export const coverRotateIndex = ref(Math.floor(Math.random() * 1000))

// 启动定时器（模块加载时自动开始，单例）
let _rotateTimer: ReturnType<typeof setInterval> | null = null
export function startCoverRotation() {
  if (_rotateTimer) return
  _rotateTimer = setInterval(() => {
    coverRotateIndex.value += 1
  }, ROTATE_INTERVAL)
}
// 模块加载时立即启动
startCoverRotation()

const CLOUD_BASE = 'https://res.cloudinary.com/dvt7tc1z2/image/upload/f_auto,q_auto'

/** 确定性已知封面 URL（covers + games，8 张） */
export const KNOWN_COVER_URLS: string[] = [
  `${CLOUD_BASE}/portfolio/covers/cosmolyra.png`,
  `${CLOUD_BASE}/portfolio/covers/fgo.png`,
  `${CLOUD_BASE}/portfolio/covers/lstm.png`,
  `${CLOUD_BASE}/portfolio/covers/fate-only.png`,
  `${CLOUD_BASE}/portfolio/games/zzz.jpg`,
  `${CLOUD_BASE}/portfolio/games/bh3.png`,
  `${CLOUD_BASE}/portfolio/games/ww.jpg`,
  `${CLOUD_BASE}/portfolio/games/hsr.png`,
]

/** gallery 图片 Cloudinary URL（75 张，纯数字ID命名） */
export const GALLERY_URLS: string[] = [
  "36603677.png","39354502.jpg","51888943.png","52641447.png","53277128.png",
  "54746564.png","54853150.png","55578086.jpg","56310918.png","56623532.png",
  "57442016.png","58012479.png","58224192.png","59072859.png","59132091.png",
  "59135454.png","59166019.png","59173280.png","59173341.png","59227888.png",
  "59695820.png","59700558.png","59760469.png","59850688.png","59974050.png",
  "60038807.png","60098540.png","60167508.png","60194538.jpg","60314558.png",
  "60368482.jpg","60462035.png","60465839.png","60685966.png","60980844.jpg",
  "60994809.png","61015613.png","61200375.png","61259101.png","61309489.png",
  "61570156.png","61667665.jpg","61800997.jpg","61858131.png","62321869.png",
  "62348397.png","62499786.jpg","62794789.png","62867510.png","63040408.png",
  "63228826.png","63278576.png","63754946.png","63835037.jpg","64038783.png",
  "64060584.png","64141182.png","64146600.png","64286508.png","64501756.png",
  "64672286.jpg","64711786.jpg","64830720.jpg","64893608.jpg","64931664.png",
  "64988447.png","65006441.jpg","65108485.png","65169013.png","65215835.png",
  "65343325.jpg","65479376.png","65932398.png","66016094.png","66076048.png",
].map(f => `${CLOUD_BASE}/portfolio/gallery/${f}`)

/** 完整回退池（covers + games + gallery，共 83 张） */
export const FULL_FALLBACK_POOL: string[] = [...KNOWN_COVER_URLS, ...GALLERY_URLS]

/**
 * 确定性随机选取（同一 seed 每次选同一张，避免闪烁）
 * @param seed 任意字符串（通常是 game.id 或 project.id）
 * @param exclude 排除的 URL（避免选到原图自身）
 */
export function pickFallback(seed: string, exclude?: string): string {
  const pool = exclude
    ? FULL_FALLBACK_POOL.filter(u => u !== exclude)
    : FULL_FALLBACK_POOL
  const candidates = pool.length > 0 ? pool : FULL_FALLBACK_POOL
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return candidates[hash % candidates.length]
}

/**
 * 完全随机选一张（用于 steam cover fallback 等场景）
 */
export function pickRandomFallback(): string {
  return FULL_FALLBACK_POOL[Math.floor(Math.random() * FULL_FALLBACK_POOL.length)]
}

/**
 * 轮换式 gallery 回退图
 * - 以 id 的字符码之和 + 全局 coverRotateIndex 共同决定选图
 * - 同一 rotateIndex 周期内，同一 project 的 Card 与 SlideOver 取到同一张
 * - rotateIndex 自增后，所有卡片同步切换至下一张
 * @param id  project.id（用于区分不同项目，避免所有卡片显示同一张）
 */
export function galleryFallbackRotating(id: string): string {
  const hash = Array.from(id).reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  return GALLERY_URLS[(hash + coverRotateIndex.value) % GALLERY_URLS.length]
}
