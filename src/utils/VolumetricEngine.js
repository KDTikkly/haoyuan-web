/**
 * VolumetricEngine.js — Volumetric Optics Engine Skeleton  (v8.9)
 *
 * Responsibilities:
 *   1. Bootstrap a WebGL2 renderer + scene + camera inside a host container.
 *   2. Run a strict FPS watchdog: if fps < 30 for 3 continuous seconds → fallback().
 *   3. fallback() destroys the WebGL context and injects a 3px-border yellow DOM block.
 *   4. Public API: mount() / destroy()
 *
 * Sub-classes extend this base by overriding _buildScene() and _tick().
 */

import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
//  Shader stubs  (Fragment will be replaced in Task 2B)
// ─────────────────────────────────────────────────────────────

/** Full-screen quad vertex shader — passes uv to fragment. */
const VERT_QUAD = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * Fragment shader — Volumetric fog + crystal dispersion via Ray Marching.
 *
 * Pipeline overview
 * ─────────────────
 *  1. Build a camera ray from the full-screen quad UV.
 *  2. Intersect the ray with a bounding sphere (radius R_BOUND) to get
 *     the ray-march interval [tEnter, tExit].  Rays missing the sphere
 *     just output the background colour.
 *  3. Inside the interval, march in MAX_STEPS steps.  At every sample:
 *       a. Compute fog density from a turbulent FBM field (uFogDensity).
 *       b. Accumulate in-scattering from a moving point-light using the
 *          Henyey-Greenstein phase function.
 *       c. Apply Beer-Lambert transmittance (absorption).
 *  4. Crystal SDF (smooth-union of two offset spheres):
 *       – When a sample is *inside* the crystal, the step direction is
 *         perturbed by the SDF gradient, creating a refraction effect.
 *       – RGB channels are offset by uDispersion (chromatic aberration).
 *  5. The light source direction slow-rotates over time to show the
 *     Tyndall "light column" from different angles.
 */
