/**
 * SuperResEngine.js — Dual-Rail Super-Resolution Pipeline  (v1.1 — Nuclear Debug Pass)
 *
 * Architecture:
 *
 *   Rail A — Low-res scene (0.5× resolution)
 *     lowResCamera  →  lowResScene  →  WebGLRenderTarget
 *
 *   Rail B — Full-res upscale pass
 *     renderTarget.texture  →  highResScene (fullscreen quad)  →  highResCamera  →  screen
 *
 * ⚠️  ROOT CAUSE FIX (v1.1):
 *   VolumetricEngine._loop() calls _tick() then ALSO calls
 *   renderer.render(this.scene, this.camera) — overwriting the dual-rail
 *   output with an empty scene every frame.
 *   Fix: override _loop() so it never calls the base render() after _tick().
 *
 * Test anchor: red rotating BoxGeometry in lowResScene.
 * Expected: a soft-edged blurry red box on screen (0.5× upscaled).
 */

import * as THREE from 'three'
import { VolumetricEngine } from './VolumetricEngine.js'

// ─────────────────────────────────────────────────────────────
//  Procedural Earth shaders  (Rail A — lowResScene)
//
//  Fragment shader implements:
//    1. Multi-layer Fractal Brownian Motion (FBM) for continent mask
//    2. Ocean with high specular reflectivity (deep blue + sun glint)
//    3. Land with terrain normal perturbation (height-based slopes)
//    4. Atmosphere Fresnel rim (thin blue atmosphere at horizon)
//    5. Intentionally aliased at 0.5× resolution (visible jaggies)
//
//  No external textures — all procedural noise in GLSL.
// ─────────────────────────────────────────────────────────────

