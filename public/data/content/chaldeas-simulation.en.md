# Chaldeas Simulation: Mimetic Earth Computation Core

## Project Overview

The Chaldeas Simulation system is a real-time planetary environment computation framework built on a WebGL2 dual-rail rendering pipeline. It fuses procedural terrain generation with super-resolution post-processing to achieve dual breakthroughs at both the physical limits and aesthetic frontiers of real-time rendering.

## Core Architecture: Dual-Rail Rendering Pipeline

### Rail-A — Procedural Terrain Generation Engine
- **Multi-Octave FBM Noise Function**: Stacks 6 layers of fractional Brownian motion noise at varying frequencies and amplitudes to generate continental plate outlines and micro-terrain detail in real time
- **Dynamic Continental Drift**: Noise seeds evolve continuously along the time axis, driving perceptible mimetic drift in continental morphology within rendered frames
- **Dual-Layer Blended Sampling**: Independent noise fields for land (high amplitude, low frequency) and ocean (low amplitude, high frequency) layers overlap to construct a realistic sea-land boundary gradient

### Rail-B — CAS Super-Resolution Post-Processing Stage
- **CAS (Contrast Adaptive Sharpening) Algorithm**: Adaptively detects edge contrast in the low-sample pixel substrate and restores high-frequency detail without introducing ringing artifacts
- **Breaking the Physical Resolution Limit**: Renders at 0.1×–1.0× variable base resolution; CAS post-processing recovers industrial-grade clarity
- **Four-Tier Precision Console**:
  - `0.1×` NearestFilter — mosaic ruin aesthetic, pixel block effect maximized
  - `0.35×` — low-res contours visible, detail blurred
  - `0.7×` — transition state, CAS gain pronounced
  - `1.0×` — full high-frequency FBM detail injection, maximum sharpness

## Design Philosophy

> A staircase visual leap from 'digital ruin' to 'mimetic Earth' — defining both the physical and aesthetic frontiers of real-time rendering.

The system's central question is not "how to render better," but **to make the degradation process itself an observable visual narrative** — users traverse the four-tier resolution slider, witnessing a planet spontaneously emerge from pixel noise, experiencing the raw tension of computational aesthetics.

## Tech Stack

| Module | Technology |
|--------|-----------|
| Rendering Pipeline | WebGL2 / GLSL ES 3.0 |
| Terrain Generation | Multi-Octave FBM Procedural Noise |
| Super-Resolution | CAS (Contrast Adaptive Sharpening) |
| Ray Casting | Ray Marching Sphere SDF |
| Frontend Framework | Vue 3 + TypeScript |

## Visual Reference

At the highest resolution tier, the system clearly renders:
- Soft gradient boundaries between continents and oceans
- Layered noise texture on plateau terrain
- High-frequency detail emergence in polar ice caps
- Pixel-sharp edges on planetary orbital rings
