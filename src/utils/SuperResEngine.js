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

uniform float uTime;
uniform vec3  uSunDir;
// uDetailLevel: 0.0 = raw/low-detail (3 oct), 1.0 = CAS/ultra-high (12 oct)
uniform float uDetailLevel;

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

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // ── FIX: noisePos derived from vLocalPosition (mesh-local space) ──
  // normalize(vLocalPosition) gives a unit sphere surface point that is
  // rigidly locked to the mesh — it follows every degree of rotation.y.
  // Continent coastlines, terrain bumps, and ocean waves are all anchored here.
  vec3 noisePos = normalize(vLocalPosition) * 1.6 + vec3(3.7, 1.2, 0.8);

  // ── Continent mask — octave count scales with detail level ─
  // RAW: 3+2+2=7 total oct  |  CAS: 8+6+5=19 total oct (clamped per fbm)
  int oct1 = 4 + int(uDetailLevel * 4.0);  // 4 … 8
  int oct2 = 3 + int(uDetailLevel * 3.0);  // 3 … 6
  int oct3 = 2 + int(uDetailLevel * 3.0);  // 2 … 5
  float fbm1 = fbm(noisePos,              oct1);
  float fbm2 = fbm(noisePos * 2.1 + 5.3, oct2);
  float fbm3 = fbm(noisePos * 4.7 + 2.9, oct3);

  float landMask = fbm1 * 0.5 + fbm2 * 0.3 + fbm3 * 0.2;
  float isLand   = smoothstep(0.40, 0.44, landMask);

  // ── Ultra-high-freq coastline rubble layer ─────────────────
  // Only meaningful in CAS mode (uDetailLevel → 1).
  // Adds sub-pixel granularity at coastline transitions.
  float hfDetail    = fbmHF(noisePos * 12.0);
  float coastlineMix = abs(isLand - 0.5) * 2.0;   // peak at 0.5 → coastline
  float coastRubble  = hfDetail * (1.0 - coastlineMix) * uDetailLevel * 0.12;
  // Slightly roughens the land/ocean boundary
  isLand = clamp(isLand + coastRubble, 0.0, 1.0);

  vec3 sunDir = normalize(uSunDir);
  float NdotL  = max(dot(N, sunDir), 0.0);
  float diffuse = NdotL * 1.0 + 0.35;

  // ── Ocean ─────────────────────────────────────────────────
  float waveFreq  = mix(8.0, 28.0, uDetailLevel);   // RAW: coarse / CAS: fine
  float waveNoise = noise(vUv * waveFreq        + uTime * 0.15) * 0.5
                  + noise(vUv * waveFreq * 2.0  - uTime * 0.22) * 0.25;
  // HF micro-ripple layer — only in CAS mode
  waveNoise += noise(vUv * 64.0 + uTime * 0.08) * 0.12 * uDetailLevel;

  vec3 oceanDeep  = vec3(0.02, 0.09, 0.28);
  vec3 oceanShall = vec3(0.05, 0.28, 0.55);
  vec3 oceanColor = mix(oceanDeep, oceanShall, waveNoise);

  vec3 H    = normalize(V + sunDir);
  float oSpec = pow(max(dot(N, H), 0.0), mix(64.0, 256.0, uDetailLevel)) * 2.5;
  oceanColor += vec3(0.8, 0.9, 1.0) * oSpec * (1.0 - isLand);

  // ── Land ──────────────────────────────────────────────────
  float elevation = fbm1;
  vec3 lowland  = vec3(0.12, 0.28, 0.08);
  vec3 highland = vec3(0.38, 0.28, 0.14);
  vec3 snowcap  = vec3(0.85, 0.88, 0.92);
  vec3 landColor = mix(lowland, highland, smoothstep(0.50, 0.70, elevation));
  landColor      = mix(landColor, snowcap, smoothstep(0.70, 0.85, elevation));

  // Micro-rubble rock texture on land — CAS mode only
  float rockDetail = fbmHF(noisePos * 20.0) * uDetailLevel * 0.08;
  landColor *= 1.0 - rockDetail * (1.0 - smoothstep(0.70, 0.85, elevation));

  // Normal perturbation — octave count scales with detail
  vec3 perturbedN   = normalize(N + fbmNormal(noisePos * 2.0, 0.02) * 0.40 * isLand);
  float pertDiffuse = max(dot(perturbedN, sunDir), 0.0) + 0.35;

  vec3 surfaceColor = mix(oceanColor * diffuse, landColor * pertDiffuse, isLand);

  // ── Atmosphere Fresnel rim ────────────────────────────────
  float cosNV = max(dot(N, V), 0.0);
  float rim   = fresnelSchlick(cosNV, 0.0);
  rim         = pow(rim, 1.8);
  float rimDayMask = smoothstep(-0.1, 0.3, NdotL);
  vec3 atmColor = vec3(0.42, 0.72, 1.0) * rim * 1.4 * rimDayMask;

  // ── Cloud layer — dual-dynamic: planet rotation + atmospheric drift ──
  // FIX: cloud noise is seeded from vLocalPosition so clouds co-rotate
  // with the planet mesh.  On top of that, a time-driven XZ rotation
  // matrix applies a slow INDEPENDENT atmospheric drift, creating the
  // two-layer dynamics: solid crust lock + fluid atmosphere circulation.
  int cloudOct = 3 + int(uDetailLevel * 4.0);  // 3 … 7
  // Atmospheric drift: slow independent rotation of XZ plane at 0.012 rad/s
  // This is ADDITIONAL to the mesh rotation — atmosphere circulates over crust.
  float driftAngle = uTime * 0.012;
  float driftCos   = cos(driftAngle);
  float driftSin   = sin(driftAngle);
  vec3  localUnit  = normalize(vLocalPosition);
  // Apply 2D rotation matrix to the X and Z components only
  vec3  driftedPos = vec3(
    localUnit.x * driftCos - localUnit.z * driftSin,
    localUnit.y,
    localUnit.x * driftSin + localUnit.z * driftCos
  );
  vec3 cloudPos = driftedPos * 3.1;
  float cloud   = smoothstep(0.52, 0.62, fbm(cloudPos, cloudOct));
  // HF cloud wisp tendrils in CAS mode
  float cloudHF = smoothstep(0.60, 0.70, fbmHF(cloudPos * 2.5)) * uDetailLevel * 0.3;
  surfaceColor  = mix(surfaceColor, vec3(0.95, 0.96, 0.98), (cloud + cloudHF) * 0.6);

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
uniform vec2      uTexelSize;   // vec2(1/W, 1/H) in screen pixels
uniform float     uSharpness;   // 0 = off, 1 = max CAS push (default 0.85)
uniform float     uTime;        // wall-clock seconds — for film grain animation
uniform float     uGrainStr;    // grain strength: 0.0 = off, 1.0 = full