const FRAG_STUB = /* glsl */`
precision highp float;

// ── Uniforms ────────────────────────────────────────────────────
uniform float uTime;
uniform vec2  uResolution;
uniform float uLightIntensity;   // default 1.0
uniform float uFogDensity;       // default 0.35
uniform vec3  uFogColor;         // default (0.4, 0.6, 1.0)
uniform float uDispersion;       // default 0.18  — chromatic shift

varying vec2 vUv;

// ── Constants ───────────────────────────────────────────────────
#define MAX_STEPS   64
#define R_BOUND     1.4    // bounding sphere radius
#define STEP_SCALE  0.85   // march step = (interval / MAX_STEPS) * STEP_SCALE
#define ABSORB      0.55   // Beer-Lambert absorption coefficient
#define PHASE_G     0.55   // Henyey-Greenstein asymmetry (forward scatter)

// ── Noise helpers ───────────────────────────────────────────────
// Classic value noise (2-D hash lifted to 3-D)
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);   // smoothstep
  return mix(
    mix(mix(hash(i),             hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

// 4-octave FBM
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p  = p * 2.1 + vec3(1.3, 2.7, 0.9);
    a *= 0.5;
  }
  return v;
}

// ── SDF: crystal (smooth-union of two offset spheres) ───────────
float sdfCrystal(vec3 p) {
  float a = length(p - vec3( 0.18, 0.10, 0.0)) - 0.38;
  float b = length(p - vec3(-0.15,-0.12, 0.0)) - 0.28;
  // Smooth-min (polynomial blend, k=0.25)
  float k = 0.25;
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// ── SDF gradient (finite difference normal) ─────────────────────
vec3 sdfNormal(vec3 p) {
  float e = 0.004;
  return normalize(vec3(
    sdfCrystal(p + vec3(e,0,0)) - sdfCrystal(p - vec3(e,0,0)),
    sdfCrystal(p + vec3(0,e,0)) - sdfCrystal(p - vec3(0,e,0)),
    sdfCrystal(p + vec3(0,0,e)) - sdfCrystal(p - vec3(0,0,e))
  ));
}

// ── Henyey-Greenstein phase ──────────────────────────────────────
float hg(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * 3.14159265 * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// ── Ray-sphere intersection ──────────────────────────────────────
// Returns vec2(tEnter, tExit); tEnter > tExit means miss.
vec2 raySphere(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float d = b * b - c;
  if (d < 0.0) return vec2(1.0, -1.0);
  float sq = sqrt(d);
  return vec2(-b - sq, -b + sq);
}

// ── Main ─────────────────────────────────────────────────────────
void main() {
  // Aspect-correct NDC
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  // Camera — fixed orthographic-style ray for the full-screen quad
  // (matches the PlaneGeometry NDC setup in VolumetricEngine)
  vec3 ro = vec3(0.0, 0.0, 2.8);
  vec3 rd = normalize(vec3(uv, -2.0));

  // Moving point-light (slow orbit)
  float lAngle = uTime * 0.3;
  vec3  lightPos = vec3(cos(lAngle) * 1.2, 0.8, sin(lAngle) * 1.2);

  // Background: deep space gradient
  vec3 bg = mix(vec3(0.0), vec3(0.03, 0.04, 0.07), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));

  // Bounding-sphere cull
  vec2 tBound = raySphere(ro, rd, R_BOUND);
  if (tBound.x > tBound.y) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }
  float tMin = max(tBound.x, 0.0);
  float tMax = tBound.y;

  float stepSize = (tMax - tMin) / float(MAX_STEPS) * STEP_SCALE;

  // ── Separate march per channel for dispersion ──────────────────
  // We sample density at a slightly offset position for R vs B.
  // G channel is the "reference" ray; R bends one way, B the other.
  float dispR =  uDispersion * 0.012;
  float dispB = -uDispersion * 0.012;
  vec3  rdR   = normalize(rd + vec3(dispR, 0.0, 0.0));
  vec3  rdB   = normalize(rd + vec3(dispB, 0.0, 0.0));

  // Accumulated in-scatter colour (per channel) and transmittance
  float scatterR = 0.0, scatterG = 0.0, scatterB = 0.0;
  float transR   = 1.0,  transG   = 1.0,  transB   = 1.0;

  float t = tMin;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (t > tMax) break;

    // World-space sample positions (per channel)
    vec3 posG = ro + rd  * t;
    vec3 posR = ro + rdR * t;
    vec3 posB = ro + rdB * t;

    // ── Crystal refraction: bend ray inside crystal ──────────────
    float sdfG = sdfCrystal(posG);
    if (sdfG < 0.0) {
      // Inside crystal — deflect sample positions along surface normal
      vec3 n = sdfNormal(posG);
      float ior = 0.15 + uDispersion * 0.05;
      posG += n * ior * stepSize;
      posR += n * (ior + dispR) * stepSize;
      posB += n * (ior + dispB) * stepSize;
    }

    // ── Fog density (turbulent FBM) ──────────────────────────────
    float baseD  = uFogDensity;
    float turbG  = fbm(posG * 2.3 + uTime * 0.07) * baseD * 1.6;
    float turbR  = fbm(posR * 2.3 + uTime * 0.07) * baseD * 1.6;
    float turbB  = fbm(posB * 2.3 + uTime * 0.07) * baseD * 1.6;

    // Density falloff from centre (keep volume roughly spherical)
    float falloffG = clamp(1.0 - length(posG) / R_BOUND, 0.0, 1.0);
    float densG    = turbG * falloffG;
    float densR    = turbR * clamp(1.0 - length(posR) / R_BOUND, 0.0, 1.0);
    float densB    = turbB * clamp(1.0 - length(posB) / R_BOUND, 0.0, 1.0);

    // ── Light in-scattering ──────────────────────────────────────
    vec3  toLight   = normalize(lightPos - posG);
    float cosTheta  = dot(rd, toLight);
    float phase     = hg(cosTheta, PHASE_G);

    // Shadow march toward light (4 steps only — cheap approximation)
    float shadowT   = 0.0;
    for (int s = 0; s < 4; s++) {
      shadowT += 0.12;
      vec3 sp = posG + toLight * shadowT;
      shadowT += fbm(sp * 2.3 + uTime * 0.07) * baseD * 0.12;
    }
    float shadow = exp(-shadowT * ABSORB);

    float lightEnergy = uLightIntensity * phase * shadow * stepSize;

    // Tyndall colour tint: light column uses a warm-to-cool gradient
    float tyndallTint = clamp(cosTheta * 0.5 + 0.5, 0.0, 1.0);
    vec3  tyndall     = mix(vec3(1.0, 0.82, 0.55), vec3(0.55, 0.78, 1.0), tyndallTint);

    scatterR += transR * uFogColor.r * tyndall.r * densR * lightEnergy;
    scatterG += transG * uFogColor.g * tyndall.g * densG * lightEnergy;
    scatterB += transB * uFogColor.b * tyndall.b * densB * lightEnergy;

    // Beer-Lambert transmittance update
    transR *= exp(-densR * ABSORB * stepSize);
    transG *= exp(-densG * ABSORB * stepSize);
    transB *= exp(-densB * ABSORB * stepSize);

    // Early-exit: fully opaque
    if (max(transR, max(transG, transB)) < 0.004) break;

    t += stepSize;
  }

  // ── Composite over background ────────────────────────────────
  vec3 colour = bg * vec3(transR, transG, transB)
              + vec3(scatterR, scatterG, scatterB);

  // Subtle crystal surface highlight
  vec3  crystalHit = ro + rd * (tMin + stepSize);
  float sdfH       = sdfCrystal(crystalHit);
  if (sdfH < 0.06) {
    vec3  nH    = sdfNormal(crystalHit);
    float rim   = pow(clamp(1.0 - dot(-rd, nH), 0.0, 1.0), 3.0);
    colour     += vec3(0.9, 0.95, 1.0) * rim * uLightIntensity * 0.45;
  }

  // Vignette
  float vig = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 1.4;
  colour    *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
}
`

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
const FPS_THRESHOLD      = 30      // fps below this triggers the watchdog
const FPS_WATCHDOG_MS    = 3000    // consecutive ms under threshold before fallback
const FALLBACK_BG        = '#ffe600'
const FALLBACK_BORDER    = '3px solid #000'
const FALLBACK_SHADOW    = '4px 4px 0 #000'