const VERT_EARTH = /* glsl */`
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
// ── FIX: local-space position for noise anchoring ──
// vLocalPosition = raw mesh-space vertex coordinate, NEVER multiplied by
// modelMatrix.  This anchors all procedural noise to the geometry itself,
// so continents and cloud bands follow the mesh when rotation.y changes.
varying vec3 vLocalPosition;

void main() {
  vUv            = uv;
  vNormal        = normalize(normalMatrix * normal);
  vWorldPos      = (modelMatrix * vec4(position, 1.0)).xyz;
  vViewDir       = normalize(cameraPosition - vWorldPos);
  // Directly assign local position — MUST NOT be multiplied by modelMatrix
  vLocalPosition = position;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG_EARTH = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;
// ── FIX: local-space position — noise coord system ──
// All procedural sampling MUST use vLocalPosition so that continents,
// coastlines, and cloud bands are anchored to mesh-local space.
// When the mesh rotates on Y, vLocalPosition rotates with it → textures follow.
varying vec3 vLocalPosition;

uniform float     uTime;
uniform vec3      uSunDir;
// uDetailLevel: 0.0 = raw/low-detail (3 oct), 1.0 = CAS/ultra-high (12 oct)
uniform float     uDetailLevel;
// uLandMask: 4096×2048 equirectangular land-sea mask
//   White (1.0) = land,  Black (0.0) = ocean
uniform sampler2D uLandMask;

// ── Hash & Noise ───────────────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                 hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x),
    f.y
  );
}

float hash3(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.xyz, p.yzx + 19.19);
  return fract(p.x * p.y * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i),              hash3(i+vec3(1,0,0)), f.x),
        mix(hash3(i+vec3(0,1,0)),  hash3(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i+vec3(0,0,1)),  hash3(i+vec3(1,0,1)), f.x),
        mix(hash3(i+vec3(0,1,1)),  hash3(i+vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

// ── FBM — up to 12 octaves, hard loop limit for GLSL compatibility ─
float fbm(vec3 p, int octaves) {
  float v = 0.0, a = 0.5, freq = 1.0;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    v    += a * noise3(p * freq);
    freq *= 2.0;
    a    *= 0.5;
  }
  return v;
}

// ── Ultra-high-freq micro-detail FBM (coastline rubble, 8-12 oct) ─
// Driven by uDetailLevel so RAW mode strips this entirely.
float fbmHF(vec3 p) {
  float v = 0.0, a = 0.5, freq = 1.0;
  // Base 4 octaves always present; extra 8 octaves gated by uDetailLevel
  int maxOct = 4 + int(uDetailLevel * 8.0);   // 4 (raw) … 12 (cas)
  for (int i = 0; i < 12; i++) {
    if (i >= maxOct) break;
    v    += a * noise3(p * freq);
    freq *= 2.0;
    a    *= 0.5;
  }
  return v;
}

// ── FBM-based normal perturbation ─────────────────────────────
// In CAS mode use 8 octaves for razor-sharp terrain micro-bumps.
vec3 fbmNormal(vec3 p, float eps) {
  int oct = 4 + int(uDetailLevel * 4.0);  // 4 (raw) … 8 (cas)
  float f0 = fbm(p, oct);
  float fx = fbm(p + vec3(eps, 0.0, 0.0), oct);
  float fy = fbm(p + vec3(0.0, eps, 0.0), oct);
  float fz = fbm(p + vec3(0.0, 0.0, eps), oct);
  return normalize(vec3(fx - f0, fy - f0, fz - f0));
}

// ── Schlick Fresnel ────────────────────────────────────────────
float fresnelSchlick(float cosTheta, float r0) {
  float c = 1.0 - cosTheta;
  return r0 + (1.0 - r0) * (c * c * c * c * c);
}

// ── Cook-Torrance GGX 微面高光 ─────────────────────────────────
//  D_GGX(N,H,α) = α² / (π·((N·H)²·(α²-1)+1)²)
//  G_Smith(N,V,L,α) ≈ G_schlick(N,V,α) · G_schlick(N,L,α)
//  F  = fresnelSchlick
//  Specular = D·G·F / (4·(N·V)·(N·L))
//
//  用于海洋镜面高光和大陆湿地反光（极度真实的物理基础）。
float ggxD(float NdotH, float roughness) {
  float a  = roughness * roughness;
  float a2 = a * a;
  float d  = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * d * d + 1e-7);
}
float schlickG1(float NdotX, float roughness) {
  float k = (roughness + 1.0);
  k = (k * k) / 8.0;
  return NdotX / (NdotX * (1.0 - k) + k + 1e-7);
}
vec3 cookTorranceSpec(vec3 N, vec3 V, vec3 L, float roughness, vec3 F0) {
  vec3  H      = normalize(V + L);
  float NdotH  = max(dot(N, H), 0.0);
  float NdotV  = max(dot(N, V), 0.0);
  float NdotL  = max(dot(N, L), 0.0);
  float D      = ggxD(NdotH, roughness);
  float G      = schlickG1(NdotV, roughness) * schlickG1(NdotL, roughness);
  vec3  F      = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return (D * G * F) / (4.0 * NdotV * NdotL + 1e-7);
}

// ── 极光带噪声 ─────────────────────────────────────────────────
//  生成垂直拉伸的流动带状噪声，用于南北极圈极光风暴。
//  原理：
//    1. 将球面局部坐标映射到"极圈柱坐标"（经度φ，高度y）
//    2. 在 φ 方向施加高频锯齿噪声 → 横向条带分解
//    3. 加入 uTime 纵向滚动 → 竖直向上的流动感
//    4. 颜色在青/紫/品红三极之间按噪声相位剧烈切换
//
//  @param sp        normalize(vLocalPosition)  球面单位向量
//  @param t         uTime  壁钟时间
//  @param detailLv  uDetailLevel  决定极光细节密度
float auroraBand(vec3 sp, float t, float detailLv) {
  // 极圈柱坐标
  float phi  = atan(sp.z, sp.x);                // 经度 [-π, π]
  float absY = abs(sp.y);                        // 纬度高度 |sin(lat)|

  // 极光仅出现在 |lat| ∈ [60°, 90°] → |sp.y| ∈ [0.87, 1.0]
  float auroraZone = smoothstep(0.82, 0.90, absY) * (1.0 - smoothstep(0.97, 1.0, absY));

  // 高频带状噪声（经度方向扰动 + 时间纵向滚动）
  int   stripOct = 3 + int(detailLv * 5.0);    // 3-8 oct
  float stripFreq = 5.0 + detailLv * 8.0;       // 密度随 CAS 增加
  vec3  stripPos = vec3(phi * stripFreq, absY * 22.0 - t * 0.55, t * 0.08);
  float strip    = fbm(stripPos, stripOct);

  // 仅保留高值带（smoothstep 截断低值 → 分离成离散光带）
  float band     = smoothstep(0.48, 0.62, strip);

  return band * auroraZone;
}

// ── 极光色彩映射 ───────────────────────────────────────────────
//  三极色相：青(0°) / 品红(300°) / 紫(270°)，随时间与位置剧烈切变
vec3 auroraColor(vec3 sp, float t) {
  float phi     = atan(sp.z, sp.x);
  float phase   = phi * 0.8 + t * 0.18 + fbm(sp * 3.0 + vec3(9.1, 2.3, 5.7), 3) * 2.0;
  float p01     = fract(phase / 6.2832);   // [0,1]
  // 三段线性 HSV 切变：
  //   0.0-0.33 → 青(0.5) ↔ 紫蓝(0.72)
  //   0.33-0.66→ 紫蓝(0.72) ↔ 品红(0.85)
  //   0.66-1.0 → 品红(0.85) ↔ 青(0.5)
  float hue;
  if (p01 < 0.33)       hue = mix(0.50, 0.72, p01 / 0.33);
  else if (p01 < 0.66)  hue = mix(0.72, 0.85, (p01 - 0.33) / 0.33);
  else                  hue = mix(0.85, 0.50, (p01 - 0.66) / 0.34);

  // HSV → RGB（饱和度=1，亮度=1）
  vec3 K = vec3(1.0, 2.0/3.0, 1.0/3.0);
  vec3 p = abs(fract(vec3(hue) + K) * 6.0 - 3.0);
  return clamp(p - 1.0, 0.0, 1.0);   // S=1, V=1
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // ── FIX: noisePos derived from vLocalPosition (mesh-local space) ──
  // normalize(vLocalPosition) gives a unit sphere surface point that is
  // rigidly locked to the mesh — it follows every degree of rotation.y.
  // Continent coastlines, terrain bumps, and ocean waves are all anchored here.
  vec3 noisePos = normalize(vLocalPosition) * 1.6 + vec3(3.7, 1.2, 0.8);

  // ── Continent mask — REALITY-ANCHORED HYBRID ─────────────────
  //
  //  Three-layer composition:
  //    Layer A: uLandMask texture — real 1:1 geographic silhouette
  //             Sampled via spherical UV derived from vLocalPosition so it
  //             co-rotates rigidly with the mesh when Earth spins.
  //             UV formula (equirectangular / plate carrée):
  //               U = atan(p.z, p.x) / (2π) + 0.5   → [0,1], Greenwich=0.5
  //               V = asin(p.y)      / π   + 0.5   → [0,1], equator=0.5
  //
  //    Layer B: High-freq FBM noise — micro-detail injection
  //             Used for: coastline jaggies, terrain micro-structure,
  //             sub-pixel fractal rubble.  Range maps to [-0.5, +0.5].
  //
  //    Fusion rule: isLand = maskGeo * (1 + fbmDetail * blend)
  //      - Ocean regions (maskGeo ≈ 0): FBM product ≈ 0 → stays ocean
  //      - Land regions  (maskGeo ≈ 1): FBM modulates coastline ±
  //      - Coastline band (maskGeo ≈ 0.5): maximum FBM detail injection
  //        producing the fractal sub-pixel jaggies at any zoom
  //
  //  Result: macro silhouette = 100% real geography
  //          micro coastline  = FBM procedural precision
  // ─────────────────────────────────────────────────────────────

  // ════════════════════════════════════════════════════════════
  //  STAGE 1 — DOMAIN WARPING  (空间扭曲注入)
  //
  //  目的：用高频 FBM 噪声扭曲地理贴图的采样 UV，将平滑的
  //  程序化海岸线撕裂成分形锯齿。
  //
  //  算法流程：
  //    a. 在球面局部坐标系中计算一层极高频 FBM（warpFbm），
  //       octave 数随 uDetailLevel 线性扩展（RAW=6, CAS=12）。
  //    b. 将 warpFbm 的两个正交偏导数（偏x / 偏z）作为二维
  //       偏移向量，注入到经纬度 UV 采样坐标中。
  //    c. 偏移幅度 = warpAmp：RAW 模式保留地理大轮廓，CAS 模式
  //       最大扭曲（~0.025 经纬度单位 ≈ 海岸线锯齿深达 ~2°）。
  //
  //  重要约束：warpPos 必须使用 vLocalPosition 推导，确保
  //  Domain Warping 随地球自转严格共转，不会产生 UV 漂移。
  // ════════════════════════════════════════════════════════════

  vec3 sp   = normalize(vLocalPosition);

  // ── 1a. Warp noise basis — 极高频 3-D FBM ──────────────────
  // 频率 8.0×：每经/纬度约 2-3 个噪声周期 → 海岸锯齿密度与真实
  // 卫星图吻合（典型河口 / 峡湾间距约 0.5-1°）。
  // 额外扰动 seed 向量防止与大陆轮廓噪声产生视觉相关性。
  vec3  warpPos  = sp * 8.0 + vec3(17.3, 5.1, 29.7);
  int   warpOct  = 6 + int(uDetailLevel * 6.0);   // RAW=6, CAS=12
  float eps_w    = 0.018;   // 偏导数采样步长（~1° 精度）
  float wF0  = fbm(warpPos,                       warpOct);
  float wFx  = fbm(warpPos + vec3(eps_w, 0.0, 0.0), warpOct);
  float wFz  = fbm(warpPos + vec3(0.0, 0.0, eps_w), warpOct);
  // 偏导数 → 切向扭曲向量（仅扰动经/纬方向，不影响法线方向）
  float dWx  = (wFx - wF0) / eps_w;   // ∂warp/∂lon
  float dWz  = (wFz - wF0) / eps_w;   // ∂warp/∂lat

  // ── 1b. 扭曲幅度：随 uDetailLevel 动态缩放 ─────────────────
  // RAW  (0.0): ±0.006  — 保留大陆轮廓，轻微边缘毛刺
  // CAS  (1.0): ±0.024  — 完全激活分形锯齿（最大 ~2.5° 偏移）
  float warpAmp = mix(0.006, 0.024, uDetailLevel);

  // ── 1c. 扭曲后的经纬度 UV ───────────────────────────────────
  // 基础 UV（球面等矩形投影，格林威治 = U=0.5，赤道 = V=0.5）
  float uLon0 = atan(sp.z, sp.x) / (2.0 * 3.14159265) + 0.5;
  float uLat0 = asin(clamp(sp.y, -1.0, 1.0)) / 3.14159265 + 0.5;
  // 注入扭曲偏移：dWx 扰动经度方向，dWz 扰动纬度方向
  float uLonW = uLon0 + dWx * warpAmp;
  float uLatW = uLat0 + dWz * warpAmp * 0.6;   // 纬度压缩因子 0.6 防止极地撕裂

  // 采样地理遮罩（用扭曲后的 UV）
  // 注意：clamp 而非 fract，防止极点处 UV 越界闪烁
  float maskRaw = texture2D(uLandMask, vec2(
    clamp(uLonW, 0.001, 0.999),
    clamp(1.0 - uLatW, 0.001, 0.999)
  )).r;

  // ── 1d. 非线性 smoothstep 融合阈值（浅滩过渡修正）────────────
  // 原始阈值 (0.35, 0.65) → 扭曲后海岸带变宽需收窄以保持地理精度。
  // 同时加入 FBM 高度场扰动：maskGeo 在近海区域（maskRaw < 0.55）
  // 受地势影响偏移，产生浅水礁盘 / 三角洲过渡感。
  float shallowBias = fbm(sp * 5.3 + vec3(2.1, 8.7, 4.4), 3) * 0.08 - 0.04;
  float coastEdge   = clamp(maskRaw + shallowBias, 0.0, 1.0);
  // 收窄 smoothstep 区间：(0.38, 0.58) → 边缘更锐利，与 DW 锯齿协同
  float maskGeo = smoothstep(0.38, 0.58, coastEdge);

  // ════════════════════════════════════════════════════════════
  //  STAGE 2 — 高频 FBM 微观细节（大陆内部地形纹理）
  // ════════════════════════════════════════════════════════════
  // RAW: 3+2+2=7 total oct  |  CAS: 8+6+5=19 total oct (clamped per fbm)
  int oct1 = 4 + int(uDetailLevel * 4.0);  // 4 … 8
  int oct2 = 3 + int(uDetailLevel * 3.0);  // 3 … 6
  int oct3 = 2 + int(uDetailLevel * 3.0);  // 2 … 5
  float fbm1 = fbm(noisePos,              oct1);
  float fbm2 = fbm(noisePos * 2.1 + 5.3, oct2);
  float fbm3 = fbm(noisePos * 4.7 + 2.9, oct3);

  // FBM detail in [-0.5, +0.5]: shifted so coast gets ± perturbation
  float fbmDetail = (fbm1 * 0.5 + fbm2 * 0.3 + fbm3 * 0.2) - 0.47;

  // ── Fusion: geographic silhouette × FBM fractal detail ────────
  float coastlinePeak = 1.0 - abs(maskGeo * 2.0 - 1.0);   // 0 at pure land/ocean, 1 at coast
  float detailBlend   = coastlinePeak * uDetailLevel * 0.55 + 0.10;
  float isLand        = clamp(maskGeo + fbmDetail * detailBlend, 0.0, 1.0);

  // ── Ultra-high-freq coastline rubble layer ─────────────────
  float hfDetail    = fbmHF(noisePos * 12.0);
  float coastlineMix = abs(isLand - 0.5) * 2.0;
  float coastRubble  = hfDetail * (1.0 - coastlineMix) * uDetailLevel * 0.12;
  isLand = clamp(isLand + coastRubble, 0.0, 1.0);

  vec3 sunDir = normalize(uSunDir);
  float NdotL  = max(dot(N, sunDir), 0.0);
  float diffuse = NdotL * 1.0 + 0.35;

  // ── Ocean ─────────────────────────────────────────────────
  float waveFreq  = mix(8.0, 28.0, uDetailLevel);
  float waveNoise = noise(vUv * waveFreq        + uTime * 0.15) * 0.5
                  + noise(vUv * waveFreq * 2.0  - uTime * 0.22) * 0.25;
  waveNoise += noise(vUv * 64.0 + uTime * 0.08) * 0.12 * uDetailLevel;

  vec3 oceanDeep  = vec3(0.02, 0.09, 0.28);
  vec3 oceanShall = vec3(0.05, 0.28, 0.55);
  vec3 oceanColor = mix(oceanDeep, oceanShall, waveNoise);

  // ── Land ──────────────────────────────────────────────────
  float elevation = fbm1;
  vec3 lowland  = vec3(0.12, 0.28, 0.08);
  vec3 highland = vec3(0.38, 0.28, 0.14);
  vec3 snowcap  = vec3(0.85, 0.88, 0.92);
  vec3 landColor = mix(lowland, highland, smoothstep(0.50, 0.70, elevation));
  landColor      = mix(landColor, snowcap, smoothstep(0.70, 0.85, elevation));

  float rockDetail = fbmHF(noisePos * 20.0) * uDetailLevel * 0.08;
  landColor *= 1.0 - rockDetail * (1.0 - smoothstep(0.70, 0.85, elevation));

  // ════════════════════════════════════════════════════════════
  //  STAGE 3 — 地质凸起演算（分形法线扰动）
  // ════════════════════════════════════════════════════════════

  float eps_n    = 0.015;
  vec3  geoPos   = noisePos * 1.6;
  vec3  microPos = noisePos * 16.0 + vec3(11.3, 7.2, 3.9);

  int geoOct   = 4;
  int microOct = 6 + int(uDetailLevel * 6.0);

  float gH0  = fbm(geoPos, geoOct)   * 0.65 + fbm(microPos, microOct) * 0.35;
  float gHx  = fbm(geoPos + vec3(eps_n,0.0,0.0), geoOct) * 0.65
             + fbm(microPos + vec3(eps_n,0.0,0.0), microOct) * 0.35;
  float gHy  = fbm(geoPos + vec3(0.0,eps_n,0.0), geoOct) * 0.65
             + fbm(microPos + vec3(0.0,eps_n,0.0), microOct) * 0.35;
  float gHz  = fbm(geoPos + vec3(0.0,0.0,eps_n), geoOct) * 0.65
             + fbm(microPos + vec3(0.0,0.0,eps_n), microOct) * 0.35;

  vec3 hGrad = vec3(gHx - gH0, gHy - gH0, gHz - gH0) / eps_n;

  float perturbStr = (0.20 + uDetailLevel * 0.45) * isLand;

  vec3 perturbedN = normalize(N + hGrad * perturbStr);

  float wEps   = 0.04;
  float wH0    = noise(vUv * 16.0 + uTime * 0.15);
  float wHu    = noise((vUv + vec2(wEps, 0.0)) * 16.0 + uTime * 0.15);
  float wHv    = noise((vUv + vec2(0.0, wEps)) * 16.0 + uTime * 0.15);
  vec3  waveN  = normalize(N + vec3((wHu-wH0)/wEps, (wHv-wH0)/wEps, 0.0) * 0.08 * (1.0 - isLand));

  vec3 finalN   = normalize(mix(waveN, perturbedN, isLand));
  float pertDiffuse = max(dot(finalN, sunDir), 0.0) + 0.35;

  // ── Cook-Torrance GGX 海洋镜面高光 ────────────────────────
  // 此处 finalN 已就绪（含波浪法线扰动），高光计算物理正确。
  // 海洋粗糙度：RAW=0.12（略模糊），CAS=0.04（接近镜面）
  // F0 = vec3(0.03..0.04)：水面折射率 n=1.33 的 Schlick 近似值
  float oceanRough = mix(0.12, 0.04, uDetailLevel);
  vec3  oceanF0    = vec3(0.03, 0.035, 0.04);
  vec3  ctSpec     = cookTorranceSpec(finalN, V, sunDir, oceanRough, oceanF0);
  // 叠加高光：PBR 镜面 × NdotL × 反照率系数 3.5，仅海洋区域
  oceanColor += ctSpec * NdotL * 3.5 * (1.0 - isLand);

  vec3 surfaceColor = mix(oceanColor * diffuse, landColor * pertDiffuse, isLand);

  // ════════════════════════════════════════════════════════════
  //  STAGE 4 — 云层物理阴影（Cloud Map + 太阳投影）
  //
  //  算法：
  //    a. 在地表法线方向上方 0.05 单位（云层高度偏移）重新采样云 FBM
  //    b. 将云遮罩投影回地表：光线从太阳方向穿越云层抵达地面
  //       shadowFactor = cloud * max(dot(cloudN, sunDir), 0) * shadowDepth
  //    c. 地表颜色 × (1 - shadowFactor) → 云投影阴影
  //    d. 云本身加 Fresnel 边缘发光（模拟 subsurface 散射）
  // ════════════════════════════════════════════════════════════
  int cloudOct = 3 + int(uDetailLevel * 4.0);
  float driftAngle = uTime * 0.012;
  float driftCos   = cos(driftAngle);
  float driftSin   = sin(driftAngle);
  vec3  localUnit  = normalize(vLocalPosition);
  vec3  driftedPos = vec3(
    localUnit.x * driftCos - localUnit.z * driftSin,
    localUnit.y,
    localUnit.x * driftSin + localUnit.z * driftCos
  );
  vec3 cloudPos = driftedPos * 3.1;
  float cloud   = smoothstep(0.52, 0.62, fbm(cloudPos, cloudOct));
  float cloudHF = smoothstep(0.60, 0.70, fbmHF(cloudPos * 2.5)) * uDetailLevel * 0.3;
  float cloudMask = cloud + cloudHF;

  // ── 云层投影阴影 ──────────────────────────────────────────
  // 云层高度偏移后重新计算 FBM，得到太阳方向上的"遮挡云"
  // cloudShadowPos = 地表位置 + 太阳反方向 * 云层高度 * 0.05
  vec3  cloudShadowPos = driftedPos * 3.1 + sunDir * 0.05;
  float shadowCloud    = smoothstep(0.50, 0.64, fbm(cloudShadowPos, cloudOct));
  // 阴影强度：受太阳高度角调制（太阳在地平线时阴影消失）
  float shadowStr  = shadowCloud * NdotL * mix(0.0, 0.55, uDetailLevel);
  surfaceColor    *= (1.0 - shadowStr * isLand);   // 仅阴影陆地（海洋有波光掩盖）

  // 云层颜色合成（保持原有白云逻辑）
  // 云的亮度随太阳高度增加（暗侧云 = 灰蓝色底边）
  vec3 cloudBright = vec3(0.95, 0.96, 0.98);
  vec3 cloudDark   = vec3(0.55, 0.60, 0.72);   // 云底阴影蓝灰色
  vec3 cloudColor  = mix(cloudDark, cloudBright, NdotL * 0.8 + 0.2);
  surfaceColor     = mix(surfaceColor, cloudColor, cloudMask * 0.62);

  // ════════════════════════════════════════════════════════════
  //  STAGE 5 — 增强 Rayleigh 散射大气光晕
  //
  //  标准 Fresnel rim 已实现大气边缘蓝圈。本阶段增强：
  //    a. 将 Rayleigh 散射分离为 R/G/B 三通道（λ⁻⁴ 比例近似）
  //       R : G : B = 1 : 1.44 : 2.88  → 边缘偏蓝更深
  //    b. 在昼夜交界处（terminator）加入橙/金色过渡层（折射染色）
  //    c. 大气厚度 = smoothstep(0, 0.35, NdotL)：仅白昼侧可见
  // ════════════════════════════════════════════════════════════
  float cosNV = max(dot(N, V), 0.0);
  float rim   = fresnelSchlick(cosNV, 0.0);
  rim         = pow(rim, 1.8);
  float rimDayMask = smoothstep(-0.1, 0.3, NdotL);

  // Rayleigh λ⁻⁴ 色散系数（归一化，以 B 为基准）
  const vec3 rayleighK = vec3(0.347, 0.5, 1.0);   // R:G:B ≈ 1:1.44:2.88
  vec3 rayleighColor = rayleighK * vec3(0.42, 0.72, 1.0);
  vec3 atmDay        = rayleighColor * rim * 1.6 * rimDayMask;

  // 晨昏线橙金大气色（太阳高度角 [-0.1, 0.15] 时最强）
  float terminatorMask = smoothstep(-0.12, 0.0, NdotL) * (1.0 - smoothstep(0.05, 0.20, NdotL));
  vec3  terminatorGlow = vec3(1.0, 0.45, 0.10) * rim * terminatorMask * 1.2;
  vec3  atmColor       = atmDay + terminatorGlow;

  // ════════════════════════════════════════════════════════════
  //  STAGE 6 — 夜半球：赛博夜灯色相扭曲 + 极光风暴
  //
  //  夜面判定：nightMask = 1 - smoothstep(-0.05, 0.15, NdotL)
  //
  //  A. 赛博城市夜灯（程序化点状噪声模拟灯火分布）：
  //     - 仅在陆地区域出现
  //     - 使用高频 FBM + smoothstep 提取亮点团
  //     - 色相强制扭曲为亮青（vec3(0.0,1.0,0.9)）和亮品红（vec3(1.0,0.0,0.8)）
  //       二者按低频噪声相位切换，产生赛博霓虹格局
  //
  //  B. 极光风暴（auroraBand + auroraColor）：
  //     - 仅在 |lat| ∈ [60°, 90°] 的极圈内激活
  //     - 垂直拉伸的流动带状噪声，色相在青/紫/品红三极剧烈切变
  //     - 亮度随 uDetailLevel 增强（RAW=微弱，CAS=暴力极光）
  // ════════════════════════════════════════════════════════════
  float nightMask = 1.0 - smoothstep(-0.05, 0.20, NdotL);   // 1=夜，0=昼

  // ── A. 赛博夜灯 ───────────────────────────────────────────
  // 城市灯火密度：用高频 FBM 模拟
  int cityOct  = 5 + int(uDetailLevel * 5.0);
  float cityF  = fbm(sp * 9.0 + vec3(3.3, 7.7, 1.1), cityOct);
  // smoothstep 提取亮点（模拟城市聚集区）
  float cityGlow = smoothstep(0.62, 0.72, cityF) * isLand;

  // 色相扭曲：按低频相位在亮青↔亮品红之间切换
  float cityPhase  = fbm(sp * 2.2 + vec3(5.5, 1.2, 8.8), 3);
  vec3  cyberCyan  = vec3(0.0, 1.0, 0.9);     // 亮青
  vec3  cyberMag   = vec3(1.0, 0.0, 0.85);    // 亮品红
  vec3  cityColor  = mix(cyberCyan, cyberMag, smoothstep(0.4, 0.6, cityPhase));
  // 中等亮度城市灯（不覆盖白昼大陆细节）
  float cityStr    = cityGlow * nightMask * mix(0.4, 1.2, uDetailLevel);
  surfaceColor    += cityColor * cityStr;

  // ── B. 极光风暴 ───────────────────────────────────────────
  float auroraInt = auroraBand(sp, uTime, uDetailLevel);
  vec3  auroraCol = auroraColor(sp, uTime);
  // 极光亮度：CAS 模式最大，RAW 模式仍可见（×0.3）
  float auroraStr = auroraInt * (0.3 + uDetailLevel * 1.0) * nightMask;
  // 极光轻微溢出到昼夜交界（现实中极光在极昼也可观测到微弱颜色）
  auroraStr      += auroraInt * 0.08 * (1.0 - nightMask) * smoothstep(0.85, 1.0, abs(sp.y));
  surfaceColor   += auroraCol * auroraStr * 1.8;

  // ── 最终合成 ─────────────────────────────────────────────
  vec3 col = surfaceColor + atmColor;
  col = clamp(col, 0.0, 1.0);
  float alpha = 1.0 - rim * 0.25;
  gl_FragColor = vec4(col, alpha);
}
`

