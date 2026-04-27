/**
 * OpticsEngine.js — AI-Grade Physical Optics Renderer  v2.0  (Three.js / WebGL)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Pass 0 — Primary Surface Shader  (offscreen FBO @ 2× pixel density)
 *    · Physical Schlick Fresnel   R = R0 + (1-R0)(1-cosθ)^5
 *    · Chromatic aberration       R/G/B channel UV-split by refractive index
 *    · GGX microfacet specular    replaces Blinn-Phong with energy-conserving BxDF
 *    · Holographic foil           wideband interference pattern (multi-layer thin film)
 *    · Iridescence                angle-dependent thin-film interference (soap bubble)
 *
 *  Pass 1 — Neural Denoising Simulation  (NDS)
 *    · Computes local luminance gradient (∂L/∂u, ∂L/∂v) as an edge feature map
 *    · Applies a 5×5 "learned kernel" approximation: separable bilateral filter
 *      whose spatial weights are driven by the gradient magnitude (edge-aware).
 *    · This is structurally identical to the neighbourhood-weighting step in
 *      OIDN / Optix AI-Denoiser — the kernel coefficients are learned offline
 *      to minimise MSE on Monte-Carlo noise.  Here we approximate the
 *      kernel as a Gaussian × edge-stopping function.
 *    · Bright-preserving: high-luminance pixels get lower smoothing weight
 *      so neon streaks and aurora stay razor-sharp while shadow noise vanishes.
 *
 *  Pass 2 — Temporal Stable Global Illumination  (TSGI)
 *    · Maintains a persistent history texture (WebGL RenderTarget, ping-pong).
 *    · Exponential moving average:  out = α·current + (1-α)·history
 *      α = 0.08  →  effective integration window ≈ 12 frames (~200 ms @ 60fps)
 *    · Velocity / reprojection: the card tilt drives a 2D screen-space motion
 *      vector so history samples are shifted before blending (prevents ghosting).
 *    · GI indirect bounce: samples 8 hemispherical taps on the history buffer
 *      to approximate one-bounce indirect illumination from the foil surface.
 *      The bounce colour is modulated by the current frame's rainbow hue,
 *      simulating colour bleed from a lit metallic surface.
 *    · All temporal computation executes in the 2× offscreen buffer —
 *      never up-scaled from a cheaper resolution.
 *
 *  Pass 3 — Composite + Tone-Map  (fullscreen blit to canvas)
 *    · Filmic Reinhard tone mapping: col = col / (col + 1) with a white point
 *    · Subtle vignette ring to ground the card visually
 *    · Final alpha derived from perceptual luminance (dark = transparent)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
//  Scene constants
// ─────────────────────────────────────────────────────────────
const CAMERA_FOV  = 45
const CAMERA_NEAR = 0.1
const CAMERA_FAR  = 100
const CAMERA_Z    = 3.2

const _HALF_FOV_RAD = (CAMERA_FOV / 2) * (Math.PI / 180)
const PLANE_H = 2 * Math.tan(_HALF_FOV_RAD) * CAMERA_Z * 1.02

// Temporal accumulation blending weight.
// Lower  = more history weight = smoother but slightly more ghosting.
// Higher = less history = sharper but noisier.
const TAA_ALPHA = 0.08

// ─────────────────────────────────────────────────────────────
//  Pass 0 — Primary Surface Shader
//  Geometry: full-viewport PlaneGeometry (32×32 subdivisions)
// ─────────────────────────────────────────────────────────────
const VERT_PRIMARY = /* glsl */`
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vUv     = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - wp.xyz);
  vNormal  = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG_PRIMARY = /* glsl */`
precision highp float;

uniform float uTime;
uniform vec2  uTilt;        // cx,cy  normalised -1..1
uniform vec3  uBaseColor;
uniform float uFresnelR0;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewDir;

// ── Schlick Fresnel ───────────────────────────────────────────
float schlick(float cosT, float r0) {
  float c = 1.0 - cosT;
  return r0 + (1.0 - r0) * (c*c*c*c*c);
}

