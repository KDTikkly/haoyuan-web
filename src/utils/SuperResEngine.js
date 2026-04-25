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
    if (this._testCube) {
      this._testCube.geometry.dispose()
      this._testCube.material.dispose()
      this._testCube = null
    }
    this.lowResScene   = null
    this.highResScene  = null
    this.lowResCamera  = null
    this.highResCamera = null
    super.destroy()
  }
}

export default SuperResEngine
