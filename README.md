# Corealis — Digital Avatar Terminal

> **Live:** [haoyuanlin.uk](https://haoyuanlin.uk)  
> **Stack:** Vue 3 · Vite · TypeScript · Tailwind CSS  
> **Design:** Memphis × Brutalist — no rounded corners, no gradients, no compromises.

---

## What Is This

Corealis is a personal portfolio site that refuses to be a portfolio site. Instead of a static resume, it's an interactive terminal — combining a Memphis design system, a physics-engine background, a bilingual AI chat widget, a 127-game Steam library dashboard, and a full project showcase with bilingual (ZH/EN) markdown content.

Built entirely as a zero-backend static SPA, deployed on Vercel via GitHub push.

---

## Features

### Core Pages

| Route | Description |
|-------|-------------|
| `/` | Hero landing — Memphis-style typography, GSAP animation, physics-engine canvas background |
| `/projects` | Project showcase — tag filtering, card grid, slide-over detail panel with bilingual Markdown content |
| `/gaming` | Gaming dashboard — Steam library (127 games), achievement progress, playtime stats, genre filtering, A–Z sort |
| `/resume` | One-page resume — structured timeline layout |
| `/experience` | Career & experience timeline |
| `/admin` | Content management portal (passphrase protected: `Corealis0514`) |

---

### Projects Module (v9.0)

Full bilingual support — switching language updates the project list titles, subtitles, descriptions **and** the full-text detail content in real time.

**Data architecture:**
```
public/data/
  projects.json            # Metadata: all text fields are { zh, en } objects
  content/
    <id>.md                # Chinese detail content
    <id>.en.md             # English detail content
```

**Features:**
- Tag-based filtering (Web3 / AI / Data & Biz Analysis / Operations / Game Teardown / All)
- Cloudinary fallback cover image pool — cards always have a cover even if original is missing
- Slide-over detail panel with:
  - Cover image (synchronized with card)
  - Full Markdown content rendered via `marked`
  - Bilibili / image media embeds
  - External links (GitHub, Demo, Notebook)
  - Graceful 404 fallback when content file is missing

---

### Gaming Dashboard (`/gaming`)

The most over-engineered part of this portfolio. Tracks 127 games across Steam, mobile, and other platforms.

**FullLibraryPortal features:**
- Platform tabs: All / Steam / Mobile / Other
- Genre tag filter row (dynamically extracted from game tags)
- Full-text search (name / platform / tags)
- Sort: **A–Z** (default) / Playtime / Platform
- Dual pagination mode:
  - 5 / 10 per page → paginated navigation
  - 15 / 20 per page → infinite scroll
  - Mobile: always infinite scroll
- Steam API integration: real playtime, achievement counts, last played

---

### Chat Widget

A persistent AI chat assistant floating in the bottom-right corner. Features:
- Full conversation UI with message history
- Easter egg chain — hidden interactions that reveal personality
- Mobile: 60×60px; Desktop: 80×80px

---

### AI Drawing Board

Bottom-left FAB opens a canvas drawing experience powered by the `MemphisGameBg.vue` physics engine. The canvas doubles as the animated page background when not in drawing mode.

---

### Bilingual Support (ZH / EN)

Globally toggled via the `LangToggle` component in the Navbar. Powered by `vue-i18n`.

- All UI strings: translated
- Project titles, subtitles, descriptions: `{ zh, en }` fields in `projects.json`
- Project detail content: separate `.md` and `.en.md` files, hot-swapped on locale change
- Resume & Experience pages: i18n-keyed text

---

### Design System

Memphis × Brutalist — every rule is a hard constraint, not a suggestion.

| Rule | Value |
|------|-------|
| Border | `border-[3px] border-ink` (#1A1A1A) |
| Shadow | `shadow-[4px_4px_0_0_#1A1A1A]` — no blur |
| Rounded corners | **Banned** |
| Gradients | **Banned** |
| Blur | **Banned** (navbar backdrop-blur exempt) |
| Primary accent | `#FFD600` Memphis Yellow |
| Background | `#FAF8F5` Warm White |

---

## Project Structure

```
portfolio-frontend/
├── public/
│   └── data/
│       ├── projects.json          # Project metadata (bilingual)
│       └── content/               # Markdown content files (zh + en)
├── src/
│   ├── api/
│   │   ├── http.ts                # Axios instance
│   │   └── projectService.ts      # Projects data layer (bilingual-aware)
│   ├── components/
│   │   ├── ProjectCard.vue        # Project grid card
│   │   ├── ProjectSlideOver.vue   # Detail slide-over panel
│   │   ├── FullLibraryPortal.vue  # Full game library modal
│   │   ├── ChatWidget.vue         # AI chat + easter eggs
│   │   ├── MemphisGameBg.vue      # Physics canvas background
│   │   ├── HeroSection.vue        # Landing hero
│   │   ├── SecurityPortal.vue     # Admin passphrase gate
│   │   └── LangToggle.vue         # ZH/EN switcher
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── ProjectsView.vue
│   │   ├── GamingView.vue
│   │   ├── ResumeView.vue
│   │   ├── ExperienceView.vue
│   │   └── AdminView.vue
│   ├── i18n/                      # vue-i18n locale files
│   ├── types/                     # TypeScript interfaces
│   └── utils/
│       ├── OpticsEngine.js        # WebGL2 rendering (Chaldeas project)
│       └── cloudinaryFallbackPool.ts
├── package.json
└── vite.config.ts
```

---

## Development

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

## Adding a New Project

1. Add entry to `public/data/projects.json`:
   ```jsonc
   {
     "id": "my-project",
     "title":       { "zh": "项目名", "en": "Project Name" },
     "subtitle":    { "zh": "副标题", "en": "Subtitle" },
     "description": { "zh": "描述（禁用中文弯引号）", "en": "Description" },
     "content_path": {
       "zh": "/data/content/my-project.md",
       "en": "/data/content/my-project.en.md"
     },
     "tags": ["Tag"],
     "cover": "https://...",
     "media": [],
     "external_links": [],
     "featured": true,
     "date": "2026-01"
   }
   ```

2. Create `public/data/content/my-project.md` (Chinese)
3. Create `public/data/content/my-project.en.md` (English)

> **Warning:** Do not use Chinese curly quotes `"` `"` inside JSON string values — they break JSON parsing and cause the entire project list to fail silently.

---

## Deployment

Deployed automatically on Vercel when `main` branch is pushed. No server configuration required — pure static SPA.

Domain: `haoyuanlin.uk`

---

## Design Philosophy

> Memphis is not a style. It is a posture.

This site exists to communicate a specific sensibility: that craft lives in constraints, that personality is more memorable than polish, and that a portfolio can have a point of view.

Every hard border, every pixel-perfect shadow offset, every deliberately un-rounded corner is a choice — not a limitation.

---

*Corealis v9.0 — Built by Lyria*