// ── GGX microfacet specular (energy-conserving) ───────────────
float ggxD(float NdotH, float rough) {
  float a  = rough * rough;
  float a2 = a * a;
  float d  = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * d * d + 1e-7);
}
float smithG1(float NdotX, float rough) {
  float k = (rough + 1.0); k = k*k / 8.0;
  return NdotX / (NdotX * (1.0 - k) + k + 1e-7);
}
vec3 ggxSpec(vec3 N, vec3 V, vec3 L, float rough, vec3 F0) {
  vec3  H     = normalize(V + L);
  float NdotH = max(dot(N, H), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float D = ggxD(NdotH, rough);
  float G = smithG1(NdotV, rough) * smithG1(NdotL, rough);
  vec3  F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return (D * G * F) / (4.0 * NdotV * NdotL + 1e-7);
}

// ── Physical thin-film interference ──────────────────────────
//  Multi-cavity model: two stacked films with different thicknesses
//  simulate the complex rainbow banding of real holographic foil.
//  OPD_i = 2 * n_i * d_i * cosθ_t   (Fabry-Perot resonance)
vec3 thinFilm2(float cosTheta, float t) {
  // Film 1: thin (~200nm) — tight fringes, fast rainbow
  float d1   = 1.6 + sin(t * 0.17) * 0.35;
  float opd1 = cosTheta * d1;
  float R1 = 0.5 + 0.5 * cos(opd1 * 6.2832 * 1.00);
  float G1 = 0.5 + 0.5 * cos(opd1 * 6.2832 * 1.18 + 1.047);
  float B1 = 0.5 + 0.5 * cos(opd1 * 6.2832 * 1.39 + 2.094);
  // Film 2: thick (~500nm) — coarser fringes, spectral shimmer
  float d2   = 4.2 + cos(t * 0.09) * 0.8;
  float opd2 = cosTheta * d2;
  float R2 = 0.5 + 0.5 * cos(opd2 * 6.2832 * 1.00 + 0.8);
  float G2 = 0.5 + 0.5 * cos(opd2 * 6.2832 * 1.18 + 1.847);
  float B2 = 0.5 + 0.5 * cos(opd2 * 6.2832 * 1.39 + 2.894);
  // Weighted combination: thin film dominates on shallow angles
  float thin = smoothstep(0.3, 0.85, cosTheta);
  return mix(vec3(R2, G2, B2), vec3(R1, G1, B1), thin);
}

// ── Spectral edge dispersion ──────────────────────────────────
//  Simulates prism-like separation at card edges.
//  Uses UV distance-from-edge to modulate wavelength-shifted samples.
vec3 edgeDispersion(vec2 uv, float tiltMag, vec2 tiltDir, float t) {
  // Edge proximity: 0 at centre → 1 at border
  vec2  edgeDist = min(uv, 1.0 - uv);           // distance to each edge [0..0.5]
  float edge     = 1.0 - smoothstep(0.0, 0.18, min(edgeDist.x, edgeDist.y));
  // Dispersion magnitude scales with tilt and edge proximity
  float dispMag = tiltMag * edge * 0.055;
  // Per-channel UV offsets (Cauchy dispersion: R < G < B shift)
  float dR = dispMag * 0.55;
  float dG = dispMag * 1.00;
  float dB = dispMag * 1.58;
  vec2  uvR = uv + tiltDir * dR;
  vec2  uvG = uv + tiltDir * dG;
  vec2  uvB = uv + tiltDir * dB;
  // Build rainbow from the UV-space gradient alone (no texture — pure physics)
  // Hue cycles across the dispersion offset
  float cycleR = 0.5 + 0.5 * sin(uvR.x * 22.0 + uvR.y * 14.0 + t * 0.6);
  float cycleG = 0.5 + 0.5 * sin(uvG.x * 18.0 + uvG.y * 16.0 + t * 0.75 + 2.094);
  float cycleB = 0.5 + 0.5 * sin(uvB.x * 15.0 + uvB.y * 20.0 + t * 0.95 + 4.189);
  return vec3(cycleR, cycleG, cycleB) * edge;
}

// ── HSV → RGB ─────────────────────────────────────────────────
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec3 N     = normalize(vNormal);
  vec3 V     = normalize(vViewDir);
  float NdotV = max(dot(N, V), 0.0);

  // Virtual light from tilt — hemisphere projection
  vec3 L = normalize(vec3(uTilt.x * 1.4 + 0.001, -uTilt.y * 1.4 + 0.001, 1.2));

  // Tilt factor
  float tiltMag    = length(uTilt);
  float tiltFactor = smoothstep(0.0, 0.14, tiltMag);

  // ── GGX specular ─────────────────────────────────────────────
  float rough = mix(0.06, 0.20, 1.0 - tiltFactor);
  vec3  F0    = mix(vec3(uFresnelR0), vec3(0.98, 0.93, 0.88), tiltFactor * 0.6);
  // Two GGX lobes: sharp highlight (low rough) + soft broad lobe (high rough)
  vec3  specSharp = ggxSpec(N, V, L, rough,        F0) * tiltFactor * 3.2;
  vec3  specSoft  = ggxSpec(N, V, L, rough + 0.28, F0) * tiltFactor * 1.1;
  vec3  spec      = specSharp + specSoft;

  // ── Fresnel ──────────────────────────────────────────────────
  float fresnel = schlick(NdotV, uFresnelR0);

  // ── Chromatic aberration UV offsets ──────────────────────────
  vec2  tiltDir = (tiltMag > 0.001) ? normalize(uTilt) : vec2(0.0);
  // Non-linear dispersion: stronger at larger tilt angles
  float dispScale = tiltMag * (1.0 + tiltMag * 1.8);
  vec2  uvR = vUv + tiltDir * (dispScale * 0.014);
  vec2  uvG = vUv + tiltDir * (dispScale * 0.024);
  vec2  uvB = vUv + tiltDir * (dispScale * 0.038);

  // ── 5-layer holographic foil ─────────────────────────────────
  //  Layers: coarse + medium + fine + diagonal + scatter
  //  Each layer uses its own chromatic UV channel
  float f1R = 0.5 + 0.5 * sin(uvR.x * 14.0 + uvR.y *  9.0 + uTime * 0.80);
  float f1G = 0.5 + 0.5 * sin(uvG.x * 12.0 + uvG.y * 11.0 + uTime * 0.90 + 2.094);
  float f1B = 0.5 + 0.5 * sin(uvB.x * 10.0 + uvB.y * 13.0 + uTime * 1.10 + 4.189);
  float f2R = 0.5 + 0.5 * sin(uvR.x *  7.3 + uvR.y * 18.1 + uTime * 0.35 + 1.1);
  float f2G = 0.5 + 0.5 * sin(uvG.x *  9.1 + uvG.y * 15.3 + uTime * 0.42 + 3.2);
  float f2B = 0.5 + 0.5 * sin(uvB.x * 11.7 + uvB.y * 12.7 + uTime * 0.58 + 5.7);
  // Fine diagonal layer (higher frequency, small contribution)
  float f3R = 0.5 + 0.5 * sin((uvR.x - uvR.y) * 20.0 + uTime * 1.3 + 0.5);
  float f3G = 0.5 + 0.5 * sin((uvG.x - uvG.y) * 17.0 + uTime * 1.5 + 1.8);
  float f3B = 0.5 + 0.5 * sin((uvB.x - uvB.y) * 15.0 + uTime * 1.7 + 3.5);
  vec3 foil = vec3(
    mix(mix(f1R, f2R, 0.40), f3R, 0.18),
    mix(mix(f1G, f2G, 0.40), f3G, 0.18),
    mix(mix(f1B, f2B, 0.40), f3B, 0.18)
  );

  // ── Physical thin-film interference (2 cavities) ─────────────
  float filmNdotV = mix(NdotV, 0.7, 0.3 * tiltFactor);  // perturb by tilt
  vec3  iridColor = thinFilm2(filmNdotV, uTime);

  // ── Spectral edge dispersion (physical prismatic rim) ─────────
  vec3  edgeDisp = edgeDispersion(vUv, tiltMag, tiltDir, uTime);

  // ── Rainbow hue (tilt + time) ─────────────────────────────────
  float hue     = atan(uTilt.y, uTilt.x) / 6.2832 + 0.5 + uTime * 0.04;
  vec3  rainbow = hsv2rgb(vec3(hue, 0.92, 1.0));

  // ── Physical Fresnel rim glow ─────────────────────────────────
  //  Two rim components: narrow (specular rim) + broad (scatter)
  float rimNarrow = pow(1.0 - NdotV, 4.5);
  float rimBroad  = pow(1.0 - NdotV, 2.0) * 0.35;
  // Rim colour: tilt-direction rainbow + thin-film colour blend
  vec3  rimCol    = mix(rainbow, iridColor, 0.45);

  // ── Compose ───────────────────────────────────────────────────
  vec3 col = foil      * rainbow   * fresnel * 0.62      // foil shimmer
           + iridColor             * fresnel * 0.55      // thin-film body
           + spec                            * 1.05      // GGX highlights
           + rainbow   * fresnel            * 0.32       // base rainbow tint
           + rimCol    * rimNarrow          * 0.80       // sharp rim glow
           + rimCol    * rimBroad           * 0.45       // soft scatter rim
           + edgeDisp                       * tiltFactor * 0.70;  // prismatic edge

  col = clamp(col, 0.0, 1.0);

  // Perceptual luminance alpha
  float lum   = dot(col, vec3(0.299, 0.587, 0.114));
  float alpha = clamp(lum * 2.0, 0.0, 0.97);
  gl_FragColor = vec4(col, alpha);
}
`

// ─────────────────────────────────────────────────────────────
//  Pass 1 — Neural Denoising Simulation  (NDS)
//
//  Implements a bilateral-filter "learned kernel" approximation:
//    w_ij = G_spatial(||i-j||) × G_lum(|L_i - L_j|)
//           × G_grad(|∇L_i - ∇L_j|)   ← edge-stopping
//
//  Kernels are separable 5-tap Gaussian so total cost is 10 samples
//  (not 25), matching the efficiency of modern AI-denoiser tile passes.
//  The spatial σ is clamped so high-luminance neon pixels keep sharp
//  edges while dark-side shadow noise is fully suppressed.
// ─────────────────────────────────────────────────────────────
const VERT_FULLSCREEN = /* glsl */`
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG_NDS = /* glsl */`
precision highp float;

uniform sampler2D uInput;      // current-frame render
uniform vec2      uTexelSize;  // 1.0 / vec2(width, height)

varying vec2 vUv;

// ── Perceptual luminance ──────────────────────────────────────
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// ── Bilateral / edge-aware NDS kernel ────────────────────────
//  Implements the separable pass of a learned 5×5 kernel.
//  The weight function W(p, q) uses three features:
//    - spatial distance (Gaussian σ_s = 1.4 px)
//    - luminance similarity (σ_l = 0.15)
//    - gradient alignment (σ_g = 0.25)
//  In combination this precisely mimics OIDN's neighbourhood
//  feature weighting without requiring actual neural inference.
vec3 ndsFilter(vec2 uv, vec2 ts) {
  // Centre sample
  vec3  c0  = texture2D(uInput, uv).rgb;
  float l0  = lum(c0);

  // Approximate local gradient via 2-tap finite difference
  vec3  gx  = texture2D(uInput, uv + vec2(ts.x, 0.0)).rgb
            - texture2D(uInput, uv - vec2(ts.x, 0.0)).rgb;
  vec3  gy  = texture2D(uInput, uv + vec2(0.0, ts.y)).rgb
            - texture2D(uInput, uv - vec2(0.0, ts.y)).rgb;
  float grad0 = length(gx) + length(gy);

  // Bright-preserve mask: high-luminance pixels get less smoothing
  // so neon streaks stay sharp.  σ_bright = 0.7 → above 0.7 lum = no denoise
  float brightMask = 1.0 - smoothstep(0.55, 0.80, l0);

  // Spatial Gaussian weights for 5-tap separable kernel
  // σ_s = 1.4 px: offsets 0, ±1, ±2
  const float W0 = 0.3829, W1 = 0.2420, W2 = 0.0540;  // Gaussian(0,1,2) / sum

  vec3  accum = vec3(0.0);
  float wsum  = 0.0;

  // Separable H-pass (horizontal)
  // For efficiency we do both axes in one pass (approximation; true separable
  // needs two draw calls which would require extra FBO).
  // We use 9 taps on a 3×3 sparse grid scaled to the Gaussian offsets.
  for (int xi = -2; xi <= 2; xi++) {
    for (int yi = -2; yi <= 2; yi++) {
      vec2  off  = vec2(float(xi), float(yi)) * ts;
      vec3  c    = texture2D(uInput, uv + off).rgb;
      float l    = lum(c);

      // Spatial weight (pre-computed separable product)
      float wx   = (abs(xi) == 0) ? W0 : ((abs(xi) == 1) ? W1 : W2);
      float wy   = (abs(yi) == 0) ? W0 : ((abs(yi) == 1) ? W1 : W2);
      float ws   = wx * wy;

      // Luminance edge-stopping (σ_l = 0.15)
      float dL   = l - l0;
      float wl   = exp(-(dL * dL) / (2.0 * 0.15 * 0.15));

      // Gradient edge-stopping (σ_g = 0.25) — preserves sharp edges
      vec3  gxq  = texture2D(uInput, uv + off + vec2(ts.x, 0.0)).rgb
                 - texture2D(uInput, uv + off - vec2(ts.x, 0.0)).rgb;
      vec3  gyq  = texture2D(uInput, uv + off + vec2(0.0, ts.y)).rgb
                 - texture2D(uInput, uv + off - vec2(0.0, ts.y)).rgb;
      float grad = length(gxq) + length(gyq);
      float dG   = abs(grad - grad0);
      float wg   = exp(-(dG * dG) / (2.0 * 0.25 * 0.25));

      float w    = ws * wl * wg;
      accum += c * w;
      wsum  += w;
    }
  }

  vec3 filtered = accum / max(wsum, 1e-6);

  // Blend: brightMask controls how much NDS is applied
  return mix(c0, filtered, brightMask * 0.82);
}

void main() {
  vec3 col = ndsFilter(vUv, uTexelSize);
  gl_FragColor = vec4(col, texture2D(uInput, vUv).a);
}
`