varying vec2 vUv;

// ── Luminance ─────────────────────────────────────────────────
float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// ── Film grain — animated, blue-noise approximation ──────────
// Three phase-offset hash samples approximate blue-noise grain,
// reducing the clumping artefacts of a single hash.
float filmGrain(vec2 uv, float time) {
  // Snap to ~24fps film-frame ticks for cinematic flicker
  float tick = floor(time * 24.0);
  vec2 seed  = uv * 512.0 + vec2(tick * 17.31, tick * 11.73);
  float h1 = fract(sin(dot(seed,               vec2(127.1, 311.7))) * 43758.5453);
  float h2 = fract(sin(dot(seed + 0.5,         vec2(269.5, 183.3))) * 43758.5453);
  float h3 = fract(sin(dot(seed + vec2(0.5,0), vec2(419.2, 371.9))) * 43758.5453);
  return (h1 + h2 + h3) / 3.0 - 0.5;   // zero-centred [-0.5, 0.5]
}

void main() {
  // ── 9-tap cross + diagonal micro-pixel sample ────────────
  // Standard 5-tap CAS cross + 4 diagonal half-pixel offsets.
  // The diagonal taps provide sub-pixel luma sampling that
  // catches near-horizontal / near-vertical edges the pure cross misses.
  float hx = uTexelSize.x;
  float hy = uTexelSize.y;
  float hx2 = hx * 0.5;  // sub-pixel offset for diagonal taps
  float hy2 = hy * 0.5;

  vec4 tC  = texture2D(uLowResTex, vUv);
  vec4 tN  = texture2D(uLowResTex, vUv + vec2( 0.0,  hy));
  vec4 tS  = texture2D(uLowResTex, vUv + vec2( 0.0, -hy));
  vec4 tW  = texture2D(uLowResTex, vUv + vec2(-hx,   0.0));
  vec4 tE  = texture2D(uLowResTex, vUv + vec2( hx,   0.0));
  // Diagonal half-pixel taps for sub-pixel luma variance
  vec4 tNE = texture2D(uLowResTex, vUv + vec2( hx2,  hy2));
  vec4 tNW = texture2D(uLowResTex, vUv + vec2(-hx2,  hy2));
  vec4 tSE = texture2D(uLowResTex, vUv + vec2( hx2, -hy2));
  vec4 tSW = texture2D(uLowResTex, vUv + vec2(-hx2, -hy2));

  // ── Luma per tap ──────────────────────────────────────────
  float lC  = luma(tC.rgb);
  float lN  = luma(tN.rgb);
  float lS  = luma(tS.rgb);
  float lW  = luma(tW.rgb);
  float lE  = luma(tE.rgb);
  // Diagonal luma — averaged pairs for variance contribution
  float lDiag = (luma(tNE.rgb) + luma(tNW.rgb) + luma(tSE.rgb) + luma(tSW.rgb)) * 0.25;

  // ── Extended contrast range includes diagonal sub-pixel luma ─
  float mnL = min(min(lC, min(min(lN, lS), min(lW, lE))), lDiag);
  float mxL = max(max(lC, max(max(lN, lS), max(lW, lE))), lDiag);

  // ── CAS adaptive sharpening weight ───────────────────────
  // w = uSharpness * sqrt(mnL / (mxL + ε)) * -0.125
  //   • Near 0 on strong edges → anti-halo protection
  //   • Near max on flat regions → strongest sharpening push
  float contrast = sqrt(mnL / (mxL + 1e-4));
  float w = contrast * (-0.125 * uSharpness);

  // ── CAS colour output ─────────────────────────────────────
  float denom = 1.0 + 4.0 * w;
  vec3  cas   = (tC.rgb + (tN.rgb + tS.rgb + tW.rgb + tE.rgb) * w) / denom;
  cas = clamp(cas, vec3(0.0), vec3(1.0));

  // ── Film grain overlay ────────────────────────────────────
  // Applied AFTER CAS to mask WebGL float-precision banding artefacts.
  // Strength: uGrainStr * 0.04 → maximum ±2% luminance perturbation.
  // This is sufficient to break up plastic banding while being
  // invisible at normal viewing distances.
  float grain = filmGrain(vUv, uTime);
  cas += grain * uGrainStr * 0.04;
  cas  = clamp(cas, 0.0, 1.0);

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
    this._crystalMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_EARTH,
      fragmentShader: FRAG_EARTH,
      uniforms: {
        uTime:        { value: 0.0 },
        uSunDir:      { value: this._sunLight.position.clone().normalize() },
        // ── DEFAULT: 0.0 = RAW/stripped (4-octave FBM, no micro-detail) ──
        // Boots in mosaic ruin — user engages toggle to activate CAS full-detail.
        uDetailLevel: { value: 0.0 },
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
        uLowResTex:  { value: this.renderTarget.texture },
        // CAS tunables — texel size must match physical screen resolution,
        // NOT the low-res FBO size (the quad samples in screen UV space).
        uTexelSize:  { value: new THREE.Vector2(1.0 / w, 1.0 / h) },
        // ── DEFAULT: RAW INPUT state (CAS off by default) ──
        // System boots in 0.15× mosaic ruin. User must engage toggle to enable.
        uSharpness:  { value: 0.0 },
        // Film grain — disabled in RAW mode
        uTime:       { value: 0.0 },
        uGrainStr:   { value: 0.0 },   // 0.0 = none in RAW; 0.6 in CAS
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
  //  RESOLUTION TIER TABLE
  //
  //  Four discrete tiers, each a precision instrument setting:
  //
  //  'RAW'         0.10×  NearestFilter  uSharpness=0.00  uDetailLevel=0.0  grain=0.0
  //  'PERFORMANCE' 0.25×  LinearFilter   uSharpness=0.40  uDetailLevel=0.0  grain=0.3
  //  'BALANCED'    0.50×  LinearFilter   uSharpness=0.70  uDetailLevel=0.5  grain=0.5
  //  'ULTRA'       1.00×  LinearFilter   uSharpness=0.95  uDetailLevel=1.0  grain=0.6
  //
  // ══════════════════════════════════════════════════════════
  static TIERS = {
    RAW:         { scale: 0.10, sharpness: 0.00, detail: 0.0, grain: 0.0, filter: 'nearest' },
    PERFORMANCE: { scale: 0.25, sharpness: 0.40, detail: 0.0, grain: 0.3, filter: 'linear'  },
    BALANCED:    { scale: 0.50, sharpness: 0.70, detail: 0.5, grain: 0.5, filter: 'linear'  },
    ULTRA:       { scale: 1.00, sharpness: 0.95, detail: 1.0, grain: 0.6, filter: 'linear'  },
  }

  // ══════════════════════════════════════════════════════════
  //  setResolutionTier(tierName)
  //
  //  Apply a named resolution tier to the full dual-rail pipeline:
  //    1. uSharpness          — CAS kernel strength
  //    2. uGrainStr           — film grain overlay
  //    3. _scale + RenderTarget.setSize()  — FBO pixel budget
  //    4. texture filter      — NearestFilter (RAW) / LinearFilter (others)
  //    5. uDetailLevel        — planet shader octave count
  //
  //  Zero-latency state snap — no lerp, no transition, no apology.
  // ══════════════════════════════════════════════════════════
  setResolutionTier(tierName) {
    const cfg = SuperResEngine.TIERS[tierName]
    if (!cfg) { console.warn('[SuperResEngine] Unknown tier:', tierName); return }
    if (!this._upscaleMaterial) return

    // ── 1. CAS sharpness ────────────────────────────────────
    this._upscaleMaterial.uniforms.uSharpness.value = cfg.sharpness

    // ── 2. Film grain ────────────────────────────────────────
    this._upscaleMaterial.uniforms.uGrainStr.value = cfg.grain

    // ── 3. Render resolution ─────────────────────────────────
    this._scale = cfg.scale
    if (this.renderTarget) {
      const { w, h } = this._getSize()
      if (w && h) {
        const rw = Math.max(Math.round(w * cfg.scale), 1)
        const rh = Math.max(Math.round(h * cfg.scale), 1)
        this.renderTarget.setSize(rw, rh)
      }
    }

    // ── 4. FBO texture filter ────────────────────────────────
    // RAW: NearestFilter — pixel-ruin brutalism
    // All others: LinearFilter — smooth bilinear upscale for CAS
    if (this.renderTarget && this.renderTarget.texture) {
      const filter = cfg.filter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter
      this.renderTarget.texture.minFilter = filter
      this.renderTarget.texture.magFilter = filter
      this.renderTarget.texture.needsUpdate = true
    }

    // ── 5. Planet shader detail level ───────────────────────
    if (this._crystalMat && this._crystalMat.uniforms.uDetailLevel) {
      this._crystalMat.uniforms.uDetailLevel.value = cfg.detail
    }
    if (this._moonMat && this._moonMat.uniforms.uDetailLevel) {
      this._moonMat.uniforms.uDetailLevel.value = cfg.detail
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
    const ZOOM_MAX      = 2.0
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

    // ── REFERENCE FRAME LOCK: apply inverse camera-Z compensation ──
    // visual_size ∝ world_scale / camera_Z
    // To keep visual size constant at the Z_DEFAULT=5.0 baseline:
    //   refScale = finalZ / Z_DEFAULT
    // This exactly cancels the apparent shrink caused by camera pullback.
    const refScale = finalZ / Z_DEFAULT
    if (this._polarGrid) {
      this._polarGrid.scale.set(refScale, refScale, refScale)
    }
    if (this._orbitLine) {
      this._orbitLine.scale.set(refScale, refScale, refScale)
    }

    // ── Expose current zoom state for CSS frame expansion ────
    // Vue component reads this._zoomEffective to drive CSS variables.
    this._zoomEffective = effectiveZoom

    console.log(
      `[SuperResEngine] setZoom(${clamped.toFixed(2)}) → effective=${effectiveZoom.toFixed(3)}` +
      ` camZ=${finalZ.toFixed(2)} refScale=${refScale.toFixed(3)}` +
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
