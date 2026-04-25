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
//  High-dimensional crystal shaders  (Rail A — lowResScene)
//
//  Fragment shader implements:
//    1. RGB Split chromatic dispersion — based on view-normal angle (Fresnel)
//    2. Internal refraction / reflection simulation via view-space ray bending
//    3. Thin-film interference bands (iridescence)
//    4. Intentionally aliased at 0.5× for super-res prep
// ─────────────────────────────────────────────────────────────

const VERT_CRYSTAL = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;

uniform float uTime;

// Vertex displacement: pulsating high-dimensional perturbation
void main() {
  vec3 pos = position;

  // High-frequency multi-axis vertex noise — makes the icosahedron "breathe"
  float disp  = sin(pos.x * 4.2 + uTime * 1.3)
              * cos(pos.y * 3.7 + uTime * 0.9)
              * sin(pos.z * 5.1 + uTime * 1.7);
  disp += sin(pos.x * 7.8 + uTime * 2.1) * cos(pos.z * 6.3 + uTime * 1.4) * 0.4;
  pos += normal * disp * 0.07;

  vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
  vWorldPos  = worldPos4.xyz;
  vNormal    = normalize(normalMatrix * normal);
  vViewDir   = normalize(cameraPosition - worldPos4.xyz);
  vUv        = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const FRAG_CRYSTAL = /* glsl */`
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec2 vUv;

uniform float uTime;
uniform vec3  uBaseColor;   // tint applied to the crystal core
uniform float uDispersion;  // RGB split spread (0.01 – 0.12 recommended)
uniform float uIOR;         // index of refraction (1.1 – 2.4)

// ── Utility ────────────────────────────────────────────────────
float fresnel(vec3 viewDir, vec3 normal, float r0) {
  float cosTheta = clamp(dot(viewDir, normal), 0.0, 1.0);
  return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

// Pseudo-random hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2-D value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),           hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

// ── RGB Split chromatic dispersion ─────────────────────────────
// Each channel refracts at a slightly different IOR offset,
// producing visible colour fringing on edges (high-Fresnel regions).
vec3 rgbSplit(vec3 N, vec3 V, float spread) {
  // Perturb refraction vector per channel
  vec3 refR = refract(-V, N, 1.0 / (uIOR - spread));
  vec3 refG = refract(-V, N, 1.0 / uIOR);
  vec3 refB = refract(-V, N, 1.0 / (uIOR + spread));

  // Map refraction direction to a colour contribution
  // (simulated environment — procedural gradient sky)
  float r = 0.5 + 0.5 * dot(refR, vec3(0.0, 1.0, 0.0));
  float g = 0.5 + 0.5 * dot(refG, vec3(0.3, 0.8, 0.5));
  float b = 0.5 + 0.5 * dot(refB, vec3(-0.2, 0.6, 0.9));

  return vec3(r, g, b);
}

// ── Thin-film iridescence ───────────────────────────────────────
vec3 thinFilm(float cosTheta, float thickness) {
  float phi = 2.0 * 3.14159265 * thickness * cosTheta;
  return 0.5 + 0.5 * vec3(
    cos(phi * 1.0),
    cos(phi * 1.7 + 1.0),
    cos(phi * 2.8 + 2.1)
  );
}

void main() {
  vec3  N      = normalize(vNormal);
  vec3  V      = normalize(vViewDir);
  float cosNV  = clamp(dot(N, V), 0.0, 1.0);

  // ── Fresnel rim ──────────────────────────────────────────────
  float rim = fresnel(V, N, 0.04);
  // Boost rim with a power curve → sharper edge glow
  float rimSharp = pow(rim, 2.5);

  // ── RGB Split dispersion ─────────────────────────────────────
  vec3  dispColor = rgbSplit(N, V, uDispersion * rim);

  // ── Internal refraction noise (simulates subsurface scattering)─
  // Use bent normal + time-driven noise for a "liquid crystal" look
  vec2  noiseUv   = vWorldPos.xy * 3.0 + uTime * 0.08;
  float noiseval  = noise(noiseUv) * 0.6 + noise(noiseUv * 2.3 + 1.7) * 0.3;
  vec3  bentN     = normalize(N + vec3(noiseval - 0.3, noiseval * 0.5, 0.0) * 0.25);
  float innerRef  = 0.5 + 0.5 * dot(refract(-V, bentN, 1.0 / uIOR), vec3(0.1, 0.8, 0.4));

  // ── Thin-film iridescence ────────────────────────────────────
  float filmThick = 0.6 + 0.4 * noiseval;
  vec3  iridColor = thinFilm(cosNV, filmThick);

  // ── Specular highlight (Blinn-Phong, no lights — fake sun dir)─
  vec3  sunDir    = normalize(vec3(1.0, 1.5, 2.0));
  vec3  halfVec   = normalize(V + sunDir);
  float spec      = pow(max(dot(N, halfVec), 0.0), 128.0) * 2.0;

  // ── Compose ──────────────────────────────────────────────────
  vec3 core = uBaseColor * innerRef;
  vec3 col  = mix(core, dispColor, rimSharp * 0.75);       // dispersion on edges
  col      += iridColor * 0.20;                            // thin-film sheen
  col      += vec3(spec) * vec3(0.9, 0.95, 1.0);          // cool specular
  col      += rimSharp * vec3(0.6, 0.85, 1.0) * 1.1;      // electric rim glow

  // ── Opacity: semi-transparent core, opaque rim ───────────────
  float alpha = 0.45 + rimSharp * 0.50;

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

    // ── High-dimensional crystal: IcosahedronGeometry + ShaderMaterial ──
    // detail=4 → 320 triangles; high enough to show facet lighting,
    // low enough to produce visible aliasing at 0.5× (intentional for SR prep).
    const crystalGeo = new THREE.IcosahedronGeometry(1.2, 4)
    this._crystalMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_CRYSTAL,
      fragmentShader: FRAG_CRYSTAL,
      uniforms: {
        uTime:       { value: 0.0 },
        uBaseColor:  { value: new THREE.Vector3(0.05, 0.15, 0.35) },  // deep blue core
        uDispersion: { value: 0.06 },   // RGB split spread (edge colour fringing)
        uIOR:        { value: 1.52 },   // glass-like index of refraction
      },
      transparent:   true,
      side:          THREE.DoubleSide,
      depthWrite:    false,
    })
    this._testCube = new THREE.Mesh(crystalGeo, this._crystalMat)
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

    // Drive crystal animation
    if (_testCube) {
      _testCube.rotation.x += 0.003
      _testCube.rotation.y += 0.007
      _testCube.rotation.z += 0.002
    }
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