// ─────────────────────────────────────────────────────────────
//  VolumetricEngine  (base class)
// ─────────────────────────────────────────────────────────────
export class VolumetricEngine {
  /**
   * @param {HTMLElement} container  — DOM node to mount into
   * @param {object}      [opts]     — optional override parameters
   * @param {number}      [opts.fov=60]
   * @param {number}      [opts.near=0.1]
   * @param {number}      [opts.far=200]
   */
  constructor(container, opts = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('[VolumetricEngine] container must be a valid HTMLElement')
    }

    this.container = container

    // Three.js objects (populated in mount())
    this.renderer = null
    this.scene    = null
    this.camera   = null
    this._canvas  = null

    // Camera config
    this._fov  = opts.fov  ?? 60
    this._near = opts.near ?? 0.1
    this._far  = opts.far  ?? 200

    // rAF handle
    this._rafId     = 0
    this._destroyed = false

    // ── Time tracking ───────────────────────────────────────
    // Use an accumulated elapsed counter (seconds) so that tab-switching
    // / page-hide doesn't cause a sudden time jump in the shader.
    this._lastFrameTime = 0     // performance.now() of previous frame
    this._elapsedSec    = 0     // total elapsed seconds fed to uTime

    // ── FPS watchdog state ──────────────────────────────────
    this._underThresholdSince = 0     // timestamp when fps first dropped below FPS_THRESHOLD (0 = not active)
    this._fpsWatchdogActive  = true   // set false after fallback fires

