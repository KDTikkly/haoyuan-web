/**
 * OpticsEngine.js — HSR-grade Physical Optics Renderer  (Three.js / WebGL)
 * Implements:
 *   1. Fresnel reflectance  R = R0 + (1-R0)(1-cosθ)^5   (Schlick)
 *   2. Chromatic dispersion — R/G/B channel UV-offset by refractive index
 *   3. Correlated specular glare band — tracks virtual light from tilt
 *   4. Spring-physics tilt drive via setTilt(cx, cy)
 *   5. Auto-resize + full dispose
 */
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
//  Scene constants
// ─────────────────────────────────────────────────────────────
const CAMERA_FOV  = 45
const CAMERA_NEAR = 0.1
const CAMERA_FAR  = 100
const CAMERA_Z    = 3.2

// ─────────────────────────────────────────────────────────────
//  GLSL Vertex Shader
// ─────────────────────────────────────────────────────────────
const VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vNormal  = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// ─────────────────────────────────────────────────────────────
//  GLSL Fragment Shader
//  Physical optics:
//    - Schlick Fresnel:   R = R0 + (1-R0)(1-NdotV)^5
//    - Chromatic disp:    Δuv_channel = tiltMag * n_channel_offset * tiltDir
//    - Specular glare:    Blinn-Phong H = normalize(V + L), shininess 64
//    - Rainbow shimmer:   HSV from atan2(tilt) + foil microstructure sine
// ─────────────────────────────────────────────────────────────
const FRAG = `
precision highp float;

uniform float uTime;
uniform vec2  uTilt;        // cx,cy  normalised -1..1
uniform vec3  uBaseColor;   // card surface tint (linear RGB)
uniform float uFresnelR0;   // F0 Schlick: 0.04 dielectric / 0.9 metallic

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewDir;

// ── Schlick Fresnel ──────────────────────────────────────────
float schlick(float cosTheta, float r0) {
  float c = 1.0 - cosTheta;
  return r0 + (1.0 - r0) * (c*c*c*c*c);
}

// ── HSV → RGB for rainbow shimmer ───────────────────────────
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // 1. Surface geometry
  vec3 N     = normalize(vNormal);
  vec3 V     = normalize(vViewDir);
  float NdotV = max(dot(N, V), 0.0);

  // 2. Fresnel reflectance  R = R0 + (1-R0)(1-cosθ)^5
  float fresnel = schlick(NdotV, uFresnelR0);

  // 3. Virtual light direction from tilt (hemisphere projection)
  //    Offset light slightly off-axis at rest so spec is 0 when tilt=0
  vec3 L = normalize(vec3(uTilt.x * 1.4 + 0.001, -uTilt.y * 1.4 + 0.001, 1.2));
  vec3 H = normalize(V + L);

  // 4. Blinn-Phong specular glare band
  //    Multiply by smoothstep so spec fades to 0 when there is no tilt,
  //    preventing the full-white wash at rest position.
  float tiltFactor = smoothstep(0.0, 0.18, length(uTilt));
  float spec = pow(max(dot(N, H), 0.0), 64.0) * tiltFactor;

  // 5. Chromatic dispersion
  //    Crown glass approximate refractive indices:
  //    n_R ≈ 1.520, n_G ≈ 1.540, n_B ≈ 1.570
  //    Δuv ∝ (n - 1) / n  × tiltMag (simplified Snell offset on plane)
  float tiltMag = length(uTilt);
  vec2  tiltDir = (tiltMag > 0.001) ? normalize(uTilt) : vec2(0.0);
  vec2  uvR = vUv + tiltDir * (tiltMag * 0.016);   // n_R offset
  vec2  uvG = vUv + tiltDir * (tiltMag * 0.026);   // n_G offset
  vec2  uvB = vUv + tiltDir * (tiltMag * 0.040);   // n_B offset

  // 6. Foil microstructure — sine-based shimmer per channel
  float shimR = 0.5 + 0.5 * sin(uvR.x * 14.0 + uvR.y *  9.0 + uTime * 0.80);
  float shimG = 0.5 + 0.5 * sin(uvG.x * 12.0 + uvG.y * 11.0 + uTime * 0.90 + 2.094);
  float shimB = 0.5 + 0.5 * sin(uvB.x * 10.0 + uvB.y * 13.0 + uTime * 1.10 + 4.189);
  vec3  foil  = vec3(shimR, shimG, shimB);

  // 7. Rainbow hue rotates with tilt angle + time
  float hue     = atan(uTilt.y, uTilt.x) / 6.2832 + 0.5 + uTime * 0.04;
  vec3  rainbow = hsv2rgb(vec3(hue, 0.88, 1.0));

  // 8. Compose: base + shimmer×fresnel + specular + rim
  vec3 col = uBaseColor
           + foil    * rainbow * fresnel * 0.80
           + vec3(1) * spec             * 0.95
           + rainbow * fresnel          * 0.30
           + vec3(fresnel * 0.20);       // edge rim

  col = clamp(col, 0.0, 1.0);
  float alpha = 0.88 + fresnel * 0.12;
  gl_FragColor = vec4(col, alpha);
}
`

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
    this.mesh     = null
    this.material = null

    // spring-driven tilt (set via setTilt)
    this._cx = 0
    this._cy = 0
    this._startTime = performance.now()

    this._rafId     = 0
    this._destroyed = false
    this._onResize  = this._handleResize.bind(this)

    // pending pre-init overrides
    this._pendingBaseColor = null   // [r, g, b]
    this._pendingFresnelR0 = null   // number
  }

  // ── init ────────────────────────────────────────────────────
  init() {
    const canvas = this.canvas
    const w = canvas.clientWidth  || canvas.offsetWidth  || 320
    const h = canvas.clientHeight || canvas.offsetHeight || 460

    // Scene
    this.scene = new THREE.Scene()

    // Camera — perspective, z-back
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, CAMERA_NEAR, CAMERA_FAR)
    this.camera.position.set(0, 0, CAMERA_Z)

    // Renderer — transparent bg, antialiased
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha:           true,
      antialias:       true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)   // false = don't touch canvas CSS size
    this.renderer.setClearColor(0x000000, 0)

    // Card-plane geometry — portrait aspect like HSR light cone art
    const aspect = w / h
    const geo    = new THREE.PlaneGeometry(2.0 * aspect, 2.0, 32, 32)

    this.material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
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

    // apply any pre-init setBaseColor/setFresnelR0 calls
    if (this._pendingBaseColor) {
      this.material.uniforms.uBaseColor.value.set(...this._pendingBaseColor)
    }
    if (this._pendingFresnelR0 !== null) {
      this.material.uniforms.uFresnelR0.value = this._pendingFresnelR0
    }

    window.addEventListener('resize', this._onResize, { passive: true })
    this._loop()
  }

  // ── setTilt  — called from ChatWidget spring loop each rAF frame ──
  setTilt(cx, cy) {
    this._cx = cx
    this._cy = cy
  }

  // ── setBaseColor  (call before or after init) ────────────────
  setBaseColor(r, g, b) {
    this._pendingBaseColor = [r, g, b]
    if (this.material) this.material.uniforms.uBaseColor.value.set(r, g, b)
  }

  // ── setFresnelR0  (0.04 = glass/plastic, 0.9 = mirror) ───────
  setFresnelR0(r0) {
    this._pendingFresnelR0 = r0
    if (this.material) this.material.uniforms.uFresnelR0.value = r0
  }

  // ── dispose ─────────────────────────────────────────────────
  dispose() {
    this._destroyed = true
    cancelAnimationFrame(this._rafId)
    window.removeEventListener('resize', this._onResize)
    if (this.material) this.material.dispose()
    if (this.mesh) {
      this.mesh.geometry.dispose()
      this.scene && this.scene.remove(this.mesh)
    }
    if (this.renderer) this.renderer.dispose()
    this.scene = null; this.camera = null; this.renderer = null
    this.mesh  = null; this.material = null
  }

  // ── Private: window resize ──────────────────────────────────
  _handleResize() {
    if (!this.renderer || !this.camera) return
    const c = this.canvas
    const w = c.clientWidth  || c.offsetWidth
    const h = c.clientHeight || c.offsetHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  // ── Private: rAF loop ───────────────────────────────────────
  _loop() {
    if (this._destroyed) return
    this._rafId = requestAnimationFrame(() => this._loop())
    this._tick()
  }

  // ── Private: per-frame uniform update + render ──────────────
  _tick() {
    if (!this.renderer || !this.scene || !this.camera || !this.material) return
    const t = (performance.now() - this._startTime) * 0.001
    this.material.uniforms.uTime.value = t
    this.material.uniforms.uTilt.value.set(this._cx, this._cy)
    this.renderer.render(this.scene, this.camera)
  }
}

export default OpticsEngine
