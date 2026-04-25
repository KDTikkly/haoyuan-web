# API Keys 配置人类指南

> 本项目前端部署在 **Vercel**，后端部署在 **Fly.io**。  
> 所有敏感 Key **绝对不能**写进代码仓库，必须配置为环境变量。

---

## 一览表

| 变量名 | 用途 | 在哪配置 | 必填 |
|---|---|---|---|
| `GEMINI_API_KEY` | AI 聊天 + 涂鸦识别（Vision） | Vercel | ✅ |
| `STEAM_API_KEY` | Steam 游戏数据展示 | Vercel | ✅ |
| `STEAM_ID` | 你的 Steam 64-bit ID | Vercel | ✅ |
| `ADMIN_PASSWORD` | 后台管理登录密码 | Vercel | ✅ |
| `ALLOWED_ORIGINS` | 允许跨域的前端域名 | Fly.io | 生产必填 |

---

## 1. GEMINI_API_KEY（Google AI Studio）

> 用于 `/api/chat`（AI 聊天流式回复）和 `/api/vision`（画板涂鸦识别）

### 获取步骤

1. 打开 [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. 登录 Google 账号（需能访问 Google 服务）
3. 点击右上角 **「Create API key」**
4. 选择「Create API key in new project」或选已有项目
5. 复制生成的 Key（格式：`AIzaSy...`，39位）

### 注意事项

- **免费额度**：`gemini-2.5-flash` 免费层每分钟 15 次请求，每天 1500 次
- Key 泄露风险高，不要截图分享，不要 commit 进 git
- 若看到报错 `RESOURCE_EXHAUSTED` 或 `429`，说明免费额度已用完，次日重置

---

## 2. STEAM_API_KEY + STEAM_ID

> 用于 `/api/steam`（显示近期游戏、总游戏数、总时长）

### 获取 STEAM_API_KEY

1. 打开 [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. 登录你的 Steam 账号
3. 在「Domain Name」填入你的网站域名，如 `haoyuanlin.uk`
4. 点击 **「Register」**，复制 Key（32位十六进制）

### 获取 STEAM_ID（64-bit SteamID）

1. 打开你的 Steam 个人资料页
2. 打开 [https://www.steamidfinder.com/](https://www.steamidfinder.com/)，输入你的 Steam 个人资料 URL
3. 复制「steamID64」那行（格式：`76561198xxxxxxxxx`，17位数字）

### 前置条件

Steam 个人资料的**游戏详情**必须设置为「公开」：  
Steam → 个人资料 → 编辑资料 → 隐私设置 → 游戏详情 → **公开**

---

## 3. ADMIN_PASSWORD

> 用于 `/api/verifyAdmin`（后台管理功能鉴权）

自己设置一个强密码即可，例如：`MyPortfolio@2025!`

---

## 二、在 Vercel 配置环境变量

> 前端所有 `/api/*` 函数的环境变量都在这里配置

### 步骤

1. 打开 [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. 进入你的项目（`haoyuan-web` 或类似名称）
3. 顶部导航栏点击 **「Settings」**
4. 左侧菜单点击 **「Environment Variables」**
5. 逐个添加：

| 操作 | 说明 |
|---|---|
| Name 填变量名 | 如 `GEMINI_API_KEY` |
| Value 填对应的 Key | 粘贴复制的 Key |
| Environment 全选 | Production + Preview + Development |
| 点击 「Save」 | 保存 |

6. **添加完所有变量后**，必须重新触发一次部署才能生效：  
   → 进入「Deployments」→ 找最新那条 → 右上角三点菜单 → **「Redeploy」**

---

## 三、在 Fly.io 配置环境变量（后端）

> 后端 Go 服务只需要 `ALLOWED_ORIGINS`，Keys 不在后端使用

```bash
# 在本地 terminal 执行（需先安装 flyctl 并登录）
fly secrets set ALLOWED_ORIGINS="https://haoyuanlin.uk,https://www.haoyuanlin.uk" --app <你的app名称>
```

确认已设置：
```bash
fly secrets list --app <你的app名称>
```

---

## 四、本地开发配置

在 `portfolio-frontend/` 目录下创建 `.env.local` 文件（**已被 `.gitignore` 忽略，不会上传**）：

```bash
# portfolio-frontend/.env.local

GEMINI_API_KEY=AIzaSy你的key...
STEAM_API_KEY=你的32位key
STEAM_ID=76561198你的17位ID
ADMIN_PASSWORD=你的本地测试密码
```

然后启动开发服务器：
```bash
npm run dev
```

> Vercel 本地开发工具也可以用 `vercel dev` 自动读取 `.env.local`

---

## 五、快速排错

| 症状 | 原因 | 解决方法 |
|---|---|---|
| AI 聊天无响应 / 报 `MISSING_API_KEY` | `GEMINI_API_KEY` 未配置 | 按第二节步骤添加并 Redeploy |
| AI 报 `429` / `OVER_QUOTA` | 免费额度用完 | 等次日重置，或升级 Google AI 套餐 |
| Steam 模块空白 / 报 `MISSING_KEY` | `STEAM_API_KEY` 或 `STEAM_ID` 未配置 | 按第二节步骤添加并 Redeploy |
| Steam 数据全是 0 | Steam 资料未设公开 | Steam 隐私设置 → 游戏详情 → 公开 |
| 后台登录始终失败 | `ADMIN_PASSWORD` 未配置或打错 | 检查 Vercel 环境变量中的值 |
| 后端 CORS 报错 | `ALLOWED_ORIGINS` 未设或域名拼错 | `fly secrets set ALLOWED_ORIGINS=...` |