    // ResizeObserver
    this._resizeObserver = null
    this._onResize = this._handleResize.bind(this)
  }

  // ══════════════════════════════════════════════════════════
  //  Public API
  // ══════════════════════════════════════════════════════════

  /**
   * mount() — initialise WebGL2 renderer, scene, camera, then start the loop.
   * Safe to call only once; subsequent calls are no-ops.
   */
  mount() {
    if (this._destroyed || this.renderer) return

    const { w, h } = this._getSize()

    // ── Canvas ─────────────────────────────────────────────
    this._canvas = document.createElement('canvas')
    Object.assign(this._canvas.style, {
      position:      'absolute',
      inset:         '0',
      width:         '100%',
      height:        '100%',
      pointerEvents: 'none',
      display:       'block',
    })

    // Ensure container can host absolutely-positioned children
    const cs = getComputedStyle(this.container)
    if (cs.position === 'static') this.container.style.position = 'relative'

    this.container.appendChild(this._canvas)

    // ── Renderer (WebGL2 required) ─────────────────────────
    const gl2 = this._canvas.getContext('webgl2')
    if (!gl2) {
      console.warn('[VolumetricEngine] WebGL2 unavailable — triggering fallback immediately')
      this.fallback()
      return
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas:          this._canvas,
      context:         gl2,
      alpha:           true,
      antialias:       true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)
    this.renderer.setClearColor(0x000000, 0)

    // ── Scene ──────────────────────────────────────────────
    this.scene = new THREE.Scene()

    // ── Camera ─────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(this._fov, w / h, this._near, this._far)
    this.camera.position.set(0, 0, 5)

    // ── ResizeObserver ─────────────────────────────────────
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._handleResize())
      this._resizeObserver.observe(this.container)
    }
    window.addEventListener('resize', this._onResize, { passive: true })

    // ── Sub-class scene construction ───────────────────────
    this._buildScene()

    // ── Start loop ─────────────────────────────────────────
    this._lastFrameTime = performance.now()
    this._elapsedSec    = 0
    this._loop()
  }

  /**
   * destroy() — stop the loop, release all GPU resources, remove the canvas.
   */
  destroy() {
    this._destroyed = true
    this._stopLoop()
    this._teardownGL()
    this._removeCanvas()
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
      this._resizeObserver = null
    }
    window.removeEventListener('resize', this._onResize)
  }

  // ══════════════════════════════════════════════════════════
  //  Public: material API
  // ══════════════════════════════════════════════════════════

  /**
   * initOpticalMaterial()
   * Creates the ShaderMaterial with all uniform channels wired up,
   * wraps it on a full-screen quad, and adds it to the scene.
   * Safe to call multiple times — re-entrant calls are ignored.
   */
  initOpticalMaterial() {
    if (this._quadMesh) return   // already initialised

    const { w, h } = this._getSize()

    // ── Uniforms communication pipeline ────────────────────
    this._uniforms = {
      uTime:           { value: 0.0 },
      uResolution:     { value: new THREE.Vector2(w, h) },
      uLightIntensity: { value: 1.0 },
      uFogDensity:     { value: 0.35 },
      uFogColor:       { value: new THREE.Color(0.4, 0.6, 1.0) },
      uDispersion:     { value: 0.18 },
    }

    // ── ShaderMaterial ─────────────────────────────────────
    this._quadMaterial = new THREE.ShaderMaterial({
      vertexShader:   VERT_QUAD,
      fragmentShader: FRAG_STUB,
      uniforms:       this._uniforms,
      transparent:    true,
      depthWrite:     false,
      depthTest:      false,
    })

    // ── Full-screen quad (-1..1 NDC, no camera transform) ──
    // PlaneGeometry in NDC coords: position.z = 0, gl_Position = vec4(pos.xy,0,1)
    const geo = new THREE.PlaneGeometry(2, 2)
    this._quadMesh = new THREE.Mesh(geo, this._quadMaterial)
    this._quadMesh.frustumCulled = false   // always render, no camera clip
    this.scene.add(this._quadMesh)
  }

  /**
   * updateParameters(params)
   * Dynamically push new values into the uniform pipeline.
   *
   * @param {object} params
   * @param {number} [params.lightIntensity]
   * @param {number} [params.fogDensity]
   * @param {number|string|THREE.Color} [params.fogColor]
   * @param {number} [params.dispersion]
   */
  updateParameters(params = {}) {
    if (!this._uniforms) return   // material not yet initialised

    if (params.lightIntensity !== undefined)
      this._uniforms.uLightIntensity.value = params.lightIntensity

    if (params.fogDensity !== undefined)
      this._uniforms.uFogDensity.value = params.fogDensity

    if (params.fogColor !== undefined) {
      if (params.fogColor instanceof THREE.Color) {
        this._uniforms.uFogColor.value.copy(params.fogColor)
      } else {
        this._uniforms.uFogColor.value.set(params.fogColor)
      }
    }

    if (params.dispersion !== undefined)
      this._uniforms.uDispersion.value = params.dispersion
  }

  // ══════════════════════════════════════════════════════════
  //  Protected hooks  (override in sub-classes)
  // ══════════════════════════════════════════════════════════

  /**
   * Default _buildScene: initialise the optical material and quad.
   * Sub-classes can call super._buildScene() then add extra meshes.
   */
  _buildScene() {
    this.initOpticalMaterial()
  }

  /**
   * Default _tick: keep uTime and uResolution in sync each frame.
   * Sub-classes call super._tick(t, dt) then update their own uniforms.
   * @param {number} t   — elapsed seconds
   * @param {number} _dt — delta seconds (unused in base)
   */
  _tick(t, _dt) {
    if (!this._uniforms) return
    this._uniforms.uTime.value = t

    // Keep resolution uniform in sync with any resize
    if (this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2())
      this._uniforms.uResolution.value.copy(size)
    }
  }

  // ══════════════════════════════════════════════════════════
  //  FPS Watchdog
  // ══════════════════════════════════════════════════════════

  /**
   * Called every frame. Returns true if the watchdog fired (caller should stop).
   * @param {number} now  — performance.now() of current frame
   * @returns {boolean}
   */
  _checkFps(now) {
    if (!this._fpsWatchdogActive) return false

    const dt  = now - this._lastFrameTime           // ms since last frame
    const fps = dt > 0 ? 1000 / dt : 999

    if (fps < FPS_THRESHOLD) {
      if (this._underThresholdSince === 0) {
        // Start the under-threshold timer
        this._underThresholdSince = now
      } else if (now - this._underThresholdSince >= FPS_WATCHDOG_MS) {
        // 3 continuous seconds under threshold — trigger fallback
        console.warn(
          `[VolumetricEngine] FPS (${fps.toFixed(1)}) below ${FPS_THRESHOLD} `
          + `for ${FPS_WATCHDOG_MS}ms — triggering fallback`
        )
        this._fpsWatchdogActive = false
        this.fallback()
        return true
      }
    } else {
      // fps recovered — reset the under-threshold timer
      this._underThresholdSince = 0
    }

    return false
  }

  /**
   * fallback() — destroy WebGL context and inject a 3px-border Memphis yellow DOM block.
   * Safe to call from both the FPS watchdog and external code.
   */
  fallback() {
    this._fpsWatchdogActive = false
    this._stopLoop()
    this._teardownGL()
    this._removeCanvas()

    // Inject degraded DOM block (Memphis / Brutalist style)
    const block = document.createElement('div')
    Object.assign(block.style, {
      position:   'absolute',
      inset:      '0',
      background: FALLBACK_BG,
      border:     FALLBACK_BORDER,
      boxShadow:  FALLBACK_SHADOW,
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize:   '11px',
      fontWeight: '700',
      color:      '#000',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      userSelect: 'none',
      zIndex:     '1',
    })
    block.setAttribute('aria-hidden', 'true')
    block.dataset.volumetricFallback = 'true'
    block.textContent = '[ GPU FALLBACK ]'

    const cs = getComputedStyle(this.container)
    if (cs.position === 'static') this.container.style.position = 'relative'
    this.container.appendChild(block)
  }

  // ══════════════════════════════════════════════════════════
  //  Private helpers
  // ══════════════════════════════════════════════════════════

  _loop() {
    if (this._destroyed) return
    this._rafId = requestAnimationFrame((now) => {
      if (this._destroyed) return

      // FPS watchdog — bail out immediately if fallback was triggered
      if (this._checkFps(now)) return

      // Delta time (clamped to 100 ms max to absorb tab-switch jumps)
      const dtMs = Math.min(now - this._lastFrameTime, 100)
      this._lastFrameTime  = now
      this._elapsedSec    += dtMs * 0.001   // accumulate; never resets on hide

      // Sub-class per-frame logic (receives stable elapsed + delta in seconds)
      this._tick(this._elapsedSec, dtMs * 0.001)

      // Render
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }

      this._loop()
    })
  }

  _stopLoop() {
    cancelAnimationFrame(this._rafId)
    this._rafId = 0
  }

  _teardownGL() {
    if (this._quadMesh) {
      this._quadMesh.geometry.dispose()
      this.scene && this.scene.remove(this._quadMesh)
      this._quadMesh = null
    }
    if (this._quadMaterial) {
      this._quadMaterial.dispose()
      this._quadMaterial = null
    }
    this._uniforms = null

    if (this.renderer) {
      this.renderer.dispose()
      // Force-lose the WebGL context so the GPU slot is freed immediately
      const ext = this.renderer.getContext().getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
      this.renderer = null
    }
    this.scene  = null
    this.camera = null
  }

  _removeCanvas() {
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas)
    }
    this._canvas = null
  }

  /** Read container's rendered pixel size via getBoundingClientRect(). */
  _getSize() {
    const r = this.container.getBoundingClientRect()
    const w = Math.round(r.width)  || this.container.clientWidth  || 320
    const h = Math.round(r.height) || this.container.clientHeight || 240
    return { w, h }
  }

  _handleResize() {
    if (!this.renderer || !this.camera || this._destroyed) return
    const { w, h } = this._getSize()
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }
}

export default VolumetricEngine
