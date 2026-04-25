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

uniform float uTime;

// Sphere UV adjustment: map standard UVs to equirectangular lat-long
void main() {
  vec3 pos = position;
  // Optional: slow rotation about Y axis
  float rotSpeed = 0.02;
  float s = sin(uTime * rotSpeed);
  float c = cos(uTime * rotSpeed);
  vec3 rotPos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);
  pos = rotPos;

  vUv       = uv;
  vNormal    = normalize(normalMatrix * normal);
  vViewDir   = normalize(cameraPosition - (modelMatrix * vec4(pos, 1.0)).xyz);
  vWorldPos  = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const FRAG_EARTH = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;

uniform float uTime;

// ── Hash & Noise ───────────────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),             hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x),
    f.y
  );
}

// 3-D hash via swizzle trick
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

// ── FBM (Fractal Brownian Motion) in 3-D ──────────────────────
// 6 octaves, lacunarity=2, persistence=0.5
float fbm(vec3 p, int octaves) {
  float v = 0.0, a = 0.5, freq = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v    += a * noise3(p * freq);
    freq *= 2.0;
    a    *= 0.5;
  }
  return v;
}

// ── FBM-based normal perturbation ─────────────────────────────
vec3 fbmNormal(vec3 p, float eps) {
  float f0 = fbm(p, 4);
  float fx = fbm(p + vec3(eps, 0.0, 0.0), 4);
  float fy = fbm(p + vec3(0.0, eps, 0.0), 4);
  float fz = fbm(p + vec3(0.0, 0.0, eps), 4);
  return normalize(vec3(fx - f0, fy - f0, fz - f0));
}