// ─────────────────────────────────────────────────────────────
//  Moon shaders  (Rail A — lowResScene, secondary body)
//
//  Fragment shader implements:
//    1. 2-D Simplex-style noise for high-freq crater micro-texture
//    2. Radial crater SDF: each crater = smooth bowl depression
//    3. Mare basalt patches (dark flat lunar "seas") via low-freq FBM
//    4. Terminator shadow — hard NdotL with a tiny ambient floor
//    5. No atmosphere rim — bare rocky surface
// ─────────────────────────────────────────────────────────────

const VERT_MOON = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;
// ── FIX: local-space position — noise anchoring for craters / mare ──
// vLocalPosition must NOT be multiplied by modelMatrix.
// Crater positions and regolith noise are anchored to local mesh space,
// so tidal-locking rotation follows the geometry exactly.
varying vec3 vLocalPosition;

void main() {
  vUv           = uv;
  vNormal       = normalize(normalMatrix * normal);
  vWorldPos     = (modelMatrix * vec4(position, 1.0)).xyz;
  vViewDir      = normalize(cameraPosition - vWorldPos);
  vLocalPosition = position;
  gl_Position   = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG_MOON = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;
// ── FIX: local-space position — all noise sampling uses this ──
// Craters, mare basalt, and micro-regolith noise MUST be computed in
// local mesh space so they co-rotate with the mesh on tidal-lock update.
varying vec3 vLocalPosition;

uniform float uTime;
uniform vec3  uSunDir;
// uDetailLevel: 0.0 = raw/low, 1.0 = CAS/ultra-high
uniform float uDetailLevel;

// ── Permutation helpers (Simplex-style) ───────────────────────
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x)  { return mod289v4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// ── 3-D Simplex noise  [-1, 1] ─────────────────────────────────
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns   = n_ * D.wyz - D.xzx;
  vec4 j    = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_   = floor(j * ns.z);
  vec4 y_   = floor(j - 7.0 * x_);
  vec4 x    = x_ * ns.x + ns.yyyy;
  vec4 y    = y_ * ns.x + ns.yyyy;
  vec4 h    = 1.0 - abs(x) - abs(y);
  vec4 b0   = vec4(x.xy, y.xy);
  vec4 b1   = vec4(x.zw, y.zw);
  vec4 s0   = floor(b0) * 2.0 + 1.0;
  vec4 s1   = floor(b1) * 2.0 + 1.0;
  vec4 sh   = -step(h, vec4(0.0));
  vec4 a0   = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1   = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0   = vec3(a0.xy, h.x);
  vec3 p1   = vec3(a0.zw, h.y);
  vec3 p2   = vec3(a1.xy, h.z);
  vec3 p3   = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// ── FBM via snoise — up to 12 octaves ─────────────────────────
float fbmS(vec3 p, int oct) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 12; i++) {
    if (i >= oct) break;
    v += a * (snoise(p * f) * 0.5 + 0.5);
    f *= 2.0; a *= 0.5;
  }
  return v;
}

// ── Ultra-high-freq crater wrinkle layer ──────────────────────
// Simulates micro-regolith surface relief visible only in CAS mode.
float fbmMicro(vec3 p) {
  int maxOct = 4 + int(uDetailLevel * 8.0);  // 4 … 12
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 12; i++) {
    if (i >= maxOct) break;
    v += a * (snoise(p * f) * 0.5 + 0.5);
    f *= 2.0; a *= 0.5;
  }
  return v;
}

