/**
 * SuperResEngine.js — Dual-Rail Super-Resolution Pipeline  (v1.0)
 *
 * Architecture (connectivity test build):
 *
 *   Rail A — Low-res scene (0.5× resolution)
 *     lowResCamera  →  lowResScene  →  renderTarget (WebGLRenderTarget)
 *
 *   Rail B — Full-res upscale pass
 *     renderTarget.texture  →  highResScene (fullscreen quad)  →  highResCamera  →  screen
 *
 * Test anchor: a red BoxGeometry is placed in lowResScene.
 * If the pipeline is working, a soft-edged red box should appear on screen
 * (blurry/blocky because it was rendered at 0.5× then upscaled by CSS/GPU).
 *
 * Extends VolumetricEngine so it inherits:
 *   - mount() / destroy()
 *   - canvas management
 *   - ResizeObserver + _deferResize()
 *   - FPS watchdog + fallback()
 *   - _buildScene() / _tick() hooks
 */

import * as THREE from 'three'
import { VolumetricEngine } from './VolumetricEngine.js'

// ─────────────────────────────────────────────────────────────
//  Full-screen quad shaders for Rail B upscale pass
// ─────────────────────────────────────────────────────────────

/** Vertex shader — NDC full-screen quad, passes UV to fragment. */
const VERT_UPSCALE = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  // Write directly to NDC — orthographic camera (-1,1,1,-1) ensures
  // the quad exactly covers the viewport without any matrix transform.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Fragment shader — bilinear sample from the low-res render target. */
const FRAG_UPSCALE = /* glsl */`
precision mediump float;
uniform sampler2D uLowResTex;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uLowResTex, vUv);
}
`

// ─────────────────────────────────────────────────────────────
//  SuperResEngine
// ─────────────────────────────────────────────────────────────

export class SuperResEngine extends VolumetricEngine {
  /**
   * @param {HTMLElement} container  — host div (same API as VolumetricEngine)
   * @param {object}      [opts]     — optional overrides
   * @param {number}      [opts.scale=0.5]  — low-res scale factor (0 < scale ≤ 1)
   */
  constructor(container, opts = {}) {
    // Pass opts to VolumetricEngine base (fov/near/far are unused for ortho cameras
    // but the base constructor accepts them gracefully).
    super(container, opts)

    /** Fraction of screen resolution used for the low-res rail. */
    this._scale = Math.min(Math.max(opts.scale ?? 0.5, 0.05), 1.0)

    // ── Dual-rail objects (allocated in _buildScene) ────────
    /** @type {THREE.WebGLRenderTarget|null} */
    this.renderTarget = null

    /** Low-resolution scene (rendered first into renderTarget). */
    this.lowResScene  = null
    /** @type {THREE.PerspectiveCamera|null} */
    this.lowResCamera = null

    /** Full-res scene — holds a single fullscreen quad that samples renderTarget. */
    this.highResScene  = null
    /**
     * MUST be OrthographicCamera(-1, 1, 1, -1, 0, 1).
     * The quad vertex shader writes gl_Position = vec4(pos.xy, 0, 1) — NDC coords.
     * Using an Orthographic camera whose clip volume exactly matches NDC space
     * (-1..1 on all axes) ensures Three.js's frustum-culling system sees the quad
     * as always-visible. Any other camera type / frustum would cull it away or
     * produce incorrect transforms, resulting in a black screen.
     */
    this.highResCamera = null

    /** ShaderMaterial used by the fullscreen upscale quad. */
    this._upscaleMaterial = null

    /** Test anchor mesh — visible red cube in lowResScene. */
    this._testCube = null
  }