// ── Schlick Fresnel ────────────────────────────────────────────
float fresnelSchlick(float cosTheta, float r0) {
  float c = 1.0 - cosTheta;
  return r0 + (1.0 - r0) * (c * c * c * c * c);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // ── Continent mask via multi-layer FBM ────────────────────
  // Use world-space position on unit sphere as noise coordinate.
  // Three FBM layers at different scales to produce varied continents.
  vec3 noisePos = normalize(vWorldPos) * 1.6 + vec3(3.7, 1.2, 0.8);
  float fbm1 = fbm(noisePos,              6);
  float fbm2 = fbm(noisePos * 2.1 + 5.3, 5);
  float fbm3 = fbm(noisePos * 4.7 + 2.9, 4);

  float landMask = fbm1 * 0.5 + fbm2 * 0.3 + fbm3 * 0.2;
  // Continent threshold: values above 0.44 are land
  float isLand = smoothstep(0.40, 0.44, landMask);

  // ── Sun direction ─────────────────────────────────────────
  vec3 sunDir = normalize(vec3(1.8, 1.2, 2.5));

  // ── Diffuse lighting ──────────────────────────────────────
  float NdotL = max(dot(N, sunDir), 0.0);
  float diffuse = NdotL * 0.85 + 0.15;   // 0.15 ambient floor

  // ── Ocean ─────────────────────────────────────────────────
  // Deep blue with animated micro-wave shimmer
  float waveNoise = noise(vUv * 18.0 + uTime * 0.15) * 0.5
                  + noise(vUv * 36.0 - uTime * 0.22) * 0.25;
  vec3 oceanDeep  = vec3(0.02, 0.09, 0.28);
  vec3 oceanShall = vec3(0.05, 0.28, 0.55);
  vec3 oceanColor = mix(oceanDeep, oceanShall, waveNoise);

  // Blinn-Phong ocean specular (sun glint)
  vec3 H    = normalize(V + sunDir);
  float oSpec = pow(max(dot(N, H), 0.0), 128.0) * 2.5;
  oceanColor += vec3(0.8, 0.9, 1.0) * oSpec * (1.0 - isLand);

  // ── Land ──────────────────────────────────────────────────
  // Height-based biome: low fbm1 → tropical green, high → brown/rocky
  float elevation = fbm1;
  vec3 lowland  = vec3(0.12, 0.28, 0.08);   // tropical green
  vec3 highland = vec3(0.38, 0.28, 0.14);   // brown rocky
  vec3 snowcap  = vec3(0.85, 0.88, 0.92);   // polar white
  vec3 landColor = mix(lowland, highland, smoothstep(0.50, 0.70, elevation));
  landColor      = mix(landColor, snowcap, smoothstep(0.70, 0.85, elevation));

  // FBM normal perturbation → terrain micro-bumps on land
  vec3 perturbedN = normalize(N + fbmNormal(noisePos * 2.0, 0.03) * 0.35 * isLand);
  float pertDiffuse = max(dot(perturbedN, sunDir), 0.0) * 0.9 + 0.10;

  // ── Blend ocean / land ────────────────────────────────────
  vec3 surfaceColor = mix(oceanColor * diffuse, landColor * pertDiffuse, isLand);

  // ── Atmosphere Fresnel rim ────────────────────────────────
  float cosNV = max(dot(N, V), 0.0);
  float rim   = fresnelSchlick(cosNV, 0.0);           // wide rim (F0=0)
  rim         = pow(rim, 2.2);                         // sharpen falloff
  vec3 atmColor = vec3(0.38, 0.65, 0.95) * rim * 0.9;

  // ── Cloud layer (sparse FBM wisps) ────────────────────────
  vec3 cloudPos  = normalize(vWorldPos) * 3.1 + vec3(uTime * 0.003, 0.0, 0.0);
  float cloud    = smoothstep(0.52, 0.62, fbm(cloudPos, 5));
  surfaceColor   = mix(surfaceColor, vec3(0.95, 0.96, 0.98), cloud * 0.6);

  // ── Compose ───────────────────────────────────────────────
  vec3 col = surfaceColor + atmColor;
  col = clamp(col, 0.0, 1.0);

  // Fully opaque sphere + atmosphere rim becomes slightly transparent at edge
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

uniform float uTime;

void main() {
  vec3 pos = position;
  // Slow counter-clockwise orbit + self-rotation (tidally locked approximation)
  float orbitSpeed = 0.008;
  float s = sin(uTime * orbitSpeed);
  float c = cos(uTime * orbitSpeed);
  // Orbit the moon around the earth (earth is at origin, moon offset in XZ)
  vec3 rotPos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);
  pos = rotPos;

  vUv      = uv;
  vNormal  = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - (modelMatrix * vec4(pos, 1.0)).xyz);
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const FRAG_MOON = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;

uniform float uTime;

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

// ── FBM via snoise ─────────────────────────────────────────────
float fbmS(vec3 p, int oct) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    v += a * (snoise(p * f) * 0.5 + 0.5);
    f *= 2.0; a *= 0.5;
  }
  return v;
}