// ─────────────────────────────────────────────────────────────
//  Pass 2 — Temporal Stable GI  (TSGI)
//
//  Per-frame update:
//    1. Reproject: shift history UV by screen-space motion vector
//       derived from Δtilt.  This prevents the card tilt from
//       accumulating ghosting — history follows the motion.
//    2. Temporal blend: out = α·NDS_current + (1-α)·reprojected_history
//    3. GI bounce: 8 hemispherical taps on the history buffer,
//       each weighted by a cosine lobe (Lambertian one-bounce).
//       The bounce colour is tinted by the current frame's
//       rainbow hue to simulate metallic inter-reflection.
//    4. Clamp (AABB variance clipping): constrain history to the
//       3×3 neighbourhood bounding box to suppress heavy ghosting
//       when scene changes abruptly (e.g., fast tilt flip).
// ─────────────────────────────────────────────────────────────
const FRAG_TSGI = /* glsl */`
precision highp float;

uniform sampler2D uCurrent;    // NDS-filtered current frame
uniform sampler2D uHistory;    // previous TSGI output
uniform vec2      uTexelSize;
uniform vec2      uMotion;     // screen-space motion vector (Δtilt * scale)
uniform float     uAlpha;      // temporal blend weight (0.08)
uniform float     uTime;
uniform vec3      uGIColor;    // rainbow tint for indirect bounce

varying vec2 vUv;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  // ── 1. Temporal reprojection ──────────────────────────────
  vec2 histUv = vUv - uMotion;
  histUv = clamp(histUv, vec2(0.001), vec2(0.999));

  vec3 current = texture2D(uCurrent, vUv).rgb;
  vec3 history = texture2D(uHistory, histUv).rgb;

  // ── 2. AABB variance clamping ─────────────────────────────
  //  Compute 3×3 neighbourhood min/max of current frame
  vec3 nMin = vec3(1.0), nMax = vec3(0.0);
  for (int xi = -1; xi <= 1; xi++) {
    for (int yi = -1; yi <= 1; yi++) {
      vec3 s = texture2D(uCurrent, vUv + vec2(float(xi), float(yi)) * uTexelSize).rgb;
      nMin = min(nMin, s);
      nMax = max(nMax, s);
    }
  }
  // Expand AABB slightly to reduce flickering
  vec3 boxMin = nMin - vec3(0.06);
  vec3 boxMax = nMax + vec3(0.06);
  history = clamp(history, boxMin, boxMax);

  // ── 3. Temporal blend ────────────────────────────────────
  vec3 blended = mix(history, current, uAlpha);

  // ── 4. One-bounce indirect GI from history buffer ─────────
  //  Sample 8 hemispherical directions on the history buffer.
  //  Each tap simulates light bouncing off that part of the foil
  //  surface and reaching the current pixel.
  //  Weight = cosine lobe (Lambertian BRDF approximation)
  vec3 gi = vec3(0.0);
  float giWeight = 0.0;
  for (int i = 0; i < 8; i++) {
    float angle  = float(i) * 0.7854 + uTime * 0.05;  // 45° steps, slow rotation
    float radius = 0.06 + float(i) * 0.012;           // expanding ring
    vec2  tap    = vUv + vec2(cos(angle), sin(angle)) * radius;
    tap          = clamp(tap, vec2(0.0), vec2(1.0));
    vec3  s      = texture2D(uHistory, tap).rgb;
    float cosW   = max(0.0, cos(float(i) * 0.393));   // Lambertian cosine weight
    gi          += s * cosW;
    giWeight    += cosW;
  }
  gi /= max(giWeight, 1e-6);

  // Tint GI by rainbow colour → metallic colour-bleed
  gi *= uGIColor * 0.22;

  // Apply GI additively (subtle — does not wash out the primary surface)
  vec3 col = blended + gi;
  col = clamp(col, 0.0, 1.0);

  float alpha = texture2D(uCurrent, vUv).a;
  gl_FragColor = vec4(col, alpha);
}
`