// ── Crater SDF ────────────────────────────────────────────────
float crater(vec2 uv, vec2 center, float radius, float rimWidth) {
  float d = length(uv - center) / radius;
  float bowl = 1.0 - smoothstep(0.0, 1.0, d);
  float rim  = smoothstep(1.0 - rimWidth, 1.0, d) * smoothstep(1.0 + rimWidth, 1.0, d);
  return max(bowl * 0.35, rim * 0.55);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // ── FIX: sp derived from vLocalPosition (mesh-local unit sphere) ──
  // Previously used vWorldPos - moonCenter which baked the world-space
  // offset and broke every time the moon orbital position changed.
  // normalize(vLocalPosition) is always a clean unit-sphere surface point
  // in local mesh space — craters are locked here regardless of orbit position
  // or tidal-lock rotation.y update in JS.
  vec3 sp = normalize(vLocalPosition);
  vec2 suv = vec2(
    atan(sp.z, sp.x) / (2.0 * 3.14159265) + 0.5,
    asin(clamp(sp.y, -1.0, 1.0)) / 3.14159265 + 0.5
  );

  // ── Noise layers — octave count scales with detail ─────────
  int microOct = 3 + int(uDetailLevel * 5.0);  // 3 … 8
  int medOct   = 2 + int(uDetailLevel * 3.0);  // 2 … 5
  float microNoise = snoise(sp * 14.0) * 0.5 + 0.5;
  float medNoise   = fbmS(sp * 6.0, medOct);
  // Ultra-high-freq micro-regolith wrinkles — only in CAS mode
  float microWrinkle = fbmMicro(sp * 40.0) * uDetailLevel;

  // ── Craters ────────────────────────────────────────────────
  float c0 = crater(suv, vec2(0.20, 0.55), 0.055, 0.20);
  float c1 = crater(suv, vec2(0.50, 0.40), 0.070, 0.18);
  float c2 = crater(suv, vec2(0.75, 0.65), 0.045, 0.22);
  float c3 = crater(suv, vec2(0.35, 0.72), 0.038, 0.25);
  float c4 = crater(suv, vec2(0.62, 0.28), 0.060, 0.20);
  float c5 = crater(suv, vec2(0.12, 0.32), 0.030, 0.28);
  float c6 = crater(suv, vec2(0.88, 0.48), 0.050, 0.22);
  // HF micro-craterlets — only in CAS mode
  float mc0 = crater(suv, vec2(0.30, 0.30), 0.010, 0.30) * uDetailLevel;
  float mc1 = crater(suv, vec2(0.65, 0.52), 0.008, 0.35) * uDetailLevel;
  float mc2 = crater(suv, vec2(0.45, 0.18), 0.012, 0.28) * uDetailLevel;
  float craterVal = max(
    max(max(c0,c1),max(c2,c3)),
    max(max(c4,c5), max(c6, max(mc0, max(mc1, mc2))))
  );

  // ── Mare basalt — higher detail in CAS mode ─────────────────
  int mareOct = 2 + int(uDetailLevel * 4.0);  // 2 … 6
  float mare  = fbmS(sp * 1.8 + vec3(5.1, 2.3, 0.7), mareOct);
  float isMare = smoothstep(0.55, 0.65, mare);

  vec3 highland  = vec3(0.68, 0.65, 0.60);
  vec3 mareCol   = vec3(0.25, 0.24, 0.22);
  vec3 craterRim = vec3(0.82, 0.80, 0.76);

  vec3 baseCol = mix(highland, mareCol, isMare);
  // Micro-noise modulation — enhanced with wrinkle in CAS mode
  baseCol *= 0.80 + 0.20 * mix(microNoise, microWrinkle, uDetailLevel * 0.5);
  baseCol  = mix(baseCol, craterRim, craterVal);
  baseCol *= 1.0 - craterVal * 0.35;
  baseCol *= 0.90 + 0.10 * medNoise;

  // ── Terminator lighting ────────────────────────────────────
  vec3 sunDir = normalize(uSunDir);
  float NdotL  = max(dot(N, sunDir), 0.0);
  vec3 col = baseCol * NdotL;
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`

// ─────────────────────────────────────────────────────────────
//  Deep-space volumetric background  (Rail A — lowResScene)
//
//  Rendered on the inner surface of a large sphere enclosing the
//  entire Earth–Moon system.  Simulates:
//    1. Star field — hashed point distribution, 2 brightness tiers
//    2. Nebula wisps — 3-D FBM colour clouds (subtle, low alpha)
//    3. Volumetric forward-scatter haze — Henyey–Greenstein phase
//       function for directional glow around the sun
//    4. Rendered with BackSide so it is always behind the planets
// ─────────────────────────────────────────────────────────────

const VERT_SPACE = /* glsl */`
precision highp float;

varying vec3 vWorldDir;

void main() {
  // Direction in world space — no model transform for the skybox
  vWorldDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG_SPACE = /* glsl */`
precision highp float;

varying vec3 vWorldDir;

uniform float uTime;
uniform vec3  uSunDir;

// ── Hash & noise utilities ─────────────────────────────────────
float hash31(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p, p.yzx + 19.19);
  return fract(p.x * p.y * p.z);
}
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise3s(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash31(i),           hash31(i+vec3(1,0,0)),f.x),
        mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
        mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),
    f.z);
}
float fbmSpace(vec3 p, int oct) {
  float v=0.0,a=0.5,f=1.0;
  for(int i=0;i<5;i++){
    if(i>=oct) break;
    v+=a*noise3s(p*f); f*=2.0; a*=0.5;
  }
  return v;
}

// ── Star field ─────────────────────────────────────────────────
// Tile direction into cells, place one star per cell stochastically.
float starField(vec3 dir, float cellScale, float threshold) {
  // Convert direction to a 2-D cell coordinate on a pseudo-sphere
  vec2 cell = floor(dir.xy * cellScale + dir.z * 3.7);
  float h = hash21(cell);
  if (h < threshold) return 0.0;
  // Sub-cell position of the star
  vec2 starPos = (cell + vec2(hash21(cell + 0.5), hash21(cell + 1.3))) / cellScale;
  float dist   = length(dir.xy - starPos + dir.z * 0.1) * cellScale;
  float bright = smoothstep(0.45, 0.10, dist) * ((h - threshold) / (1.0 - threshold));
  return bright;
}

// ── Henyey–Greenstein phase (forward scatter) ─────────────────
float hg(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * 3.14159265 * pow(1.0 + g2 - 2.0*g*cosTheta, 1.5));
}

void main() {
  vec3 dir = normalize(vWorldDir);

  // ── Stars (two tiers: dense dim + sparse bright) ──────────
  float dimStars    = starField(dir, 38.0, 0.92) * 0.55;
  float brightStars = starField(dir, 14.0, 0.96) * 1.00;
  // Subtle twinkle via time-based noise
  float twinkle = 0.85 + 0.15 * noise3s(dir * 12.0 + uTime * 0.4);
  float stars = (dimStars + brightStars) * twinkle;

  // ── Nebula colour wisps ────────────────────────────────────
  vec3 nebulaPos = dir * 2.5 + vec3(uTime * 0.002, 0.0, 0.0);
  float neb1 = fbmSpace(nebulaPos,         4);
  float neb2 = fbmSpace(nebulaPos * 2.3 + vec3(4.1, 2.7, 1.3), 3);
  float nebMask = smoothstep(0.52, 0.70, neb1 * 0.6 + neb2 * 0.4);

  // Two nebula hue bands
  vec3 nebColA = vec3(0.25, 0.10, 0.45);   // violet
  vec3 nebColB = vec3(0.05, 0.18, 0.35);   // teal-blue
  float hueBlend = noise3s(dir * 1.8 + vec3(2.2, 0.5, 3.1));
  vec3 nebColor = mix(nebColA, nebColB, hueBlend) * nebMask * 0.18;

  // ── Directional sun glow (Henyey–Greenstein forward scatter) ─
  vec3 sunDir = normalize(uSunDir);
  float cosTheta = dot(dir, sunDir);
  float glow = hg(cosTheta, 0.72) * 0.0015;   // very subtle corona
  vec3  glowCol = vec3(1.0, 0.82, 0.55) * glow;

  // ── Deep space base (near-black void) ─────────────────────
  vec3 spaceBase = vec3(0.006, 0.008, 0.015);

  // ── Compose ───────────────────────────────────────────────
  vec3 col = spaceBase + nebColor + glowCol;
  col += vec3(stars) * vec3(0.92, 0.94, 1.00);   // slight cool-white stars
  col = clamp(col, 0.0, 1.0);

  // Alpha: mostly opaque dark sky, slightly transparent so the CSS
  // background peeks through in the absolute darkest regions
  float alpha = min(0.96, dot(col, vec3(0.5)) * 8.0 + 0.72);

  gl_FragColor = vec4(col, alpha);
}
`

// ─────────────────────────────────────────────────────────────
//  Rail B — CAS (Contrast-Adaptive Sharpening) upscale pass
//
//  Algorithm outline (AMD FidelityFX CAS simplified for WebGL):
//
//    1. Sample 5-tap cross neighbourhood of the low-res texture:
//         C (centre), N (up), S (down), W (left), E (right)
//
//    2. Compute per-channel luminance for each tap.
//         luma = dot(rgb, vec3(0.299, 0.587, 0.114))
//
//    3. Detect local contrast range:
//         mnLuma = min(C, N, S, W, E)
//         mxLuma = max(C, N, S, W, E)
//
//    4. Derive sharpening weight w using the CAS adaptive formula:
//         w = -0.125 * (contrast / (mxLuma + ε))
//         where contrast = mnLuma / mxLuma
//       High-contrast regions (crystal edges, dispersion highlights) →
//       smaller |w|; low-contrast interior → stronger push.
//       The formula naturally backs off at very bright highlights to
//       avoid haloing on the Fresnel rim.
//
//    5. Blend: sharpened = (C*w + N*w + S*w + W*w + E*w) / (4w + 1)
//       This is a unsharp-mask-style filter driven by the local
//       luma variance, not a fixed kernel.
//
//    6. Alpha is taken straight from centre tap to preserve
//       transparency compositing over the CSS grid/grain background.
//
//  Tunables (uniforms):
//    uSharpness  — [0, 1]  overall sharpening strength (default 0.85)
//    uTexelSize  — vec2    1/screenWidth, 1/screenHeight (set in JS)
// ─────────────────────────────────────────────────────────────

const VERT_UPSCALE = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG_UPSCALE = /* glsl */`
precision highp float;

uniform sampler2D uLowResTex;
uniform vec2      uTexelSize;     // vec2(1/W, 1/H) in screen pixels
uniform float     uSharpness;     // 0 = off, 1 = max CAS push (default 0.85)
uniform float     uTime;          // wall-clock seconds — for film grain animation
uniform float     uGrainStr;      // grain strength: 0.0 = off, 1.0 = full
// uSuperSample: 0.0 = normal CAS, 1.0 = SINGULARITY 5.0x sub-pixel mode
// In 5.0x mode the FBO was rendered at 5× native density, so each screen texel
// maps to 25 physical source samples.  We exploit this surplus to perform
// sub-pixel edge reconstruction before the CAS pass.
uniform float     uSuperSample;
// uScaleFactor: dynamic sharpness attenuation guard against white-edge halos.
// Value = 1 / (scale^0.35), injected by setResolutionTier().
//   scale=1  → 1.000 (identity)
//   scale=5  → 0.617 (SINGULARITY — absorbs CAS overshoot at 25× pixel density)
// Keeps ice-crystal clarity without ringing artefacts at the geometry edges.
uniform float     uScaleFactor;

varying vec2 vUv;

// ── Luminance ─────────────────────────────────────────────────
float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// ── Film grain — animated, blue-noise approximation ──────────
float filmGrain(vec2 uv, float time) {
  float tick = floor(time * 24.0);
  vec2 seed  = uv * 512.0 + vec2(tick * 17.31, tick * 11.73);
  float h1 = fract(sin(dot(seed,               vec2(127.1, 311.7))) * 43758.5453);
  float h2 = fract(sin(dot(seed + 0.5,         vec2(269.5, 183.3))) * 43758.5453);
  float h3 = fract(sin(dot(seed + vec2(0.5,0), vec2(419.2, 371.9))) * 43758.5453);
  return (h1 + h2 + h3) / 3.0 - 0.5;
}

// ── Sub-pixel edge reconstruction (HYPER CALCULUS 2.0x path) ──
//
// In 2.0x super-sampling mode the source texture has 4× the texel
// density of the output display.  We use the quarter-pixel offsets
// (±0.25 texel) to detect directional luma gradients that are
// invisible at 1x resolution.  This produces knife-edge sharpening
// on coastlines and terrain boundaries without halo amplification.
//
// Algorithm:
//   1. Sample 8 sub-pixel positions at ±0.25 texel offsets
//   2. Compute directional gradient magnitudes (horizontal + vertical)
//   3. Derive an edge orientation angle θ from gradient direction
//   4. Apply a directional unsharp mask ALONG the edge tangent,
//      avoiding contrast boost across the edge (which causes halos)
//   5. Return the sub-pixel refined colour for the CAS input
//
vec3 subPixelEdgeSmooth(vec2 uv, vec2 ts, vec3 centre) {
  float qx = ts.x * 0.25;   // quarter-texel X
  float qy = ts.y * 0.25;   // quarter-texel Y

  // 8 sub-pixel samples at ±0.25 and ±0.5 texel
  vec3 s00 = texture2D(uLowResTex, uv + vec2(-qx*2.0, -qy*2.0)).rgb;
  vec3 s10 = texture2D(uLowResTex, uv + vec2(      0, -qy*2.0)).rgb;
  vec3 s20 = texture2D(uLowResTex, uv + vec2( qx*2.0, -qy*2.0)).rgb;
  vec3 s01 = texture2D(uLowResTex, uv + vec2(-qx*2.0,       0)).rgb;
  vec3 s21 = texture2D(uLowResTex, uv + vec2( qx*2.0,       0)).rgb;
  vec3 s02 = texture2D(uLowResTex, uv + vec2(-qx*2.0,  qy*2.0)).rgb;
  vec3 s12 = texture2D(uLowResTex, uv + vec2(      0,  qy*2.0)).rgb;
  vec3 s22 = texture2D(uLowResTex, uv + vec2( qx*2.0,  qy*2.0)).rgb;

  // Sobel gradient — separable 3×3 kernel
  float l00 = luma(s00); float l10 = luma(s10); float l20 = luma(s20);
  float l01 = luma(s01);                         float l21 = luma(s21);
  float l02 = luma(s02); float l12 = luma(s12); float l22 = luma(s22);

  float gx = (-l00 + l20) + 2.0*(-l01 + l21) + (-l02 + l22);
  float gy = (-l00 - 2.0*l10 - l20) + (l02 + 2.0*l12 + l22);

  float gradMag = sqrt(gx*gx + gy*gy);

  // Edge tangent direction (perpendicular to gradient)
  // tx = -gy/mag,  ty = gx/mag
  float invMag = 1.0 / (gradMag + 1e-5);
  float tx = -gy * invMag;
  float ty =  gx * invMag;

  // Directional unsharp mask along the edge TANGENT (not the gradient).
  // Samples at ±half-texel along tangent → only sharpens parallel to edge.
  vec3 tA = texture2D(uLowResTex, uv + vec2(tx * qx, ty * qy)).rgb;
  vec3 tB = texture2D(uLowResTex, uv - vec2(tx * qx, ty * qy)).rgb;
  vec3 tangentMean = (tA + tB) * 0.5;

  // Unsharp amount scales with gradient magnitude and uSharpness.
  // Hard cap at 0.18 to prevent runaway sharpening on micro-noise.
  float amt = min(gradMag * uSharpness * 0.22, 0.18);
  vec3 sharpened = centre + (centre - tangentMean) * amt;

  return clamp(sharpened, vec3(0.0), vec3(1.0));
}

void main() {
  float hx = uTexelSize.x;
  float hy = uTexelSize.y;

  // ── In SINGULARITY mode: use sub-texel offsets to match the 5× FBO ─
  // The FBO is 5× screen resolution, so one screen texel = 0.2 FBO texels.
  // Stepping by 0.2 texel here aligns CAS taps with actual FBO sample centres.
  float stepX = mix(hx,        hx * 0.2, uSuperSample);
  float stepY = mix(hy,        hy * 0.2, uSuperSample);
  float hx2   = stepX * 0.5;
  float hy2   = stepY * 0.5;

  vec4 tC  = texture2D(uLowResTex, vUv);
  vec4 tN  = texture2D(uLowResTex, vUv + vec2( 0.0,   stepY));
  vec4 tS  = texture2D(uLowResTex, vUv + vec2( 0.0,  -stepY));
  vec4 tW  = texture2D(uLowResTex, vUv + vec2(-stepX,  0.0));
  vec4 tE  = texture2D(uLowResTex, vUv + vec2( stepX,  0.0));
  // Diagonal sub-pixel taps
  vec4 tNE = texture2D(uLowResTex, vUv + vec2( hx2,  hy2));
  vec4 tNW = texture2D(uLowResTex, vUv + vec2(-hx2,  hy2));
  vec4 tSE = texture2D(uLowResTex, vUv + vec2( hx2, -hy2));
  vec4 tSW = texture2D(uLowResTex, vUv + vec2(-hx2, -hy2));

  // ── SINGULARITY: sub-pixel edge reconstruction pre-pass ───────────
  // Replace centre colour with the directional-unsharp-mask refined version.
  // In normal CAS mode uSuperSample=0 → mix weight=0 → pass-through.
  vec3 centreRefined = mix(
    tC.rgb,
    subPixelEdgeSmooth(vUv, vec2(stepX, stepY), tC.rgb),
    uSuperSample
  );

  float lC    = luma(centreRefined);
  float lN    = luma(tN.rgb);
  float lS    = luma(tS.rgb);
  float lW    = luma(tW.rgb);
  float lE    = luma(tE.rgb);
  float lDiag = (luma(tNE.rgb) + luma(tNW.rgb) + luma(tSE.rgb) + luma(tSW.rgb)) * 0.25;

  float mnL = min(min(lC, min(min(lN, lS), min(lW, lE))), lDiag);
  float mxL = max(max(lC, max(max(lN, lS), max(lW, lE))), lDiag);

  // ── CAS adaptive sharpening weight — SINGULARITY precision guard ──────────
  // In super-sample mode the contrast data is ultra-precise (25× sampling).
  // Raw boost: 1.35× for directional sub-pixel refinement.
  // Scale guard: ×uScaleFactor = 1/(scale^0.35) attenuates overshoot at 5×.
  //   Combined: 1.35 × 0.617 ≈ 0.833 — controlled ice-crystal sharpness,
  //   no white-edge ringing even at the maximum magnification.
  float sharpBoost = mix(1.0, 1.35 * uScaleFactor, uSuperSample);
  float contrast = sqrt(mnL / (mxL + 1e-4));
  float w = contrast * (-0.125 * uSharpness * sharpBoost);

  float denom = 1.0 + 4.0 * w;
  vec3  cas   = (centreRefined + (tN.rgb + tS.rgb + tW.rgb + tE.rgb) * w) / denom;
  cas = clamp(cas, vec3(0.0), vec3(1.0));

  // ── Film grain overlay ────────────────────────────────────────────────
  float grain = filmGrain(vUv, uTime);
  cas += grain * uGrainStr * 0.04;
  cas  = clamp(cas, 0.0, 1.0);

  gl_FragColor = vec4(cas, tC.a);
}
`

// ─────────────────────────────────────────────────────────────
//  SuperResEngine
// ─────────────────────────────────────────────────────────────

export class SuperResEngine extends VolumetricEngine {
  /**
   * @param {HTMLElement} container
   * @param {object}  [opts]
   * @param {number}  [opts.scale=0.5]  low-res scale (0 < scale ≤ 1)
   */
  constructor(container, opts = {}) {
    super(container, opts)

    // ── DEFAULT: 0.15× extreme low-res — system boots in RAW/mosaic ruin ──
    // opts.scale is intentionally ignored for the initial state.
    // setCasEnabled(true) will switch to 1.0× when the user engages the toggle.
    this._scale = 0.15

    this.renderTarget     = null
    this.lowResScene      = null
    this.lowResCamera     = null
    this.highResScene     = null
    this.highResCamera    = null
    this._upscaleMaterial = null
    this._testCube        = null
    this._moonMat         = null
    this._moonMesh        = null
    this._spaceMat        = null
    this._spaceMesh       = null

    // Celestial dynamics properties
    this._celestialGroup  = null   // Root group containing earth-moon system
    this._sunLight        = null   // Directional light for shadow casting
    this._polarGrid       = null   // Absolute reference: fluorescent polar grid
    this._orbitLine       = null   // Absolute reference: white lunar orbit ellipse

    // ── Independent wall-clock timer for celestial dynamics ──
    // Intentionally decoupled from _elapsedSec so rotation is immune
    // to any base-class time-tracking issues (NaN, uninitialised, etc.)
    this._celestialStartTime = performance.now()  // ms — set at construction
    this._celestialPrevTime  = this._celestialStartTime  // for delta accumulation

    // Orbital parameters (all angles in radians)
    this._orbitParams = {
      earthRotationSpeed: 0.18,           // Earth Y-axis self-rotation (rad/s) — ~35s/revolution, clearly visible
      moonOrbitSpeed:     0.08,           // Moon orbit angular speed (rad/s) — ~78s/orbit, clearly visible
      moonOrbitRadius:    2.8,            // Semi-major axis
      moonOrbitTilt:      Math.PI * 0.08,  // Orbital inclination (~14.4°)
      moonOrbitEccentricity: 0.1,         // Orbit eccentricity (0=circle, <0.5=ellipse)
      globalYawSpeed:     0.006,          // System group global Y-axis rotation (rad/s)
    }
  }

  // ══════════════════════════════════════════════════════════
  //  _buildScene()  — VolumetricEngine.mount() calls this after
  //  the renderer is ready.
  // ══════════════════════════════════════════════════════════
  _buildScene() {
    // ── Fix 4: container-size diagnostic log ───────────────
    // If these print 0, the Vue component has a collapsed-height CSS issue.
    console.log('[SuperResEngine] 容器尺寸:', this.container.clientWidth, this.container.clientHeight)

    const { w, h } = this._getSize()
    const rw = Math.max(Math.round(w * this._scale), 1)
    const rh = Math.max(Math.round(h * this._scale), 1)

    console.log('[SuperResEngine] 渲染目标尺寸:', rw, 'x', rh, '  屏幕尺寸:', w, 'x', h)

    // ── Rail A: WebGLRenderTarget (low-res FBO) ─────────────
    // DEFAULT: NearestFilter — boot state is RAW mosaic ruin (0.15×).
    // setCasEnabled(true) will switch to LinearFilter for smooth CAS upscale.
    this.renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter:    THREE.NearestFilter,
      magFilter:    THREE.NearestFilter,
      format:       THREE.RGBAFormat,
      type:         THREE.UnsignedByteType,
      depthBuffer:  true,
      stencilBuffer: false,
    })

    // ── Rail A: scene + camera ──────────────────────────────
    this.lowResScene = new THREE.Scene()
    // null background → scene renders with alpha=0 so the final canvas
    // composites transparently over the CSS grid/grain background layer.
    this.lowResScene.background = null

    // ── Renderer shadow configuration ─────────────────────────
    // Enable shadow map rendering for high-contrast eclipse shadows
    if (this.renderer) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      this.renderer.shadowMap.autoUpdate = true
      this.renderer.shadowMap.needsUpdate = true
    }

    this.lowResCamera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
    // Fix 1: camera at z=5, cube at origin — no overlap, always in frustum
    this.lowResCamera.position.z = 5

    // ── Celestial group: root container for earth-moon system ──
    // This group rotates slowly on Y-axis to simulate macroscopic
    // observation viewpoint drift in the universe.
    this._celestialGroup = new THREE.Group()
    this.lowResScene.add(this._celestialGroup)

    // ── Directional sun light: parallel light source for high-contrast shadow casting ──
    // Ultra-high resolution shadow map (4096×4096) for razor-sharp eclipse shadows
    // Bias and radius tuned for maximum contrast while minimizing acne artifacts
    this._sunLight = new THREE.DirectionalLight(0xffffff, 10.0)  // DEBUG: brutal override
    this._sunLight.position.set(5.0, 3.5, 7.5).normalize().multiplyScalar(50)
    this._sunLight.castShadow = true

    // Shadow map settings: maximum resolution for eclipse sharpness
    this._sunLight.shadow.mapSize.width = 4096
    this._sunLight.shadow.mapSize.height = 4096

    // Shadow camera frustum: tightly包裹 entire earth-moon orbital volume
    // Earth radius=1.4, Moon orbit radius=2.8, eccentricity=0.1 → max extent ≈ 3.5
    // Add safety margin of 50% → frustum size = 10×10×100
    const shadowFrustumSize = 10
    this._sunLight.shadow.camera.near = 1
    this._sunLight.shadow.camera.far = 100
    this._sunLight.shadow.camera.left = -shadowFrustumSize
    this._sunLight.shadow.camera.right = shadowFrustumSize
    this._sunLight.shadow.camera.top = shadowFrustumSize
    this._sunLight.shadow.camera.bottom = -shadowFrustumSize

    // Shadow quality tuning:
    //   - bias: small negative value to prevent shadow acne
    //   - radius: small for sharp edges (no soft blur for high contrast)
    //   - normalBias: tiny to avoid self-shadowing artifacts on curved surfaces
    this._sunLight.shadow.bias = -0.0005
    this._sunLight.shadow.radius = 0
    this._sunLight.shadow.normalBias = 0.0002

    // Shadow sampling: use PCF (Percentage-Closer Filtering) for slightly softened edges
    // while maintaining high contrast. Set to BasicFilter for maximum sharpness.
    this._sunLight.shadow.type = THREE.PCFSoftShadowMap

    this.lowResScene.add(this._sunLight)

    // ── Procedural Earth: SphereGeometry (128 subdivisions) + FBM ShaderMaterial ──
    // 128×128 segments → smooth sphere silhouette for atmosphere rim Fresnel.
    // Intentionally rendered at 0.5× (Rail A) so jaggies are visible pre-CAS.
    const earthGeo = new THREE.SphereGeometry(1.4, 128, 128)

    // ── Land-Sea Mask texture ─────────────────────────────────────
    // 4096×2048 equirectangular PNG: white=land, black=ocean.
    // Loaded asynchronously; uLandMask uniform starts as a 1×1 black
    // fallback texture and is replaced once the image decodes.
    const maskFallback = new THREE.DataTexture(
      new Uint8Array([0]), 1, 1, THREE.LuminanceFormat
    )
    maskFallback.needsUpdate = true

    const maskLoader = new THREE.TextureLoader()
    maskLoader.load(
      '/textures/land_sea_mask.png',
      (tex) => {
        tex.wrapS     = THREE.RepeatWrapping
        tex.wrapT     = THREE.ClampToEdgeWrapping
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = true
        tex.needsUpdate = true
        if (this._crystalMat && this._crystalMat.uniforms.uLandMask) {
          this._crystalMat.uniforms.uLandMask.value = tex
          console.log('[SuperResEngine] Land-Sea Mask loaded ✓  4096×2048')
        }
      },
      undefined,
      (err) => console.warn('[SuperResEngine] Land-Sea Mask load failed:', err)
    )

    this._crystalMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_EARTH,
      fragmentShader: FRAG_EARTH,
      uniforms: {
        uTime:        { value: 0.0 },
        uSunDir:      { value: this._sunLight.position.clone().normalize() },
        // ── DEFAULT: 0.0 = RAW/stripped (4-octave FBM, no micro-detail) ──
        // Boots in mosaic ruin — user engages toggle to activate CAS full-detail.
        uDetailLevel: { value: 0.0 },
        // ── Real-geography land-sea mask (injected async after TextureLoader) ──
        uLandMask:    { value: maskFallback },
      },
      transparent: true,
      side:        THREE.FrontSide,
      depthWrite:  true,
    })

    this._testCube = new THREE.Mesh(earthGeo, this._crystalMat)
    this._testCube.castShadow = true
    this._testCube.receiveShadow = true
    this._celestialGroup.add(this._testCube)

    // DEBUG: Force ambient to 2.0 — brutal override so ShaderMaterial surfaces are always visible
    const ambLight = new THREE.AmbientLight(0xffffff, 2.0)
    this.lowResScene.add(ambLight)

    // ── Moon: 1/4× size of Earth, offset to right of scene ──
    // Earth radius = 1.4 → Moon radius = 0.35
    // Initial position will be updated in _tick() for orbital mechanics
    const moonGeo = new THREE.SphereGeometry(0.35, 64, 64)
    this._moonMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_MOON,
      fragmentShader: FRAG_MOON,
      uniforms: {
        uTime:        { value: 0.0 },
        uSunDir:      { value: this._sunLight.position.clone().normalize() },
        // ── DEFAULT: 0.0 = RAW/stripped (4-octave FBM, no micro-detail) ──
        uDetailLevel: { value: 0.0 },
      },
      transparent: false,
      side:        THREE.FrontSide,
      depthWrite:  true,
    })
    this._moonMesh = new THREE.Mesh(moonGeo, this._moonMat)
    this._moonMesh.castShadow = true
    this._moonMesh.receiveShadow = true
    // Orbit animation is now driven by JS in _tick()
    this._moonMesh.position.set(2.8, 0.4, -1.2)
    this._celestialGroup.add(this._moonMesh)

    // ══════════════════════════════════════════════════════════
    //  ABSOLUTE REFERENCE FRAME — Brutalist Polar Grid + Orbital Track
    //
    //  Both objects are added to lowResScene (world root), NOT to
    //  _celestialGroup, so they remain perfectly static while the
    //  earth-moon system rotates around them.
    // ══════════════════════════════════════════════════════════

    // ── PolarGridHelper: Memphis brutalist palette ──────────────
    // Absolute black (#000000) + screaming Memphis yellow (#FFD600)
    // alternating — zero fluorescent WebGL default vibe.
    // WebGL native linewidth is locked at 1px; extreme colour contrast
    // between pitch-black and Memphis yellow creates the visual mass.
    // radius=5 fully encloses the lunar orbit (max r≈3.08 at apoapsis).
    // THREE.PolarGridHelper(radius, sectors, rings, divisions, color1, color2)
    // color1 = inner rings / even radials, color2 = outer rings / odd radials
    this._polarGrid = new THREE.PolarGridHelper(
      5,                     // radius — wraps entire earth-moon volume
      12,                    // sectors (radial lines)
      5,                     // concentric rings
      64,                    // divisions per ring (smooth)
      0x000000,              // color1: absolute black — core axis / even rings
      0xFFD600               // color2: Memphis screaming yellow — odd rings / radials
    )
    this._polarGrid.position.y = -1.5
    this.lowResScene.add(this._polarGrid)

    // ── Lunar orbital track: white closed ellipse on XZ plane ──
    // Parametric sampling: same Kepler ellipse as _tick() dynamics.
    // r(θ) = a(1-e²) / (1 + e·cosθ)
    // x = r·cosθ,  z = r·sinθ·cos(inclination),  y = r·sinθ·sin(inclination)
    {
      const OP = this._orbitParams
      const a   = OP.moonOrbitRadius          // 2.8
      const e   = OP.moonOrbitEccentricity    // 0.1
      const inc = OP.moonOrbitTilt            // ~0.251 rad (14.4°)
      const STEPS = 256
      const verts = new Float32Array((STEPS + 1) * 3)

      for (let i = 0; i <= STEPS; i++) {
        const theta = (i / STEPS) * Math.PI * 2
        const r = a * (1 - e * e) / (1 + e * Math.cos(theta))
        const orbX = r * Math.cos(theta)
        const orbZ = r * Math.sin(theta)
        verts[i * 3 + 0] = orbX
        verts[i * 3 + 1] = orbZ * Math.sin(inc)  // inclination lift
        verts[i * 3 + 2] = orbZ * Math.cos(inc)
      }

      const orbitGeo = new THREE.BufferGeometry()
      orbitGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))

      // ── LineDashedMaterial: mechanical gear-tooth black dash track ──
      // Pure black (#000000) — maximum contrast against the space field.
      // dashSize=0.18, gapSize=0.10: 1.8:1 dash-to-gap mechanical ratio,
      // creates the physical sprocket-track feel of a clockwork lunar orbit.
      // computeLineDistances() MUST be called before first render for dashes to appear.
      const orbitMat = new THREE.LineDashedMaterial({
        color:       0x000000,   // absolute black — Memphis brutalist track
        linewidth:   1,          // WebGL hardware limit: always 1px
        dashSize:    0.18,       // dash segment length (world units)
        gapSize:     0.10,       // gap segment length — 1.8× shorter = gear tooth
        transparent: false,
        depthWrite:  false,      // always visible through geometry
        depthTest:   true,
      })

      this._orbitLine = new THREE.Line(orbitGeo, orbitMat)
      // computeLineDistances: required for LineDashedMaterial — populates
      // the lineDistance attribute so the fragment shader knows dash position
      this._orbitLine.computeLineDistances()
      this._orbitLine.position.set(0, 0, 0)
      this.lowResScene.add(this._orbitLine)
    }

    // ── Deep-space background: large sphere, rendered inside-out ──
    // Radius 40 keeps it well outside near/far planes (0.1–100).
    // BackSide makes the shader run on the inner surface of the sphere,
    // always appearing behind the planets (depthTest=false for skybox).
    const spaceGeo = new THREE.SphereGeometry(40, 48, 24)
    this._spaceMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_SPACE,
      fragmentShader: FRAG_SPACE,
      uniforms: {
        uTime:   { value: 0.0 },
        uSunDir: { value: this._sunLight.position.clone().normalize() },
      },
      transparent: true,
      side:        THREE.BackSide,      // inner surface
      depthWrite:  false,
      depthTest:   false,             // skybox always behind everything
    })
    this._spaceMesh = new THREE.Mesh(spaceGeo, this._spaceMat)
    // Position at camera origin — skybox surrounds entire lowResScene
    this._spaceMesh.position.set(0, 0, 0)
    // ── DEBUG: volumetric background DISABLED for FBO tear investigation ──
    // Uncomment after lighting and tearing are fully resolved.
    // this.lowResScene.add(this._spaceMesh)

    // ── Rail B: highResCamera — MUST be OrthographicCamera(-1,1,1,-1,0,1) ──
    // The upscale quad vertex shader writes NDC directly:
    //   gl_Position = vec4(position.xy, 0.0, 1.0)
    // An Orthographic camera with this exact frustum makes Three.js's
    // frustum-culling system see the quad as always-visible, preventing
    // the classic "black screen because the mesh was culled" trap.
    this.highResCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // ── Rail B: fullscreen upscale quad ────────────────────
    this.highResScene = new THREE.Scene()

    const quadGeo = new THREE.PlaneGeometry(2, 2)
    this._upscaleMaterial = new THREE.ShaderMaterial({
      vertexShader:   VERT_UPSCALE,
      fragmentShader: FRAG_UPSCALE,
      uniforms: {
        uLowResTex:    { value: this.renderTarget.texture },
        // CAS tunables — texel size must match physical screen resolution,
        // NOT the low-res FBO size (the quad samples in screen UV space).
        uTexelSize:    { value: new THREE.Vector2(1.0 / w, 1.0 / h) },
        // ── DEFAULT: RAW INPUT state (CAS off by default) ──
        uSharpness:    { value: 0.0 },
        // Film grain — disabled in RAW mode
        uTime:         { value: 0.0 },
        uGrainStr:     { value: 0.0 },   // 0.0 = none in RAW; 0.6 in CAS
        // SINGULARITY 5.0x super-sampling flag
        // 0.0 = normal CAS path; 1.0 = sub-pixel reconstruction enabled
        uSuperSample:  { value: 0.0 },
        // Dynamic sharpness scale guard — prevents white-edge halo at extreme pixel densities.
        // Value = 1 / (scale^0.35). Computed in setResolutionTier, injected here each tier switch.
        // Default 1.0 = identity (no attenuation) for tiers with scale ≤ 1.0.
        uScaleFactor:  { value: 1.0 },
      },
      transparent: true,   // must be true to alpha-composite over CSS background
      depthWrite: false,
      depthTest:  false,
    })
    const quad = new THREE.Mesh(quadGeo, this._upscaleMaterial)
    this.highResScene.add(quad)
  }

  // ══════════════════════════════════════════════════════════
  //  _loop()  ← ROOT CAUSE FIX
  //
  //  VolumetricEngine._loop() does:
  //    this._tick(...)                          ← our dual-rail render
  //    this.renderer.render(this.scene, ...)    ← overwrites canvas with empty scene!
  //
  //  We override _loop() entirely to run the dual-rail render inside the
  //  rAF callback without that extra base-class render() call.
  //  Fix 2: arrow function in rAF to preserve `this` context.
  // ══════════════════════════════════════════════════════════
  _loop() {
    if (this._destroyed) return

    // Fix 2: arrow function → `this` is always SuperResEngine instance
    this._rafId = requestAnimationFrame((now) => {
      if (this._destroyed) return

      // FPS watchdog (inherited from base — safe to call)
      if (this._checkFps(now)) return

      // Accumulate elapsed time (tab-switch safe, same as base class)
      const dtMs = Math.min(now - this._lastFrameTime, 100)
      this._lastFrameTime  = now
      this._elapsedSec    += dtMs * 0.001

      // Run dual-rail render — NO base render() call after this
      this._tick(this._elapsedSec, dtMs * 0.001)

      this._loop()
    })
  }

  // ══════════════════════════════════════════════════════════
  //  _tick()  — dual-rail render, called every frame by our _loop()
  //             time = this._elapsedSec (seconds since mount)
  // ══════════════════════════════════════════════════════════
  _tick() {
    const { renderer, renderTarget, lowResScene, lowResCamera,
            highResScene, highResCamera } = this

    if (!renderer || !renderTarget || !lowResScene || !lowResCamera ||
        !highResScene || !highResCamera) return

    // ── ABSOLUTE buffer wipe — must be FIRST in every frame ─────
    // Calling clear(true, true, true) on the DEFAULT render target (screen)
    // before ANY setRenderTarget() ensures zero dirty residue from prior frames.
    // This is the nuclear option for radial streak / FBO tearing elimination.
    renderer.setRenderTarget(null)
    renderer.clear(true, true, true)

    // ── Per-frame aspect sync — prevent coordinate distortion ───
    // Re-sync lowResCamera every frame (not just on resize) to guarantee
    // the projection matrix is never stale after any dynamic container resize.
    const _sz = this._getSize()
    if (_sz.w && _sz.h && this.lowResCamera) {
      const _aspect = _sz.w / _sz.h
      if (Math.abs(this.lowResCamera.aspect - _aspect) > 1e-4) {
        this.lowResCamera.aspect = _aspect
        this.lowResCamera.updateProjectionMatrix()
      }
    }

    // ── Celestial dynamics — wall-clock independent timer ───────
    // Uses performance.now() directly, completely decoupled from
    // _elapsedSec, to guarantee rotation regardless of base-class
    // time tracking state (NaN, uninitialised, etc.)
    const nowMs   = performance.now()
    const dtSec   = Math.min((nowMs - this._celestialPrevTime) * 0.001, 0.1)
    this._celestialPrevTime = nowMs

    // Absolute elapsed seconds from construction — used for orbit angles
    const time   = (nowMs - this._celestialStartTime) * 0.001
    const params = this._orbitParams

    // 1. Earth self-rotation — Y-axis, accumulate via delta for smooth motion
    //    Also write to rotation.y via absolute angle as belt-and-suspenders.
    if (this._testCube) {
      this._testCube.rotation.y = time * params.earthRotationSpeed
    }

    // 2. Moon orbital mechanics — elliptical orbit + inclination
    if (this._moonMesh) {
      const trueAnomaly = time * params.moonOrbitSpeed

      // Elliptical orbit radius: r = a(1-e²) / (1 + e·cosθ)
      const e = params.moonOrbitEccentricity
      const r = params.moonOrbitRadius * (1 - e * e)
               / (1 + e * Math.cos(trueAnomaly))

      // Project onto tilted orbital plane
      const inclination = params.moonOrbitTilt
      const orbX = r * Math.cos(trueAnomaly)
      const orbZ = r * Math.sin(trueAnomaly)

      this._moonMesh.position.set(
        orbX,
        orbZ * Math.sin(inclination),
        orbZ * Math.cos(inclination)
      )

      // Tidal locking: rotation tracks orbital angle (+π flips to face Earth)
      this._moonMesh.rotation.y = trueAnomaly + Math.PI
      this._moonMesh.rotation.x = inclination * 0.5
    }

    // 3. Macroscopic system drift — entire group rotates on world Y
    if (this._celestialGroup) {
      this._celestialGroup.rotation.y = time * params.globalYawSpeed
    }

    // ── Shader uniforms: feed wall-clock time for animated noise/clouds ─
    // _detailLevel: 1.0 in CAS mode (full detail), 0.0 in RAW mode (stripped)
    const detailLevel = (this._upscaleMaterial &&
      this._upscaleMaterial.uniforms.uSharpness.value > 0.0) ? 1.0 : 0.0

    if (this._crystalMat) {
      this._crystalMat.uniforms.uTime.value = time
      if (this._crystalMat.uniforms.uDetailLevel !== undefined) {
        this._crystalMat.uniforms.uDetailLevel.value = detailLevel
      }
    }
    if (this._moonMat) {
      this._moonMat.uniforms.uTime.value = time
      if (this._moonMat.uniforms.uDetailLevel !== undefined) {
        this._moonMat.uniforms.uDetailLevel.value = detailLevel
      }
    }
    if (this._spaceMat) {
      this._spaceMat.uniforms.uTime.value = time
    }
    // Feed wall-clock time to Film Grain in upscale shader
    if (this._upscaleMaterial) {
      this._upscaleMaterial.uniforms.uTime.value = time
    }

    // ── Rail A: low-res scene → FBO ─────────────────────────
    // Bind FBO, then nuke ALL buffers (colour + depth + stencil) before rendering.
    renderer.setRenderTarget(renderTarget)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.render(lowResScene, lowResCamera)

    // ── Rail B: FBO texture → fullscreen upscale → screen ───
    // Clear screen buffer with alpha=0 so the CSS background shows through.
    renderer.setRenderTarget(null)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(highResScene, highResCamera)
  }

  // ══════════════════════════════════════════════════════════
  //  TEN-TIER RESOLUTION MATRIX  (v2.0 — Density Ladder)
  //
  //  Non-linear step distribution:
  //    Low-density zone  (0.10 – 0.75×): fine increments for gentle quality ramp
  //    Mid-density zone  (1.00 – 2.00×): native and moderate super-sample
  //    High-density zone (2.50 – 5.00×): violent jumps, VRAM-intensive, OVERLOADED UI
  //
  //  Tier table (all fields):
  //    scale        — FBO multiplier  (screen_w × scale, screen_h × scale)
  //    sharpness    — CAS kernel strength  [0.0 – 0.99]
  //    detail       — Planet FBM octave gate  [0.0 – 1.0]
  //    grain        — Film grain overlay  [0.0 – 1.0]
  //    filter       — FBO texture filter: 'nearest' | 'linear'
  //    superSample  — 0 = standard CAS; 1 = sub-pixel edge reconstruction
  //
  //  Tier 10 (SINGULARITY):
  //    → FBO at 5× native (25× pixel count).
  //    → Full dispose + RGBAFormat realloc on every activation.
  //    → uSuperSample=1: sub-pixel edge reconstruction enabled.
  //    → CAS sharpness modulated by 1/(scale^0.35) to prevent white-edge halos.
  //    → Ice-crystal sub-angstrom clarity — zero blur at any zoom.
  //
  // ══════════════════════════════════════════════════════════
  static TIERS = {
    STARDUST:     { scale: 0.10, sharpness: 0.00, detail: 0.0, grain: 0.0, filter: 'nearest', superSample: 0 },
    NEBULA:       { scale: 0.18, sharpness: 0.20, detail: 0.0, grain: 0.1, filter: 'nearest', superSample: 0 },
    PHOTON:       { scale: 0.30, sharpness: 0.42, detail: 0.0, grain: 0.25,filter: 'linear',  superSample: 0 },
    IMPULSE:      { scale: 0.50, sharpness: 0.60, detail: 0.3, grain: 0.40,filter: 'linear',  superSample: 0 },
    CLARITY:      { scale: 0.75, sharpness: 0.75, detail: 0.6, grain: 0.50,filter: 'linear',  superSample: 0 },
    ULTRA:        { scale: 1.00, sharpness: 0.88, detail: 1.0, grain: 0.55,filter: 'linear',  superSample: 0 },
    APEX:         { scale: 1.50, sharpness: 0.93, detail: 1.0, grain: 0.45,filter: 'linear',  superSample: 0 },
    OVERCLOCK:    { scale: 2.00, sharpness: 0.96, detail: 1.0, grain: 0.35,filter: 'linear',  superSample: 0 },
    HYPERDRIVE:   { scale: 3.00, sharpness: 0.98, detail: 1.0, grain: 0.25,filter: 'linear',  superSample: 1 },
    SINGULARITY:  { scale: 5.00, sharpness: 0.99, detail: 1.0, grain: 0.15,filter: 'linear',  superSample: 1 },
  }

  // ══════════════════════════════════════════════════════════
  //  setScaleDirect(scale)
  //
  //  Real-time sub-pixel scale injection for the inline slider.
  //  Bypasses the full tier-switch protocol; only updates:
  //    _scale, FBO size, uTexelSize, uScaleFactor, uSuperSample.
  //  CAS sharpness and grain are inherited from the last named tier.
  //  Used for live scrubbing between 0.10× and 5.00× without VRAM
  //  dispose overhead (except when crossing into 5.0 = SINGULARITY).
  // ══════════════════════════════════════════════════════════
  setScaleDirect(scale) {
    if (!this._upscaleMaterial) return
    const { w, h } = this._getSize()
    if (!w || !h) return

    const clampedScale = Math.max(0.05, Math.min(5.0, scale))
    this._scale = clampedScale

    // Sub-pixel reconstruction activates at scale ≥ 2.5
    const superSample = clampedScale >= 2.5 ? 1.0 : 0.0
    this._upscaleMaterial.uniforms.uSuperSample.value = superSample

    // Dynamic sharpness guard
    const scaleFactor = 1.0 / Math.pow(Math.max(clampedScale, 1.0), 0.35)
    if (this._upscaleMaterial.uniforms.uScaleFactor) {
      this._upscaleMaterial.uniforms.uScaleFactor.value = scaleFactor
    }

    const rw = Math.max(Math.round(w * clampedScale), 1)
    const rh = Math.max(Math.round(h * clampedScale), 1)

    // At exactly 5.0× (SINGULARITY boundary): full dispose + RGBAFormat realloc
    if (clampedScale >= 4.9 && (!this._singularityAllocated)) {
      if (this.renderTarget) { this.renderTarget.dispose(); this.renderTarget = null }
      this.renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
        depthBuffer: true, stencilBuffer: false,
      })
      this._upscaleMaterial.uniforms.uLowResTex.value = this.renderTarget.texture
      this._singularityAllocated = true
    } else if (clampedScale < 4.9) {
      this._singularityAllocated = false
      if (this.renderTarget) this.renderTarget.setSize(rw, rh)
    } else {
      if (this.renderTarget) this.renderTarget.setSize(rw, rh)
    }

    // Texture filter: nearest below 0.25, linear above
    if (this.renderTarget && this.renderTarget.texture) {
      const f = clampedScale < 0.25 ? THREE.NearestFilter : THREE.LinearFilter
      this.renderTarget.texture.minFilter = f
      this.renderTarget.texture.magFilter = f
      this.renderTarget.texture.needsUpdate = true
    }

    // FBO-aware texel size for CAS
    if (this._upscaleMaterial.uniforms.uTexelSize) {
      this._upscaleMaterial.uniforms.uTexelSize.value.set(
        1.0 / (w * clampedScale),
        1.0 / (h * clampedScale)
      )
    }

    // Update step offsets for sub-pixel mode
    const stepScale = clampedScale >= 2.5 ? (1.0 / clampedScale) : 1.0
    // (step is handled in shader via uSuperSample blend; no separate uniform needed)

    console.log(`[SuperResEngine] setScaleDirect(${clampedScale.toFixed(3)}) FBO=${rw}×${rh} superSample=${superSample} guard=${scaleFactor.toFixed(3)}`)
  }

  // ══════════════════════════════════════════════════════════
  //  setResolutionTier(tierName)
  //
  //  Apply a named resolution tier to the full dual-rail pipeline:
  //    1. uSharpness          — CAS kernel strength
  //    2. uGrainStr           — film grain overlay
  //    3. uSuperSample        — SINGULARITY sub-pixel reconstruction flag
  //    4. uScaleFactor        — dynamic sharpness attenuation guard
  //       Prevents white-edge halo blow-out at extreme pixel densities.
  //       scaleFactor = 1 / (scale ^ 0.35); injected into FRAG_UPSCALE.
  //    5. _scale + RenderTarget — FBO pixel budget
  //       SINGULARITY: dispose old buffer first, then reallocate at 5× with
  //       RGBAFormat to ensure full colour depth at extreme pixel density.
  //       The old buffer is ALWAYS disposed before creating the new one to
  //       prevent GPU VRAM accumulation (dual allocation leak).
  //    6. texture filter      — NearestFilter (RAW) / LinearFilter (others)
  //    7. uDetailLevel        — planet shader octave count
  //    8. uTexelSize          — CAS texel step updated to FBO-aware size
  //
  //  Zero-latency state snap — no lerp, no transition, no apology.
  // ══════════════════════════════════════════════════════════
  setResolutionTier(tierName) {
    const cfg = SuperResEngine.TIERS[tierName]
    if (!cfg) { console.warn('[SuperResEngine] Unknown tier:', tierName); return }
    if (!this._upscaleMaterial) return

    const { w, h } = this._getSize()

    // ── 1. CAS sharpness ────────────────────────────────────
    this._upscaleMaterial.uniforms.uSharpness.value = cfg.sharpness

    // ── 2. Film grain ────────────────────────────────────────
    this._upscaleMaterial.uniforms.uGrainStr.value = cfg.grain

    // ── 3. Super-sample flag ─────────────────────────────────
    // 1.0 activates sub-pixel edge reconstruction in FRAG_UPSCALE.
    // 0.0 = standard CAS path for all other tiers.
    this._upscaleMaterial.uniforms.uSuperSample.value = cfg.superSample

    // ── 4. Dynamic sharpness scale guard ────────────────────
    // At 5× sampling density the CAS kernel receives hyper-precise contrast data.
    // Without attenuation, the adaptive weight w overshoots and produces
    // white-edge ringing at sub-pixel level.
    // Guard formula: scaleFactor = 1 / (scale ^ 0.35)
    //   scale=1.0 → factor=1.000 (identity, no effect)
    //   scale=2.0 → factor=0.784
    //   scale=5.0 → factor=0.617  ← 5× SINGULARITY path
    // The shader multiplies w by this factor before the CAS blend.
    const scaleFactor = 1.0 / Math.pow(Math.max(cfg.scale, 1.0), 0.35)
    if (this._upscaleMaterial.uniforms.uScaleFactor) {
      this._upscaleMaterial.uniforms.uScaleFactor.value = scaleFactor
    }

    // ── 5. Render resolution — dispose + reallocate for high-density tiers ─
    // High-density tiers (HYPERDRIVE 3× and SINGULARITY 5×):
    //   a) Dispose the existing renderTarget (frees GPU VRAM immediately).
    //   b) Reallocate a fresh WebGLRenderTarget with RGBAFormat to preserve
    //      full colour depth under extreme pixel density.
    //   c) Re-bind the new texture to the upscale quad material.
    // All other tiers: setSize() is sufficient (no reallocation needed).
    this._scale = cfg.scale
    const isHighDensity = (cfg.scale >= 2.5)
    if (w && h) {
      const rw = Math.max(Math.round(w * cfg.scale), 1)
      const rh = Math.max(Math.round(h * cfg.scale), 1)
      if (isHighDensity) {
        if (this.renderTarget) {
          this.renderTarget.dispose()
          this.renderTarget = null
        }
        const filter = THREE.LinearFilter
        this.renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
          minFilter:     filter,
          magFilter:     filter,
          format:        THREE.RGBAFormat,
          type:          THREE.UnsignedByteType,
          depthBuffer:   true,
          stencilBuffer: false,
        })
        // Rebind: the upscale quad must sample the new texture object
        this._upscaleMaterial.uniforms.uLowResTex.value = this.renderTarget.texture
        this._singularityAllocated = (tierName === 'SINGULARITY')
        console.log(`[SuperResEngine] ${tierName} — disposed old FBO, allocated ${rw}×${rh} RGBAFormat`)
      } else {
        // Non-SINGULARITY: setSize() is sufficient, no reallocation
        if (this.renderTarget) {
          this.renderTarget.setSize(rw, rh)
        }
      }
      console.log(`[SuperResEngine] Tier=${tierName}  FBO=${rw}×${rh}  screen=${w}×${h}  scale=${cfg.scale}×  sharpGuard=${scaleFactor.toFixed(3)}`)
    }

    // ── 6. FBO texture filter ────────────────────────────────
    // (High-density tiers already set LinearFilter at construction above)
    if (!isHighDensity && this.renderTarget && this.renderTarget.texture) {
      const filter = cfg.filter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter
      this.renderTarget.texture.minFilter = filter
      this.renderTarget.texture.magFilter = filter
      this.renderTarget.texture.needsUpdate = true
    }

    // ── 7. Planet shader detail level ───────────────────────
    if (this._crystalMat && this._crystalMat.uniforms.uDetailLevel) {
      this._crystalMat.uniforms.uDetailLevel.value = cfg.detail
    }
    if (this._moonMat && this._moonMat.uniforms.uDetailLevel) {
      this._moonMat.uniforms.uDetailLevel.value = cfg.detail
    }

    // ── 8. CAS texel size — FBO-aware ───────────────────────
    // In SINGULARITY mode the FBO is 5× screen size.
    // The shader receives 1/(W×scale) so sub-pixel taps address real
    // FBO sample boundaries at every magnification level.
    if (w && h && this._upscaleMaterial.uniforms.uTexelSize) {
      const tsX = 1.0 / (w * cfg.scale)
      const tsY = 1.0 / (h * cfg.scale)
      this._upscaleMaterial.uniforms.uTexelSize.value.set(tsX, tsY)
    }
  }

  // setCasEnabled — kept for backwards-compat, delegates to tier system
  setCasEnabled(enabled) {
    this.setResolutionTier(enabled ? 'ULTRA' : 'RAW')
  }

  // ══════════════════════════════════════════════════════════
  //  setZoom(scale)
  //
  //  Elastic zoom with three-layer protection:
  //
  //    Layer 1 — Exponential damping (指数阻尼)
  //      Linear slider [0.5, 2.0] is compressed via power curve 1.6,
  //      giving "heavy flywheel resistance" near maximum zoom.
  //      Effective ceiling ≈ 1.73× even when slider hits 2.0.
  //
  //    Layer 2 — Dynamic bounding-sphere camera compensation
  //      Earth-moon worst-case bounding radius (apoapsis + safety)
  //      is projected into the frustum half-height equation to
  //      compute the minimum camera Z that keeps the entire system
  //      inside the view cone. Camera is pushed back automatically.
  //
  //    Layer 3 — Hard Z clamp [5.0, 12.0]
  //      Prevents the camera from drifting through the scene or
  //      past the far plane. Default position is always recovered
  //      when zoom returns to 1.0.
  //
  //  CSS HUD overlays (z-index 9999) are 2-D and can never be
  //  occluded by 3-D geometry — no additional fix needed.
  //
  //  @param {number} scale  Raw slider value in [0.5, 2.0]
  // ══════════════════════════════════════════════════════════
  setZoom(scale) {
    if (!this._celestialGroup || !this.lowResCamera) {
      console.warn('[SuperResEngine] setZoom: engine not ready')
      return
    }

    // ── Layer 1: Exponential damping ─────────────────────────
    // Normalise slider to t ∈ [0,1], then apply power curve.
    //   t=0 → scale=0.5 (zoom-out limit)
    //   t=1 → scale=2.0 (zoom-in limit)
    // Power 1.6 compresses the upper range:
    //   slider 2.0 → effective ≈ 1.73 (27% reduction at ceiling)
    //   slider 1.5 → effective ≈ 1.46 (body feels ~neutral)
    //   slider 1.0 → effective = 1.00 (exact neutral pass-through)
    const ZOOM_MIN      = 0.5
    const ZOOM_MAX      = 5.0
    const clamped       = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale))
    const t             = (clamped - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)
    const dampedT       = Math.pow(t, 1.6)
    const effectiveZoom = ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * dampedT

    // Scale the celestial group (earth + moon only)
    this._celestialGroup.scale.set(effectiveZoom, effectiveZoom, effectiveZoom)

    // ── REFERENCE FRAME LOCK ─────────────────────────────────
    // polarGrid and orbitLine live in lowResScene (world root), NOT in
    // _celestialGroup.  However the camera Z-pullback makes them appear
    // smaller when zooming in.  Apply the exact inverse of the camera-Z
    // ratio relative to the default Z (5.0) so their visual size is
    // absolutely constant regardless of zoom level.
    //
    //   visual_size  ∝  world_scale / camera_Z
    //   lock condition: world_scale / camera_Z = const = 1 / Z_DEFAULT
    //   → world_scale = camera_Z / Z_DEFAULT   (will be set after finalZ is known)
    //
    // We store finalZ below and apply it immediately after the clamp.

    // ── Layer 2: Dynamic bounding-sphere camera Z compensation ─
    // Earth-moon system bounding sphere (unscaled, world-space):
    //   Earth radius    = 1.4
    //   Moon apoapsis   = a(1+e) = 2.8 × 1.1 = 3.08
    //   Safety padding  = 0.5 (atmosphere rim + orbit track)
    //   Unscaled bound  = 3.58
    //
    // After scaling by effectiveZoom: scaledBound = 3.58 × effectiveZoom
    //
    // Frustum vertical half-height at depth d:
    //   halfH = d × tan(FOV/2)    (FOV=60°  →  tan30° ≈ 0.5774)
    //
    // Require: scaledBound ≤ halfH
    //   → d ≥ scaledBound / tan(FOV/2)
    //
    // Also require camera to stay outside scaled Earth:
    //   → d ≥ 1.4 × effectiveZoom + 0.5
    //
    // Take the max of both, then hard-clamp to [5.0, 12.0].
    const UNSCALED_BOUND  = 3.58
    const CAM_FOV_RAD     = 60 * (Math.PI / 180)
    const TAN_HALF_FOV    = Math.tan(CAM_FOV_RAD / 2)   // ≈ 0.5774
    const Z_DEFAULT       = 5.0
    const Z_MAX_PULLBACK  = 12.0

    const scaledBound     = UNSCALED_BOUND * effectiveZoom
    const zForVisibility  = scaledBound / TAN_HALF_FOV         // keep inside frustum
    const zForSurface     = 1.4 * effectiveZoom + 0.5          // stay outside earth
    const requiredZ       = Math.max(zForVisibility, zForSurface, Z_DEFAULT)

    // ── Layer 3: Hard clamp ───────────────────────────────────
    const finalZ = Math.min(requiredZ, Z_MAX_PULLBACK)
    this.lowResCamera.position.z = finalZ
    this.lowResCamera.updateProjectionMatrix()

    // ── REFERENCE FRAME ABSOLUTE LOCK ────────────────────────
    // _polarGrid and _orbitLine live in lowResScene root, NEVER in
    // _celestialGroup.  They must NEVER be scaled — not by zoom, not by
    // any compensation.  Their scale is always identity (1,1,1).
    // The camera Z-pullback will make them appear slightly smaller at max
    // zoom — that is CORRECT behaviour: the "floor" recedes as you pull back
    // to observe a larger body.  Do NOT attempt to compensate this.
    //   polarGrid.scale = (1,1,1)   ← enforced once at _buildScene, never touched again
    //   orbitLine.scale = (1,1,1)   ← same

    // ── Expose current zoom state for CSS frame expansion ────
    // Vue component reads this._zoomEffective to drive CSS height.
    this._zoomEffective = effectiveZoom

    console.log(
      `[SuperResEngine] setZoom(${clamped.toFixed(2)}) → effective=${effectiveZoom.toFixed(3)}` +
      ` camZ=${finalZ.toFixed(2)}` +
      ` (vis=${zForVisibility.toFixed(2)} surf=${zForSurface.toFixed(2)})`
    )
  }

  // ══════════════════════════════════════════════════════════
  //  _handleResize()  — keep RenderTarget + cameras in sync
  // ══════════════════════════════════════════════════════════
  _handleResize() {
    super._handleResize()

    if (!this.renderer || !this.renderTarget) return

    const { w, h } = this._getSize()
    if (!w || !h) return

    const rw = Math.max(Math.round(w * this._scale), 1)
    const rh = Math.max(Math.round(h * this._scale), 1)
    this.renderTarget.setSize(rw, rh)

    if (this.lowResCamera) {
      // CRITICAL: aspect must match the CANVAS (screen) ratio, NOT the low-res FBO ratio.
      // Low-res FBO is always rw×rh = w*scale × h*scale, so rw/rh == w/h always.
      // But using w/h directly avoids integer-rounding drift at small scales.
      this.lowResCamera.aspect = w / h
      this.lowResCamera.updateProjectionMatrix()
    }

    // Keep CAS texel size in sync — FBO-aware (matches setResolutionTier logic)
    if (this._upscaleMaterial) {
      this._upscaleMaterial.uniforms.uTexelSize.value.set(
        1.0 / (w * this._scale),
        1.0 / (h * this._scale)
      )
    }
  }

  // ══════════════════════════════════════════════════════════
  //  destroy()
  // ══════════════════════════════════════════════════════════
  destroy() {
    if (this.renderTarget)      { this.renderTarget.dispose();      this.renderTarget = null }
    if (this._upscaleMaterial)  { this._upscaleMaterial.dispose();  this._upscaleMaterial = null }
    if (this._crystalMat) {
      // Dispose land-sea mask texture if it was loaded
      const mask = this._crystalMat.uniforms?.uLandMask?.value
      if (mask && mask.isTexture) mask.dispose()
      this._crystalMat.dispose()
      this._crystalMat = null
    }
    if (this._moonMat)          { this._moonMat.dispose();         this._moonMat = null }
    if (this._spaceMat)         { this._spaceMat.dispose();        this._spaceMat = null }
    if (this._sunLight)         { this._sunLight.dispose();         this._sunLight = null }
    if (this._testCube) {
      this._testCube.geometry.dispose()
      this._testCube.material.dispose()
      this._testCube = null
    }
    if (this._moonMesh) {
      this._moonMesh.geometry.dispose()
      this._moonMesh.material.dispose()
      this._moonMesh = null
    }
    if (this._spaceMesh) {
      this._spaceMesh.geometry.dispose()
      this._spaceMesh.material.dispose()
      this._spaceMesh = null
    }
    if (this._polarGrid) {
      this._polarGrid.geometry.dispose()
      this._polarGrid.material.dispose()
      this._polarGrid = null
    }
    if (this._orbitLine) {
      this._orbitLine.geometry.dispose()
      this._orbitLine.material.dispose()
      this._orbitLine = null
    }
    if (this._celestialGroup) {
      this._celestialGroup.clear()
      this._celestialGroup = null
    }
    this.lowResScene   = null
    this.highResScene  = null
    this.lowResCamera  = null
    this.highResCamera = null
    super.destroy()
  }
}

export default SuperResEngine