// ── Crater SDF: single radial bowl ────────────────────────────
// Returns a value in [0,1] where 1 = crater rim, 0 = flat ground.
float crater(vec2 uv, vec2 center, float radius, float rimWidth) {
  float d = length(uv - center) / radius;
  // Bowl: smoothstep inside, sharp rim, flat outside
  float bowl = 1.0 - smoothstep(0.0, 1.0, d);
  float rim  = smoothstep(1.0 - rimWidth, 1.0, d) * smoothstep(1.0 + rimWidth, 1.0, d);
  return max(bowl * 0.35, rim * 0.55);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // ── Spherical UVs from world position (equirectangular-like) ─
  vec3 sp = normalize(vWorldPos - vec3(2.8, 0.4, -1.2)); // moon centre offset
  vec2 suv = vec2(
    atan(sp.z, sp.x) / (2.0 * 3.14159265) + 0.5,
    asin(clamp(sp.y, -1.0, 1.0)) / 3.14159265 + 0.5
  );

  // ── High-freq Simplex crater micro-texture ────────────────
  float microNoise = snoise(sp * 14.0) * 0.5 + 0.5;
  float medNoise   = snoise(sp *  6.0) * 0.5 + 0.5;

  // ── Explicit crater layer (scattered large craters) ────────
  // Seven hand-placed craters in UV space
  float c0 = crater(suv, vec2(0.20, 0.55), 0.055, 0.20);
  float c1 = crater(suv, vec2(0.50, 0.40), 0.070, 0.18);
  float c2 = crater(suv, vec2(0.75, 0.65), 0.045, 0.22);
  float c3 = crater(suv, vec2(0.35, 0.72), 0.038, 0.25);
  float c4 = crater(suv, vec2(0.62, 0.28), 0.060, 0.20);
  float c5 = crater(suv, vec2(0.12, 0.32), 0.030, 0.28);
  float c6 = crater(suv, vec2(0.88, 0.48), 0.050, 0.22);
  float craterVal = max(max(max(c0,c1),max(c2,c3)),max(max(c4,c5),c6));

  // ── Mare basalt patches (dark lunar seas via low-freq FBM) ─
  float mare = fbmS(sp * 1.8 + vec3(5.1, 2.3, 0.7), 4);
  float isMare = smoothstep(0.55, 0.65, mare);  // ~30% surface coverage

  // ── Base highland colour ────────────────────────────────────
  vec3 highland = vec3(0.68, 0.65, 0.60);   // pale grey regolith
  vec3 mareCol  = vec3(0.25, 0.24, 0.22);   // dark basalt
  vec3 craterRim= vec3(0.82, 0.80, 0.76);   // brighter ejecta

  vec3 baseCol = mix(highland, mareCol, isMare);
  // Modulate with micro-noise for granular surface detail
  baseCol *= 0.80 + 0.20 * microNoise;
  // Overlay crater rims (additive bright rim)
  baseCol = mix(baseCol, craterRim, craterVal);
  // Darken crater bowls
  baseCol *= 1.0 - craterVal * 0.35;
  // Medium-scale noise adds slight mottling
  baseCol *= 0.90 + 0.10 * medNoise;

  // ── Terminator lighting — bare rock, no atmosphere ─────────
  vec3 sunDir = normalize(vec3(1.8, 1.2, 2.5));
  float NdotL  = max(dot(N, sunDir), 0.0);
  float ambient= 0.06;   // very low ambient — hard terminator shadow
  float lit    = NdotL + ambient;

  vec3 col = baseCol * lit;
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
  vec3 sunDir = normalize(vec3(1.8, 1.2, 2.5));
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
uniform vec2      uTexelSize;   // vec2(1/W, 1/H) in screen pixels
uniform float     uSharpness;   // 0 = off, 1 = max CAS push (default 0.85)

varying vec2 vUv;

// ── Luminance ─────────────────────────────────────────────────
float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  // ── 5-tap cross sample ────────────────────────────────────
  vec4 tC = texture2D(uLowResTex, vUv);
  vec4 tN = texture2D(uLowResTex, vUv + vec2( 0.0,  uTexelSize.y));
  vec4 tS = texture2D(uLowResTex, vUv + vec2( 0.0, -uTexelSize.y));
  vec4 tW = texture2D(uLowResTex, vUv + vec2(-uTexelSize.x,  0.0));
  vec4 tE = texture2D(uLowResTex, vUv + vec2( uTexelSize.x,  0.0));

  // ── Luma per tap ──────────────────────────────────────────
  float lC = luma(tC.rgb);
  float lN = luma(tN.rgb);
  float lS = luma(tS.rgb);
  float lW = luma(tW.rgb);
  float lE = luma(tE.rgb);

  // ── Local contrast range ──────────────────────────────────
  float mnL = min(lC, min(min(lN, lS), min(lW, lE)));
  float mxL = max(lC, max(max(lN, lS), max(lW, lE)));

  // ── CAS adaptive sharpening weight ───────────────────────
  // Formula: w = uSharpness * sqrt(mnL / (mxL + ε)) * -0.125
  //   • sqrt(mnL/mxL) ≈ 1 on flat regions  → strongest sharpen
  //   • ≈ 0 on edges with extreme contrast → backs off (anti-halo)
  //   • Multiplied by uSharpness for user control
  float contrast = sqrt(mnL / (mxL + 1e-4));
  float w = contrast * (-0.125 * uSharpness);

  // ── Per-channel sharpened colour ─────────────────────────
  // Equivalent to: out = (4w*neighbours + centre) / (4w + 1)
  // with w < 0, this is a classic unsharp-mask in disguise.
  vec3 sharpenedRgb = (tN.rgb + tS.rgb + tW.rgb + tE.rgb) * w
                    + tC.rgb * (1.0 - 4.0 * w);
  sharpenedRgb /= (4.0 * w + 1.0 - 4.0 * w);   // normalise denominator
  // Simplified: denominator = 1.0 always after expansion.
  // Re-derive cleanly:
  //   numerator   = C*(1) + (N+S+W+E)*w  where w < 0
  //   denominator = 1 + 4*w              (sum of all weights)
  float denom = 1.0 + 4.0 * w;
  vec3  cas   = (tC.rgb + (tN.rgb + tS.rgb + tW.rgb + tE.rgb) * w) / denom;

  // ── Clamp to avoid overshooting bright crystal highlights ─
  cas = clamp(cas, vec3(0.0), vec3(1.0));

  // ── Alpha: preserve centre tap transparency ───────────────
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

    this._scale = Math.min(Math.max(opts.scale ?? 0.5, 0.05), 1.0)

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
    this.renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter:    THREE.LinearFilter,
      magFilter:    THREE.LinearFilter,
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

    this.lowResCamera = new THREE.PerspectiveCamera(60, rw / rh, 0.1, 100)
    // Fix 1: camera at z=5, cube at origin — no overlap, always in frustum
    this.lowResCamera.position.z = 5

    // ── Procedural Earth: SphereGeometry (128 subdivisions) + FBM ShaderMaterial ──
    // 128×128 segments → smooth sphere silhouette for atmosphere rim Fresnel.
    // Intentionally rendered at 0.5× (Rail A) so jaggies are visible pre-CAS.
    const earthGeo = new THREE.SphereGeometry(1.4, 128, 128)
    this._crystalMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_EARTH,
      fragmentShader: FRAG_EARTH,
      uniforms: {
        uTime: { value: 0.0 },
      },
      transparent: true,
      side:        THREE.FrontSide,
      depthWrite:  true,
    })
    this._testCube = new THREE.Mesh(earthGeo, this._crystalMat)
    this.lowResScene.add(this._testCube)

    // Optional: ambient point light for subtle diffuse if materials are swapped later
    const ambLight = new THREE.AmbientLight(0xffffff, 0.0)  // purely decorative at 0 intensity
    this.lowResScene.add(ambLight)

    // ── Moon: 1/4× size of Earth, offset to right of scene ──
    // Earth radius = 1.4 → Moon radius = 0.35
    // Placed at x=+2.8, y=+0.4 so both bodies are visible in 60° FOV frustum
    const moonGeo = new THREE.SphereGeometry(0.35, 64, 64)
    this._moonMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_MOON,
      fragmentShader: FRAG_MOON,
      uniforms: {
        uTime: { value: 0.0 },
      },
      transparent: false,
      side:        THREE.FrontSide,
      depthWrite:  true,
    })
    this._moonMesh = new THREE.Mesh(moonGeo, this._moonMat)
    // Static offset — orbit animation is driven inside VERT_MOON via uTime
    this._moonMesh.position.set(2.8, 0.4, -1.2)
    this.lowResScene.add(this._moonMesh)

    // ── Deep-space background: large sphere, rendered inside-out ──
    // Radius 40 keeps it well outside near/far planes (0.1–100).
    // BackSide makes the shader run on the inner surface of the sphere,
    // always appearing behind the planets (depthTest=false for skybox).
    const spaceGeo = new THREE.SphereGeometry(40, 48, 24)
    this._spaceMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_SPACE,
      fragmentShader: FRAG_SPACE,
      uniforms: {
        uTime: { value: 0.0 },
      },
      transparent: true,
      side:        THREE.BackSide,      // inner surface
      depthWrite:  false,
      depthTest:   false,             // skybox always behind everything
    })
    this._spaceMesh = new THREE.Mesh(spaceGeo, this._spaceMat)
    // Position at camera origin — skybox surrounds entire lowResScene
    this._spaceMesh.position.set(0, 0, 0)
    this.lowResScene.add(this._spaceMesh)

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
        uLowResTex:  { value: this.renderTarget.texture },
        // CAS tunables — texel size must match physical screen resolution,
        // NOT the low-res FBO size (the quad samples in screen UV space).
        uTexelSize:  { value: new THREE.Vector2(1.0 / w, 1.0 / h) },
        uSharpness:  { value: 0.85 },
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
  // ══════════════════════════════════════════════════════════
  _tick() {
    const { renderer, renderTarget, lowResScene, lowResCamera,
            highResScene, highResCamera, _testCube, _crystalMat } = this

    if (!renderer || !renderTarget || !lowResScene || !lowResCamera ||
        !highResScene || !highResCamera) return

    // Drive earth animation via uTime (rotation handled in VERT_EARTH)
    if (_crystalMat) {
      _crystalMat.uniforms.uTime.value = this._elapsedSec
    }
    if (this._moonMat) {
      this._moonMat.uniforms.uTime.value = this._elapsedSec
    }
    if (this._spaceMat) {
      this._spaceMat.uniforms.uTime.value = this._elapsedSec
    }

    // ── Rail A: low-res scene → FBO ─────────────────────────
    // Clear MUST happen AFTER setRenderTarget(FBO) — otherwise we'd
    // clear the screen buffer instead of the off-screen FBO.
    renderer.setRenderTarget(renderTarget)
    renderer.setClearColor(0x000000, 0)   // transparent black
    renderer.clear()
    renderer.render(lowResScene, lowResCamera)

    // ── Rail B: FBO texture → fullscreen upscale → screen ───
    // Clear screen buffer with alpha=0 so the CSS background shows through.
    renderer.setRenderTarget(null)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(highResScene, highResCamera)
  }

  // ══════════════════════════════════════════════════════════
  //  setCasEnabled(enabled)
  //
  //  Toggle the CAS sharpening pass on Rail B.
  //    true  → uSharpness = 0.85 (full CAS, knife-edge output)
  //    false → uSharpness = 0.0  (bypass: raw bilinear upscale, blurry)
  //
  //  Called from the Vue component on mousedown / mouseup to give
  //  a live before/after comparison without tearing or frame drops.
  // ══════════════════════════════════════════════════════════
  setCasEnabled(enabled) {
    if (!this._upscaleMaterial) return
    this._upscaleMaterial.uniforms.uSharpness.value = enabled ? 0.85 : 0.0
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
      this.lowResCamera.aspect = rw / rh
      this.lowResCamera.updateProjectionMatrix()
    }

    // Keep CAS texel size in sync with physical screen resolution
    if (this._upscaleMaterial) {
      this._upscaleMaterial.uniforms.uTexelSize.value.set(1.0 / w, 1.0 / h)
    }
  }

  // ══════════════════════════════════════════════════════════
  //  destroy()
  // ══════════════════════════════════════════════════════════
  destroy() {
    if (this.renderTarget)      { this.renderTarget.dispose();      this.renderTarget = null }
    if (this._upscaleMaterial)  { this._upscaleMaterial.dispose();  this._upscaleMaterial = null }
    if (this._crystalMat)       { this._crystalMat.dispose();       this._crystalMat = null }
    if (this._moonMat)          { this._moonMat.dispose();         this._moonMat = null }
    if (this._spaceMat)         { this._spaceMat.dispose();        this._spaceMat = null }
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
    this.lowResScene   = null
    this.highResScene  = null
    this.lowResCamera  = null
    this.highResCamera = null
    super.destroy()
  }
}

export default SuperResEngine