  // ══════════════════════════════════════════════════════════
  //  _buildScene()  — called by VolumetricEngine.mount()
  //  after the renderer + base scene + OrthographicCamera are ready.
  // ══════════════════════════════════════════════════════════
  _buildScene() {
    const { w, h } = this._getSize()
    const rw = Math.max(Math.round(w * this._scale), 1)
    const rh = Math.max(Math.round(h * this._scale), 1)

    // ── Step 1: WebGLRenderTarget (low-res buffer) ──────────
    this.renderTarget = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter:   THREE.LinearFilter,
      magFilter:   THREE.LinearFilter,   // bilinear upscale — intentionally soft
      format:      THREE.RGBAFormat,
      type:        THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    })

    // ── Step 2: Low-res rail — scene + camera + test anchor ─
    this.lowResScene  = new THREE.Scene()
    this.lowResScene.background = new THREE.Color(0x04060e)  // deep-space bg

    // Perspective camera for the low-res 3-D scene
    this.lowResCamera = new THREE.PerspectiveCamera(60, rw / rh, 0.1, 100)
    this.lowResCamera.position.set(0, 0, 3)

    // ── Test anchor: bright red cube ────────────────────────
    // A MeshBasicMaterial cube is the simplest possible geometry that:
    //   • requires no lighting (so it always renders regardless of lights)
    //   • has a distinctive colour that makes pipeline connectivity obvious
    // If you see a blurry red box on screen → Rail A + Rail B are both working.
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1)
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    this._testCube = new THREE.Mesh(cubeGeo, cubeMat)
    this.lowResScene.add(this._testCube)

    // ── Step 3: High-res rail — fullscreen upscale quad ─────

    // CRITICAL: orthographic camera with clip volume exactly matching NDC.
    // See constructor JSDoc for why this is the only correct choice.
    this.highResCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    this.highResScene = new THREE.Scene()

    // Fullscreen quad geometry — two triangles covering [-1,1]² in NDC.
    // PlaneGeometry(2,2) produces vertices at (±1, ±1, 0) with UV (0,0)→(1,1).
    const quadGeo = new THREE.PlaneGeometry(2, 2)
    this._upscaleMaterial = new THREE.ShaderMaterial({
      vertexShader:   VERT_UPSCALE,
      fragmentShader: FRAG_UPSCALE,
      uniforms: {
        uLowResTex: { value: this.renderTarget.texture },
      },
      depthWrite: false,
      depthTest:  false,
    })
    const quad = new THREE.Mesh(quadGeo, this._upscaleMaterial)
    this.highResScene.add(quad)
  }

  // ══════════════════════════════════════════════════════════
  //  _tick()  — called every rAF frame by VolumetricEngine._loop()
  // ══════════════════════════════════════════════════════════
  _tick() {
    const { renderer, renderTarget, lowResScene, lowResCamera,
            highResScene, highResCamera, _testCube } = this

    if (!renderer || !renderTarget || !lowResScene || !lowResCamera ||
        !highResScene || !highResCamera) return

    // Slow-rotate the test cube so we can confirm the animation loop runs.
    if (_testCube) {
      _testCube.rotation.x += 0.008
      _testCube.rotation.y += 0.012
    }

    // ── Rail A: render low-res scene into renderTarget ──────
    // setRenderTarget(non-null) → renderer writes to the FBO, not the canvas.
    renderer.setRenderTarget(renderTarget)
    renderer.render(lowResScene, lowResCamera)

    // ── Rail B: upscale renderTarget → screen ───────────────
    // setRenderTarget(null) → renderer writes to the canvas (screen).
    renderer.setRenderTarget(null)
    renderer.render(highResScene, highResCamera)
  }

  // ══════════════════════════════════════════════════════════
  //  _handleResize()  — keep render target + cameras in sync
  //  Override base class to also resize the low-res RenderTarget.
  // ══════════════════════════════════════════════════════════
  _handleResize() {
    // Let base class update renderer size + base ortho camera
    super._handleResize()

    if (!this.renderer || !this.renderTarget) return

    const { w, h } = this._getSize()
    if (!w || !h) return

    // Resize the low-res render target to track the new screen size × scale
    const rw = Math.max(Math.round(w * this._scale), 1)
    const rh = Math.max(Math.round(h * this._scale), 1)
    this.renderTarget.setSize(rw, rh)

    // Update low-res camera aspect
    if (this.lowResCamera) {
      this.lowResCamera.aspect = rw / rh
      this.lowResCamera.updateProjectionMatrix()
    }
  }

  // ══════════════════════════════════════════════════════════
  //  destroy()  — release dual-rail GPU resources then call super
  // ══════════════════════════════════════════════════════════
  destroy() {
    if (this.renderTarget)      { this.renderTarget.dispose();      this.renderTarget = null }
    if (this._upscaleMaterial)  { this._upscaleMaterial.dispose();  this._upscaleMaterial = null }
    if (this._testCube) {
      this._testCube.geometry.dispose()
      this._testCube.material.dispose()
      this._testCube = null
    }
    this.lowResScene  = null
    this.highResScene = null
    this.lowResCamera = null
    this.highResCamera = null
    super.destroy()
  }
}

export default SuperResEngine