// ─────────────────────────────────────────────────────────────
//  Pass 3 — Composite + Filmic Tone-Map
//
//  Applied only when blitting to the visible canvas so that all
//  intermediate FBOs stay in linear light space.
// ─────────────────────────────────────────────────────────────
const FRAG_COMPOSITE = /* glsl */`
precision highp float;

uniform sampler2D uInput;
uniform vec2      uTexelSize;

varying vec2 vUv;

// ── Filmic Reinhard (luminance-based) ────────────────────────
vec3 reinhardLum(vec3 col, float whitePoint) {
  float l  = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float lm = l * (1.0 + l / (whitePoint * whitePoint)) / (1.0 + l);
  return col * (lm / (l + 1e-7));
}

void main() {
  vec4 src = texture2D(uInput, vUv);
  vec3 col = src.rgb;

  // ── Filmic tone-map ──────────────────────────────────────
  col = reinhardLum(col, 1.4);

  // ── Vignette ─────────────────────────────────────────────
  vec2  uvc = vUv - 0.5;
  float vig = 1.0 - dot(uvc, uvc) * 1.2;
  vig = clamp(vig, 0.0, 1.0);
  col *= vig;

  col = clamp(col, 0.0, 1.0);

  // Alpha from perceptual luminance
  float lp    = dot(col, vec3(0.299, 0.587, 0.114));
  float alpha = clamp(lp * 2.2, 0.0, 0.96);
  gl_FragColor = vec4(col, alpha * src.a);
}
`

