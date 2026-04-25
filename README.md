# COREALIS · MEMPHIS PORTFOLIO
## Corealis Portfolio · AI Lab Founder's Works

---

## ▌ABOUT THIS PROJECT

This is not a template. This is my digital territory — Memphis × Brutalist aesthetic meets custom WebGL rendering engine. No compromises, no shortcuts, just raw engineering power.

---

## ▌FEATURES · 功能特性

| Module | Description |
|--------|-------------|
| **Homepage** | Featured carousel, real-time particle background, breathing animations |
| **Project Details** | Markdown rendering, Memphis visual style, immersive reading experience |
| **Earth Renderer** | WebGL custom engine, isometric view, lighting system, procedural terrain |
| **Moon System** | Dynamic orbits, meteor particles, real-time shadow casting |
| **Admin Dashboard** | GitHub API integration, real-time featured toggle, deployment management |
| **Internationalization** | Chinese/English support, one-click switch, persistent memory |

---

## ▌ARCHITECTURE · 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                   COREALIS PORTFOLIO                        │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND (Static SPA)                                      │
│  ├── Vue 3 + TypeScript                                      │
│  │   ├── Vite Build Tool                                    │
│  │   ├── Vue Router                                         │
│  │   ├── Pinia State Management                             │
│  │   └── Vue I18n Internationalization                     │
│  ├── Three.js + WebGL                                       │
│  │   └── SuperResEngine — Custom Rendering Engine            │
│  │       ├── Earth Rendering (Noise Terrain + Atmosphere)    │
│  │       ├── Lunar Orbital System                           │
│  │       ├── Dynamic Shadow Calculation                     │
│  │       └── Particle System (Meteor/Stardust)              │
│  └── CSS                                                     │
│      └── Memphis × Brutalist Hybrid Style                   │
├─────────────────────────────────────────────────────────────┤
│  BACKEND (Serverless)                                       │
│  ├── Vercel Functions                                       │
│  │   ├── /api/saveData — GitHub File Write                  │
│  │   └── /api/listRepos — Repository Query                  │
│  └── GitHub API v3                                          │
│      └── Portfolio Data Persistence                         │
├─────────────────────────────────────────────────────────────┤
│  DEPLOYMENT                                                 │
│  ├── Vercel (Frontend + Functions)                          │
│  ├── GitHub (Data + CI/CD)                                 │
│  └── Cloudflare R2 (CDN Acceleration)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ▌PROJECT STRUCTURE · 目录结构

```
portfolio-frontend/
├── public/
│   └── data/
│       └── projects.json          # Portfolio data source
├── src/
│   ├── api/
│   │   ├── http.ts               # HTTP client wrapper
│   │   └── projectService.ts     # Project data service
│   ├── assets/
│   │   ├── main.css              # Global styles + Memphis variables
│   │   └── memes/                # Memphis decorative assets
│   ├── components/
│   │   ├── AppNav.vue            # Navigation bar
│   │   ├── ProjectCard.vue       # Project card
│   │   ├── ParticleBg.vue        # Particle background
│   │   └── ScrollHint.vue       # Scroll hint
│   ├── router/
│   │   └── index.ts              # Router configuration
│   ├── stores/
│   │   └── app.ts                # Global state management
│   ├── utils/
│   │   ├── SuperResEngine.js    # WebGL Earth rendering engine
│   │   └── physics.ts           # Physics simulation utilities
│   ├── views/
│   │   ├── HomeView.vue          # Homepage
│   │   ├── ProjectsView.vue      # Project list
│   │   ├── ProjectDetail.vue     # Project detail
│   │   └── AdminView.vue         # Admin dashboard
│   ├── i18n/
│   │   ├── index.ts             # I18n configuration
│   │   ├── zh.ts                # Chinese language pack
│   │   └── en.ts                # English language pack
│   ├── App.vue
│   └── main.ts
├── vercel.json
├── package.json
└── vite.config.ts
```

---

## ▌DEVELOPMENT · 运行开发

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## ▌DESIGN SYSTEM · 设计规范

### COLOR PALETTE · 色彩系统

| Name | Hex | Usage |
|------|-----|-------|
| Memphis Pink | `#FF3366` | Primary accent, CTA buttons |
| Memphis Yellow | `#FFE066` | Secondary accent, decorations |
| Memphis Blue | `#3366FF` | Links, secondary actions |
| Memphis Green | `#00D9A5` | Success states, online indicators |
| Deep Space | `#0A0A0F` | Main background |
| Grid Line | `#1A1A2E` | Dividers, grids |

### TYPOGRAPHY · 字体系统

- **Chinese**: Noto Sans SC (400/700)
- **English**: Space Grotesk (400/500/700)
- **Code**: JetBrains Mono

---

## COREALIS · 2026
*Memphis × Brutalist · No Compromises*
