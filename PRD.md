# Product Requirements Document (PRD): 个人作品集网站

> **文档状态**: 活跃 / 迭代中
> **当前版本**: v2.0 (纯静态前端重构版)
> **部署环境**: Vercel (Production: https://haoyuanlin.uk)

---

## 一、 产品愿景与目标 (Product Vision & Goals)

**产品定位**：一个高度个性化、兼具技术深度与视觉冲击力的个人作品集与数字简历。
**核心目标**：
1. **全面展示专业能力**：系统性呈现从 Web3/区块链探索、AI 驱动的虚拟世界项目（如 Cosmolyra）到工程实践（如 DMAIC 质量分析）的多元化成果。
2. **突显职业意向**：为求职视频内容运营与 AI 工作流整合相关岗位提供强有力的背景背书。
3. **强化个人品牌**：结合二次元（ACG）文化背景与前卫的 Web 交互技术，打造具有极高辨识度的个人主页。

## 二、 目标用户 (Target Audience)
- **招聘方/HR**：寻找具备 AI 工具整合能力、内容运营经验及技术背景的复合型人才。
- **开源社区/项目协作者**：了解我的技术栈、项目管理经历及合作潜力。
- **ACG/游戏行业同行**：展示在动画俱乐部运营及游戏（如《重返未来：1999》）相关调研中的行业洞察。

## 三、 当前系统架构与设计规范 (Architecture & Design)

### 3.1 技术架构 (Vercel-Only Static Site)
- **核心框架**: Vue 3 (Composition API) + Vite
- **路由 & 状态**: Vue Router + @vueuse/core
- **数据层**: 纯静态读取 `public/data/projects.json` 与 `public/assets/`
- **国际化**: vue-i18n (中/英双语)

### 3.2 视觉语言 (Memphis & Brutalist)
任何新需求的 UI 设计必须严格遵循以下规范：
- **色彩**: `warm-white` 底色，`memphis-yellow/blue/coral/mint` 作为高亮强调色。
- **排版**: Brutalist 风格，使用 Inter/Space Grotesk 字体。
- **形状与阴影**: 3px 纯黑实线边框 (`border-3 border-ink`) + 硬阴影 (`shadow-hard` 系列，无模糊)。
- **动效**: GSAP 丝滑过渡 + matter-js 物理引擎背景交互。

---

## 四、 核心功能模块 (Current Features)

| 模块 | 描述 | 状态 |
|------|------|------|
| **Hero Section (主页)** | 包含二次元定制头像、个性化签名、语言切换及动态几何背景。 | 🟢 已上线 |
| **Projects (项目库)** | 读取本地 JSON 的卡片式展示，支持侧滑面板查看 Markdown 详情。 | 🟢 已上线 |
| **Experience (经历)** | 时间轴形式展示俱乐部运营、学术改革应对及项目协作等经历。 | 🟢 已上线 |
| **Gaming/ACG (兴趣)** | 展示个人在二次元文化和游戏领域的深度参与及洞察。 | 🟢 已上线 |
| **Resume (简历页)** | 提供优化后的专业履历浏览与 PDF 下载。 | 🟢 已上线 |

---

## 五、 待开发需求池 (Backlog & Future Features)
*(💡 下次有新想法时，请在此处填写，并将其与上下文一起发给 AI)*

### 🚀 需求框架模板 (复制此模板添加新需求)

#### 需求名称：[填写需求简述，例如：项目列表增加多维度标签筛选]
- **需求背景**：[为什么需要这个功能？例如：随着项目增多，HR 无法快速定位到 AI 相关的项目。]
- **功能描述**：
  1. [具体交互 1]
  2. [具体交互 2]
- **UI/UX 要求**：[例如：筛选按钮需要符合 Memphis 风格，选中状态带有 memphis-yellow 的硬阴影。]
- **数据/接口变更**：[例如：需要修改 `public/data/projects.json` 增加 `tags` 字段。]
- **优先级**：[高 / 中 / 低]

---

### 📝 规划中的需求

#### 需求名称：增加"Cosmolyra"项目专属深度展示页
- **需求背景**：作为核心主打项目，目前的 Markdown 侧滑面板不足以展示其 AI 驱动交易枢纽的复杂架构与虚拟资产动态。
- **功能描述**：
  1. 在 Projects 列表中，点击 Cosmolyra 卡片跳转到独立路由 `/projects/cosmolyra`。
  2. 页面内嵌架构图、技术栈雷达图（Solidity/Python/AI Agents）及演示视频占位符。
- **UI/UX 要求**：保留全局 CustomCursor，增加滚动视差效果。
- **优先级**：高

---

## 六、 非功能性需求 (Non-Functional Requirements)
1. **性能 (Performance)**：所有新增图片必须经过压缩，Lighthouse 跑分保持在 90+。
2. **响应式 (Responsive)**：移动端优先，所有 Memphis 元素在小屏幕下必须合理折叠，不出现横向滚动条。
3. **SEO & 社交分享**：确保 `<meta>` 标签（Title, Description, Open Graph 图标为二次元头像）配置完整。
