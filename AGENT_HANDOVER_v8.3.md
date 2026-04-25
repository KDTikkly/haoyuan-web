# AGENT HANDOVER — portfolio-frontend
**版本**: v8.3  
**更新时间**: 2026-04-26 01:05  
**仓库**: https://github.com/KDTikkly/haoyuan-web.git  
**本地路径**: `c:\Users\KDVON\CodeBuddy\20260422231627\portfolio-frontend`  
**package 版本**: 0.6.0

---

## 一、项目概述

个人作品集网站，基于 **Vue 3 + TypeScript + Vite** 构建，孟菲斯（Memphis）风格设计语言，支持中英双语（i18n）。包含主页、项目展示、工作经验、游戏库、管理后台等模块，并集成了多个 WebGL 渲染引擎用于视觉特效。

**技术栈**：
| 层 | 技术 |
|---|---|
| 框架 | Vue 3 Composition API + TypeScript |
| 构建 | Vite |
| 路由 | Vue Router |
| 国际化 | vue-i18n（中/英） |
| 样式 | 纯 CSS（孟菲斯风格，3px 黑边 box-shadow） |
| 图片 CDN | Cloudinary（含 fallback pool） |
| WebGL | OpticsEngine / SuperResEngine / VolumetricEngine（三套自研） |
| 部署 | GitHub → CI/CD（具体平台见仓库 Actions） |

---

## 二、项目结构

```
portfolio-frontend/src/
├── views/
│   ├── HomeView.vue          # 主页，含 HeroSection
│   ├── ProjectsView.vue      # 项目展示，挂载 SuperResEngine（ZK-PHYSICS LIVE）
│   ├── ExperienceView.vue    # 工作经验时间线
│   ├── GamingView.vue        # 游戏库（Steam API + 本地 JSON）
│   ├── ResumeView.vue        # 简历页
│   └── AdminView.vue         # 管理员后台
├── components/
│   ├── HeroSection.vue       # 主页英雄区
│   ├── ProjectCard.vue       # 项目卡片
│   ├── ProjectSlideOver.vue  # 项目详情滑出面板（WebGL 已清理）
│   ├── SecurityPortal.vue    # 安全入口门（WebGL 已清理）
│   ├── ChatWidget.vue        # 聊天挂件，使用 OpticsEngine（2个实例）
│   ├── LightConeCard.vue     # 光锥卡片，使用 OpticsEngine
│   ├── GameCard.vue          # 游戏卡片
│   ├── GameDetailPanel.vue   # 游戏详情面板
│   ├── GamingProfile.vue     # 游戏档案
│   ├── FullLibraryPortal.vue # 完整游戏库入口
│   ├── MemphisChart.vue      # 孟菲斯风格图表
│   ├── MemphisAccordion.vue  # 手风琴折叠
│   ├── MemphisCover.vue      # 封面组件
│   ├── MemphisGameBg.vue     # 游戏背景
│   ├── MemphisPlaceholder.vue# 占位图
│   ├── AIVideoPlayer.vue     # AI 视频播放器
│   ├── CanvasBoard.vue       # 画板
│   ├── DrawingGuesser.vue    # 猜画游戏
│   ├── DrawingPayModal.vue   # 付费弹窗
│   ├── Web3PaymentModal.vue  # Web3 支付弹窗
│   ├── ExperienceSlideOver.vue# 经验滑出面板
│   ├── PhysicsCharm.vue      # 物理动效
│   ├── CustomCursor.vue      # 自定义鼠标
│   ├── LangToggle.vue        # 语言切换
│   └── CookieConsent.vue     # Cookie 同意弹窗
└── utils/
    ├── OpticsEngine.js        # WebGL 光学引擎（Fresnel + 折射）— 活跃
    ├── SuperResEngine.js      # WebGL 超分辨率引擎（双轨管线）— 活跃（ProjectsView）
    ├── VolumetricEngine.js    # WebGL 体积雾引擎（已从所有 View 解挂，文件保留）
    └── cloudinaryFallbackPool.ts  # Cloudinary 图片 fallback 池
```

---

## 三、WebGL 引擎状态

| 引擎 | 文件 | 当前使用位置 | 状态 |
|---|---|---|---|
| **OpticsEngine** | `utils/OpticsEngine.js` | `ChatWidget.vue`（×2）、`LightConeCard.vue` | ✅ 活跃 |
| **SuperResEngine** | `utils/SuperResEngine.js` | `ProjectsView.vue`（ZK-PHYSICS LIVE 面板） | ✅ 活跃 |
| **VolumetricEngine** | `utils/VolumetricEngine.js` | 无 View/Component 引用 | ⚠️ 孤立文件，可安全删除 |