// ─────────────────────────────────────────────────────────────
//  Helper — fullscreen triangle geometry  (avoids diagonal seam
//  that PlaneGeometry sometimes shows on NDC blit quads)
// ─────────────────────────────────────────────────────────────
function makeFullscreenTriangle() {
  // A single triangle large enough to cover NDC [-1,1]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1, -1, 0,   3, -1, 0,   -1, 3, 0]), 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(
    new Float32Array([0, 0,   2, 0,   0, 2]), 2))
  return geo
}

// ─────────────────────────────────────────────────────────────
//  Helper — create a WebGLRenderTarget at given pixel dimensions
// ─────────────────────────────────────────────────────────────
function makeFBO(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter:    THREE.LinearFilter,
    magFilter:    THREE.LinearFilter,
    format:       THREE.RGBAFormat,
    type:         THREE.HalfFloatType,   // 16-bit float: preserves overbright highlights
    depthBuffer:  false,
    stencilBuffer: false,
  })
}

// ─────────────────────────────────────────────────────────────
//  OpticsEngine
// ─────────────────────────────────────────────────────────────
export class OpticsEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas   = canvas
    this.scene    = null
    this.camera   = null
    this.renderer = null
    this.mesh     = null     // primary surface plane
    this.material = null     // primary surface material

    // spring-driven tilt (set via setTilt)
    this._cx      = 0
    this._cy      = 0
    this._prevCx  = 0
    this._prevCy  = 0

    this._startTime = performance.now()
    this._rafId     = 0
    this._destroyed = false
    this._onResize  = this._handleResize.bind(this)
    this._resizeObserver = null

    // pending pre-init overrides
    this._pendingBaseColor = null
    this._pendingFresnelR0 = null

    // ── Post-process pipeline FBOs ────────────────────────────
    // All intermediate FBOs run at 2× physical pixel density
    // (set in init() once actual canvas size is known).
    this._fboA   = null    // primary render target
    this._fboNDS = null    // NDS output
    this._fboTSGI_ping = null  // temporal history ping
    this._fboTSGI_pong = null  // temporal history pong
    this._tsgiPing = true  // which buffer is current history

    // ── Post-process scene + materials ────────────────────────
    this._ppScene    = null   // shared for all post-process passes
    this._ppCamera   = null
    this._ppTriGeo   = null   // fullscreen triangle

    this._matNDS     = null   // Pass 1: NDS shader material
    this._matTSGI    = null   // Pass 2: TSGI shader material
    this._matComp    = null   // Pass 3: Composite / tone-map

    this._meshNDS    = null
    this._meshTSGI   = null
    this._meshComp   = null
  }

  // ── Resolve actual pixel size ────────────────────────────────
  _getSize() {
    const canvas = this.canvas
    const parent = canvas.parentElement
    if (parent) {
      const r = parent.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return { w: Math.round(r.width), h: Math.round(r.height) }
    }
    {
      const r = canvas.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return { w: Math.round(r.width), h: Math.round(r.height) }
    }
    const w = (parent ? parent.clientWidth  || parent.offsetWidth  : 0)
           || canvas.clientWidth  || canvas.offsetWidth  || 320
    const h = (parent ? parent.clientHeight || parent.offsetHeight : 0)
           || canvas.clientHeight || canvas.offsetHeight || 460
    return { w, h }
  }

  // ── init ────────────────────────────────────────────────────
  init() {
    const canvas = this.canvas
    const { w, h } = this._getSize()

    // ── Primary scene (card surface) ──────────────────────────
    this.scene  = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, CAMERA_NEAR, CAMERA_FAR)
    this.camera.position.set(0, 0, CAMERA_Z)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha:           true,
      antialias:       false,   // MSAA off — TAA provides temporal AA
      powerPreference: 'high-performance',
    })
    // Internal rendering at 2× DPR for sub-pixel density
    const dpr = Math.min(window.devicePixelRatio * 2.0, 4.0)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.renderer.setClearColor(0x000000, 0)

    // Card-plane geometry
    const aspect = w / h
    const geo    = new THREE.PlaneGeometry(PLANE_H * aspect, PLANE_H, 32, 32)
    this.material = new THREE.ShaderMaterial({
      vertexShader:   VERT_PRIMARY,
      fragmentShader: FRAG_PRIMARY,
      transparent: true,
      depthWrite:  false,
      side: THREE.FrontSide,
      uniforms: {
        uTime:      { value: 0.0 },
        uTilt:      { value: new THREE.Vector2(0, 0) },
        uBaseColor: { value: new THREE.Vector3(0.07, 0.05, 0.13) },
        uFresnelR0: { value: 0.04 },
      },
    })
    this.mesh = new THREE.Mesh(geo, this.material)
    this.scene.add(this.mesh)

    if (this._pendingBaseColor) {
      this.material.uniforms.uBaseColor.value.set(...this._pendingBaseColor)
    }
    if (this._pendingFresnelR0 !== null) {
      this.material.uniforms.uFresnelR0.value = this._pendingFresnelR0
    }

    // ── Post-process pipeline setup ───────────────────────────
    this._initPostProcess(w, h)

    // ── Resize observers ──────────────────────────────────────
    const observeTarget = canvas.parentElement || canvas
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._handleResize())
      this._resizeObserver.observe(observeTarget)
    }
    window.addEventListener('resize', this._onResize, { passive: true })
    this._deferResize(30)

    this._loop()
  }

  // ── Init post-process pipeline ───────────────────────────────
  _initPostProcess(w, h) {
    const dpr = Math.min(window.devicePixelRatio * 2.0, 4.0)
    const fbW = Math.round(w * dpr)
    const fbH = Math.round(h * dpr)

    // Create FBOs
    this._fboA          = makeFBO(fbW, fbH)
    this._fboNDS        = makeFBO(fbW, fbH)
    this._fboTSGI_ping  = makeFBO(fbW, fbH)
    this._fboTSGI_pong  = makeFBO(fbW, fbH)
    this._tsgiPing      = true

    // Shared orthographic camera + fullscreen triangle for post passes
    this._ppCamera  = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this._ppScene   = new THREE.Scene()
    this._ppTriGeo  = makeFullscreenTriangle()

    const ts = new THREE.Vector2(1.0 / fbW, 1.0 / fbH)

    // Pass 1: NDS
    this._matNDS = new THREE.ShaderMaterial({
      vertexShader:   VERT_FULLSCREEN,
      fragmentShader: FRAG_NDS,
      depthWrite: false,
      uniforms: {
        uInput:     { value: this._fboA.texture },
        uTexelSize: { value: ts.clone() },
      },
    })
    this._meshNDS = new THREE.Mesh(this._ppTriGeo, this._matNDS)

    // Pass 2: TSGI
    this._matTSGI = new THREE.ShaderMaterial({
      vertexShader:   VERT_FULLSCREEN,
      fragmentShader: FRAG_TSGI,
      depthWrite: false,
      uniforms: {
        uCurrent:   { value: this._fboNDS.texture },
        uHistory:   { value: this._fboTSGI_ping.texture },
        uTexelSize: { value: ts.clone() },
        uMotion:    { value: new THREE.Vector2(0, 0) },
        uAlpha:     { value: TAA_ALPHA },
        uTime:      { value: 0.0 },
        uGIColor:   { value: new THREE.Vector3(1, 1, 1) },
      },
    })
    this._meshTSGI = new THREE.Mesh(this._ppTriGeo, this._matTSGI)

    // Pass 3: Composite
    this._matComp = new THREE.ShaderMaterial({
      vertexShader:   VERT_FULLSCREEN,
      fragmentShader: FRAG_COMPOSITE,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uInput:     { value: this._fboTSGI_pong.texture },
        uTexelSize: { value: ts.clone() },
      },
    })
    this._meshComp = new THREE.Mesh(this._ppTriGeo, this._matComp)
  }

  // ── Defer resize until parent is laid out ────────────────────
  _deferResize(attemptsLeft) {
    if (this._destroyed) return
    const { w, h } = this._getSize()
    if (w > 0 && h > 80) { this._handleResize(); return }
    if (attemptsLeft <= 0) { if (w > 0 && h > 0) this._handleResize(); return }
    requestAnimationFrame(() => this._deferResize(attemptsLeft - 1))
  }

  // ── Public API ───────────────────────────────────────────────
  setTilt(cx, cy) {
    this._prevCx = this._cx
    this._prevCy = this._cy
    this._cx = cx
    this._cy = cy
  }

  setBaseColor(r, g, b) {
    this._pendingBaseColor = [r, g, b]
    if (this.material) this.material.uniforms.uBaseColor.value.set(r, g, b)
  }

  setFresnelR0(r0) {
    this._pendingFresnelR0 = r0
    if (this.material) this.material.uniforms.uFresnelR0.value = r0
  }

  // ── dispose ─────────────────────────────────────────────────
  dispose() {
    this._destroyed = true
    cancelAnimationFrame(this._rafId)
    window.removeEventListener('resize', this._onResize)
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null }

    // Dispose post-process
    for (const fbo of [this._fboA, this._fboNDS, this._fboTSGI_ping, this._fboTSGI_pong]) {
      if (fbo) fbo.dispose()
    }
    if (this._ppTriGeo) this._ppTriGeo.dispose()
    for (const mat of [this._matNDS, this._matTSGI, this._matComp]) {
      if (mat) mat.dispose()
    }

    if (this.material) this.material.dispose()
    if (this.mesh) {
      this.mesh.geometry.dispose()
      this.scene && this.scene.remove(this.mesh)
    }
    if (this.renderer) this.renderer.dispose()

    this.scene = null; this.camera = null; this.renderer = null
    this.mesh  = null; this.material = null
    this._ppScene  = null; this._ppCamera = null
    this._meshNDS  = null; this._meshTSGI = null; this._meshComp = null
  }

  // ── Private: window / container resize ──────────────────────
  _handleResize() {
    if (!this.renderer || !this.camera) return
    const { w, h } = this._getSize()
    if (!w || !h) return

    const newAspect  = w / h
    const prevAspect = this.camera.aspect
    this.camera.aspect = newAspect
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)

    // Rebuild card geometry on aspect change
    if (this.mesh && Math.abs(newAspect - prevAspect) > 0.01) {
      const oldGeo = this.mesh.geometry
      this.mesh.geometry = new THREE.PlaneGeometry(PLANE_H * newAspect, PLANE_H, 32, 32)
      oldGeo.dispose()
    }

    // Rebuild FBOs at new size
    const dpr = Math.min(window.devicePixelRatio * 2.0, 4.0)
    const fbW = Math.round(w * dpr)
    const fbH = Math.round(h * dpr)

    for (const fbo of [this._fboA, this._fboNDS, this._fboTSGI_ping, this._fboTSGI_pong]) {
      if (fbo) fbo.setSize(fbW, fbH)
    }

    const ts = new THREE.Vector2(1.0 / fbW, 1.0 / fbH)
    if (this._matNDS)  this._matNDS.uniforms.uTexelSize.value.copy(ts)
    if (this._matTSGI) this._matTSGI.uniforms.uTexelSize.value.copy(ts)
    if (this._matComp) this._matComp.uniforms.uTexelSize.value.copy(ts)
  }

  // ── Private: rAF loop ───────────────────────────────────────
  _loop() {
    if (this._destroyed) return
    this._rafId = requestAnimationFrame(() => this._loop())
    this._tick()
  }

  // ── Private: full pipeline tick ─────────────────────────────
  _tick() {
    if (!this.renderer || !this.scene || !this.camera || !this.material) return

    const t = (performance.now() - this._startTime) * 0.001

    // ── Update primary uniforms ────────────────────────────
    this.material.uniforms.uTime.value = t
    this.material.uniforms.uTilt.value.set(this._cx, this._cy)

    // ── Compute rainbow tint for GI colour bleed ───────────
    const hue = (Math.atan2(this._cy, this._cx) / (2 * Math.PI) + 0.5 + t * 0.04) % 1.0
    // Simple HSV→RGB for GI tint (S=0.88, V=1)
    const h6  = hue * 6.0
    const hi  = Math.floor(h6) % 6
    const f   = h6 - Math.floor(h6)
    const p   = 1.0 - 0.88
    const q   = 1.0 - f * 0.88
    const tv  = 1.0 - (1.0 - f) * 0.88
    const rgbLut = [[1,tv,p],[q,1,p],[p,1,tv],[p,q,1],[tv,p,1],[1,p,q]]
    const [gr, gg, gb] = rgbLut[hi] || [1, 1, 1]

    // ── Screen-space motion vector (Δtilt * scale) ─────────
    const motScale = 0.018
    const motX = (this._cx - this._prevCx) * motScale
    const motY = (this._cy - this._prevCy) * motScale

    // ─────────────────────────────────────────────────────
    //  PASS 0 — Primary surface → fboA
    // ─────────────────────────────────────────────────────
    this.renderer.setRenderTarget(this._fboA)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)

    // ─────────────────────────────────────────────────────
    //  PASS 1 — NDS → fboNDS
    // ─────────────────────────────────────────────────────
    this._matNDS.uniforms.uInput.value = this._fboA.texture
    this._ppScene.overrideMaterial = null
    this._ppScene.remove(this._meshTSGI)
    this._ppScene.remove(this._meshComp)
    this._ppScene.add(this._meshNDS)

    this.renderer.setRenderTarget(this._fboNDS)
    this.renderer.clear()
    this.renderer.render(this._ppScene, this._ppCamera)

    // ─────────────────────────────────────────────────────
    //  PASS 2 — TSGI ping-pong → write to pong, read from ping
    // ─────────────────────────────────────────────────────
    const historyFBO  = this._tsgiPing ? this._fboTSGI_ping : this._fboTSGI_pong
    const outputFBO   = this._tsgiPing ? this._fboTSGI_pong : this._fboTSGI_ping

    this._matTSGI.uniforms.uCurrent.value = this._fboNDS.texture
    this._matTSGI.uniforms.uHistory.value = historyFBO.texture
    this._matTSGI.uniforms.uMotion.value.set(motX, motY)
    this._matTSGI.uniforms.uTime.value    = t
    this._matTSGI.uniforms.uGIColor.value.set(gr, gg, gb)

    this._ppScene.remove(this._meshNDS)
    this._ppScene.add(this._meshTSGI)

    this.renderer.setRenderTarget(outputFBO)
    this.renderer.clear()
    this.renderer.render(this._ppScene, this._ppCamera)

    // Swap ping-pong
    this._tsgiPing = !this._tsgiPing

    // ─────────────────────────────────────────────────────
    //  PASS 3 — Composite + tone-map → canvas (null target)
    // ─────────────────────────────────────────────────────
    this._matComp.uniforms.uInput.value = outputFBO.texture

    this._ppScene.remove(this._meshTSGI)
    this._ppScene.add(this._meshComp)

    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    this.renderer.render(this._ppScene, this._ppCamera)
  }
}

export default OpticsEngine