### VolumetricEngine 清理历史
- `ProjectSlideOver.vue` — 已清理 ✅（commit `ad6dacf`）
- `SecurityPortal.vue` — 已清理 ✅（commit `ad6dacf`）
- `GamingView.vue` — 已清理 ✅（commit `3b289c2`，删除 DATA PRISM WebGL 黑块）

---

## 四、近期提交记录（最新 15 条）

| Hash | 描述 |
|---|---|
| `3b289c2` | fix: remove DATA PRISM WebGL block from GamingView（游戏页空白修复）|
| `ad6dacf` | fix: remove WebGL black render blocks from ProjectSlideOver and SecurityPortal |
| `dc8a23c` | feat: Data Prism Steam dataflow aesthetics + particle sparkle shader |
| `ad82e8a` | fix: remove duplicate locale declaration in ProjectsView (build error) |
| `93cfa3d` | refactor: isolate ZK-PHYSICS to ProjectsView only (domain separation) |
| `d87a8f8` | fix: Data Prism transparent window — grid + grain background |
| `0e3860e` | feat: v8.9 ZK-PHYSICS transparent canvas + grid/grain background |
| `9c0e0f9` | feat: mount SuperResEngine in GamingView ZK-PHYSICS LIVE panel |
| `29721a2` | fix: SuperResEngine v1.1 — fix root cause black screen |
| `295239f` | feat: add SuperResEngine.js — dual-rail super-resolution pipeline |
| `fc1b9ca` | Create codeql.yml |
| `ee32934` | Create SECURITY.md |
| `680fe39` | fix: WebGL black screen + Steam API proxy for local dev |
| `acba955` | fix(VolumetricEngine): fix solid-black canvas — 3 root causes |
| `32a0e39` | fix(VolumetricEngine): remove pre-acquired WebGL2 context |

---

## 五、已知问题 & 待处理事项

### ⚠️ 待确认
1. **`VolumetricEngine.js` 孤立文件** — 当前无任何 View/Component import，可以安全删除以减少混淆。删除前确认没有动态 import。

2. **`ProjectsView.vue` SuperResEngine**（ZK-PHYSICS LIVE 面板）— 若该 WebGL 块也导致黑色渲染问题，可按同样方式清理（参考 GamingView 修复方式）。

3. **`ChatWidget.vue` OpticsEngine**（×2 实例）— 功能性 WebGL，为 `romance` 和 `reverie` 两个 Shader 面板提供光学效果，当前应正常运行。

4. **`_write_lcc.cjs` 和 `_write_optics.cjs`** — 工作区根目录存在两个临时脚本，用途不明，确认是否可删除。

### ✅ 近期已完成
- [x] GamingView 游戏页空白修复（DATA PRISM WebGL 渲染块导致组件 crash）
- [x] ProjectSlideOver WebGL 黑块清理
- [x] SecurityPortal WebGL 黑块清理
- [x] ProjectsView duplicate locale 编译错误修复
- [x] SuperResEngine 黑屏问题修复（v1.1）

---

## 六、各页面功能说明

| 路由（推断） | View | 核心功能 |
|---|---|---|
| `/` | HomeView | 英雄区、个人介绍 |
| `/projects` | ProjectsView | 项目卡片列表、ZK-PHYSICS LIVE WebGL 面板、项目滑出详情 |
| `/experience` | ExperienceView | 工作经验时间线 |
| `/gaming` | GamingView | Steam 游戏库（API 拉取）+ 本地 JSON 游戏、游戏详情面板 |
| `/resume` | ResumeView | 简历下载/预览 |
| `/admin` | AdminView | 管理员后台（SecurityPortal 鉴权） |

---

## 七、给下一个 Agent 的注意事项

1. **WebGL 相关修改**：每次操作后运行 `read_lints` 确认无 TypeScript 编译错误，再 push。
2. **VolumetricEngine import**：该文件虽存在但已从所有组件解挂，若有新需求不要重新 import，直接使用 OpticsEngine 或 SuperResEngine。
3. **孟菲斯设计规范**：所有新增 UI 元素遵循 `border: 3px solid #1A1A1A` + `box-shadow: 6px 6px 0 0 #1A1A1A` 风格。
4. **i18n**：每个新增文本需在 `locale === 'en'` 三元判断中提供中英两个版本，或在 i18n 配置文件中添加 key。
5. **Steam API**：本地开发需要代理配置（见 `vite.config.ts`），生产环境走后端 proxy。

---

*本文档由 AI Agent 自动生成，基于 2026-04-26 01:05 时的代码库状态。*
