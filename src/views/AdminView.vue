<template>
  <!--
    AdminView.vue  (/hidden-admin)
    仅供站主使用的极简 Brutalist 风格内容管理后台
    · 密码鉴权（比对 Vercel 环境变量 ADMIN_PASSWORD）
    · 新增/编辑项目 JSON 后通过 GitHub API 写入仓库，触发 Vercel 重建
  -->
  <div class="min-h-[calc(100vh-4rem)] bg-warm-white px-4 py-12">
    <div class="max-w-3xl mx-auto">

      <!-- ── 鉴权界面 ── -->
      <div v-if="!authed" class="flex items-center justify-center min-h-[60vh]">
        <div class="w-full max-w-sm border-[3px] border-ink shadow-[8px_8px_0_0_#1A1A1A] bg-warm-beige">

          <!-- Header -->
          <div class="px-6 py-4 border-b-[3px] border-ink bg-ink">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 bg-memphis-yellow rotate-45 border border-warm-white/40"></div>
              <span class="font-display font-bold text-warm-white tracking-tight">ADMIN ACCESS</span>
            </div>
          </div>

          <form class="px-6 py-8 space-y-6" @submit.prevent="doLogin">
            <div>
              <label class="block font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2">
                PASSPHRASE
              </label>
              <input
                v-model="passwordInput"
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full border-[3px] border-ink bg-warm-white px-4 py-3
                       font-mono text-sm text-ink placeholder-ink/30
                       focus:outline-none focus:shadow-[4px_4px_0_0_#2979FF]
                       transition-shadow duration-150"
              />
            </div>

            <!-- Error -->
            <p v-if="loginError" class="font-mono text-xs text-memphis-coral font-bold">
              ⚠ {{ loginError }}
            </p>

            <button
              type="submit"
              :disabled="loggingIn || !passwordInput"
              class="w-full py-3 border-[3px] border-ink bg-memphis-yellow font-mono text-sm font-bold
                     shadow-[4px_4px_0_0_#1A1A1A]
                     hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]
                     active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                     transition-[transform,box-shadow] duration-150
                     disabled:opacity-40 disabled:pointer-events-none"
            >
              {{ loggingIn ? 'VERIFYING...' : 'ENTER →' }}
            </button>
          </form>
        </div>
      </div>

      <!-- ── 后台主界面 ── -->
      <div v-else>

        <!-- Page Title Bar -->
        <div class="flex items-center justify-between mb-10">
          <div>
            <div class="inline-flex items-center gap-2 border-2 border-ink px-3 py-1 font-mono text-xs bg-memphis-yellow mb-3">
              <span class="w-2 h-2 bg-ink"></span>
              ADMIN PANEL
            </div>
            <h1 class="font-display font-extrabold text-4xl">Content Manager</h1>
            <p class="font-mono text-xs text-ink/50 mt-1 uppercase tracking-widest">
              Write directly to GitHub · Triggers Vercel rebuild
            </p>
          </div>
          <button
            class="font-mono text-xs border-2 border-ink px-3 py-1.5 bg-warm-beige
                   hover:bg-ink hover:text-warm-white transition-colors"
            @click="authed = false; activeTab = 'add'"
          >LOGOUT</button>
        </div>

        <!-- Tab Bar -->
        <div class="flex gap-0 mb-8 border-[3px] border-ink overflow-hidden shadow-[4px_4px_0_0_#1A1A1A]">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex-1 py-3 font-mono text-xs font-bold uppercase tracking-wider
                   border-r-[3px] last:border-r-0 border-ink
                   transition-colors duration-100"
            :class="activeTab === tab.key ? 'bg-ink text-warm-white' : 'bg-warm-beige text-ink hover:bg-warm-white'"
            @click="activeTab = tab.key; clearFormState()"
          >{{ tab.label }}</button>
        </div>

        <!-- ── Tab: Add Project ── -->
        <div v-if="activeTab === 'add' || activeTab === 'edit'">
          <form class="space-y-6" @submit.prevent="submitProject">

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <!-- ID -->
              <div>
                <label class="admin-label">PROJECT ID *</label>
                <input v-model="form.id" type="text" placeholder="cosmolyra" required
                  class="admin-input" :disabled="activeTab === 'edit'" />
                <p class="font-mono text-[10px] text-ink/40 mt-1">唯一标识，对应 content_path 文件名</p>
              </div>
              <!-- Date -->
              <div>
                <label class="admin-label">DATE *</label>
                <input v-model="form.date" type="month" required class="admin-input" />
              </div>
            </div>

            <!-- Title ZH / EN -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="admin-label">TITLE (ZH) *</label>
                <input v-model="form.title_zh" type="text" placeholder="项目标题" required class="admin-input" />
              </div>
              <div>
                <label class="admin-label">TITLE (EN) *</label>
                <input v-model="form.title_en" type="text" placeholder="Project Title" required class="admin-input" />
              </div>
            </div>

            <!-- Subtitle ZH / EN -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="admin-label">SUBTITLE (ZH)</label>
                <input v-model="form.subtitle_zh" type="text" class="admin-input" />
              </div>
              <div>
                <label class="admin-label">SUBTITLE (EN)</label>
                <input v-model="form.subtitle_en" type="text" class="admin-input" />
              </div>
            </div>

            <!-- Description ZH / EN -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="admin-label">DESCRIPTION (ZH) *</label>
                <textarea v-model="form.desc_zh" rows="3" required class="admin-input resize-none" />
              </div>
              <div>
                <label class="admin-label">DESCRIPTION (EN) *</label>
                <textarea v-model="form.desc_en" rows="3" required class="admin-input resize-none" />
              </div>
            </div>

            <!-- Tags + Cover -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="admin-label">TAGS (逗号分隔)</label>
                <input v-model="form.tagsRaw" type="text" placeholder="Vue, AI, Design" class="admin-input" />
              </div>
              <div>
                <label class="admin-label">COVER PATH</label>
                <input v-model="form.cover" type="text" placeholder="/assets/covers/cosmolyra.png" class="admin-input" />
              </div>
            </div>

            <!-- Markdown 正文 -->
            <div>
              <label class="admin-label">MARKDOWN CONTENT</label>
              <textarea
                v-model="form.markdown"
                rows="12"
                placeholder="# 项目标题&#10;&#10;内容..."
                class="admin-input resize-y font-mono text-xs"
              />
              <p class="font-mono text-[10px] text-ink/40 mt-1">
                将被写入 <code>public/data/content/{{ form.id || 'id' }}.md</code>
              </p>
            </div>

            <!-- Featured -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="w-6 h-6 border-[3px] border-ink flex items-center justify-center
                       transition-colors duration-100"
                :class="form.featured ? 'bg-memphis-yellow' : 'bg-warm-white'"
                @click="form.featured = !form.featured"
              >
                <span v-if="form.featured" class="font-bold text-xs">✓</span>
              </button>
              <label class="font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
                @click="form.featured = !form.featured">FEATURED 精选</label>
            </div>

            <!-- Submit button -->
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="saving"
                class="flex-1 py-3.5 border-[3px] border-ink bg-memphis-mint font-mono text-sm font-bold
                       shadow-[5px_5px_0_0_#1A1A1A]
                       hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px]
                       active:shadow-none active:translate-x-[5px] active:translate-y-[5px]
                       transition-[transform,box-shadow] duration-150
                       disabled:opacity-40 disabled:pointer-events-none"
              >
                {{ saving ? '⏳ SAVING...' : (activeTab === 'edit' ? '💾 UPDATE PROJECT' : '🚀 PUBLISH PROJECT') }}
              </button>
              <button
                v-if="activeTab === 'edit'"
                type="button"
                class="px-6 py-3.5 border-[3px] border-ink bg-warm-beige font-mono text-sm font-bold
                       shadow-[5px_5px_0_0_#1A1A1A]
                       hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px]
                       transition-[transform,box-shadow] duration-150"
                @click="cancelEdit"
              >CANCEL</button>
            </div>

            <!-- Save result -->
            <div v-if="saveResult" class="border-[3px] p-4 font-mono text-sm"
              :class="saveResult.ok
                ? 'border-memphis-mint bg-memphis-mint/10 text-ink'
                : 'border-memphis-coral bg-memphis-coral/10 text-memphis-coral'">
              <p>{{ saveResult.ok ? '✅' : '❌' }} {{ saveResult.message }}</p>
              <a v-if="saveResult.commitUrl" :href="saveResult.commitUrl" target="_blank"
                class="text-xs underline mt-1 block">查看 Commit →</a>
            </div>
          </form>
        </div>

        <!-- ── Tab: Manage Projects ── -->
        <div v-if="activeTab === 'manage'">
          <div v-if="loadingProjects" class="py-12 text-center font-mono text-sm text-ink/40">
            Loading...
          </div>
          <div v-else class="space-y-3">
            <!-- Featured 操作结果提示 -->
            <div v-if="featuredResult" class="border-[3px] px-4 py-2 font-mono text-xs"
              :class="featuredResult.ok
                ? 'border-memphis-mint bg-memphis-mint/10 text-ink'
                : 'border-memphis-coral bg-memphis-coral/10 text-memphis-coral'">
              {{ featuredResult.ok ? '✅' : '❌' }} {{ featuredResult.message }}
            </div>

            <div
              v-for="proj in existingProjects"
              :key="proj.id"
              class="flex items-center gap-4 border-[3px] border-ink px-4 py-3 bg-warm-beige
                     shadow-[3px_3px_0_0_#1A1A1A]"
            >
              <!-- Featured 状态指示 -->
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="proj.featured ? 'bg-memphis-yellow border-2 border-ink' : 'bg-ink/20'"
                :title="proj.featured ? 'Featured' : 'Not Featured'"
              ></div>

              <div class="flex-1 min-w-0">
                <div class="font-display font-bold text-sm truncate">
                  {{ typeof proj.title === 'object' ? proj.title.zh : proj.title }}
                </div>
                <div class="font-mono text-[10px] text-ink/40">{{ proj.id }} · {{ proj.date }}</div>
              </div>

              <div class="flex gap-2 flex-shrink-0">
                <!-- ★ Featured 快速切换 -->
                <button
                  :title="proj.featured ? '取消精选' : '设为精选'"
                  :disabled="togglingFeatured === proj.id"
                  class="px-3 py-1.5 border-2 border-ink font-mono text-[10px] transition-colors
                         disabled:opacity-40 disabled:pointer-events-none"
                  :class="proj.featured
                    ? 'bg-memphis-yellow text-ink hover:bg-warm-white'
                    : 'bg-warm-white text-ink/50 hover:bg-memphis-yellow hover:text-ink'"
                  @click="toggleFeatured(proj)"
                >
                  {{ togglingFeatured === proj.id ? '...' : (proj.featured ? '★ ON' : '☆ OFF') }}
                </button>

                <button
                  class="px-3 py-1.5 border-2 border-ink font-mono text-[10px] bg-memphis-yellow
                         hover:shadow-[2px_2px_0_0_#1A1A1A] transition-shadow"
                  @click="editProject(proj)"
                >EDIT</button>
                <button
                  class="px-3 py-1.5 border-2 border-ink font-mono text-[10px] bg-warm-white
                         text-memphis-coral hover:bg-memphis-coral hover:text-warm-white transition-colors"
                  @click="deleteProject(proj.id)"
                >DEL</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { setFeaturedOverride } from '@/api/projectService'

// ── Auth state ──────────────────────────────────────────────────────────────
const authed      = ref(false)
const passwordInput = ref('')
const loginError  = ref('')
const loggingIn   = ref(false)

async function doLogin() {
  loggingIn.value = true
  loginError.value = ''
  try {
    const res = await fetch('/api/verifyAdmin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value }),
    })
    const data = await res.json()
    if (data.ok) {
      authed.value = true
      adminPassword.value = passwordInput.value
      await loadProjects()
    } else {
      loginError.value = data.error || '密码错误'
    }
  } catch {
    loginError.value = '网络错误，请重试'
  } finally {
    loggingIn.value = false
  }
}

// ── Admin state ─────────────────────────────────────────────────────────────
const adminPassword = ref('')
const activeTab = ref<'add' | 'edit' | 'manage'>('add')
const tabs = [
  { key: 'add', label: '+ New Project' },
  { key: 'manage', label: '✎ Manage' },
]

// ── Form ─────────────────────────────────────────────────────────────────────
const form = reactive({
  id: '',
  date: '',
  title_zh: '',
  title_en: '',
  subtitle_zh: '',
  subtitle_en: '',
  desc_zh: '',
  desc_en: '',
  tagsRaw: '',
  cover: '',
  markdown: '',
  featured: false,
})

function clearFormState() {
  form.id = ''
  form.date = ''
  form.title_zh = ''
  form.title_en = ''
  form.subtitle_zh = ''
  form.subtitle_en = ''
  form.desc_zh = ''
  form.desc_en = ''
  form.tagsRaw = ''
  form.cover = ''
  form.markdown = ''
  form.featured = false
  saveResult.value = null
}

const saving = ref(false)
const saveResult = ref<{ ok: boolean; message: string; commitUrl?: string } | null>(null)

// ── Projects management ──────────────────────────────────────────────────────
const existingProjects = ref<any[]>([])
const loadingProjects = ref(false)

async function loadProjects() {
  loadingProjects.value = true
  try {
    const res = await fetch('/data/projects.json')
    existingProjects.value = await res.json()
  } catch {
    existingProjects.value = []
  } finally {
    loadingProjects.value = false
  }
}

// ── Featured 实时切换 ──────────────────────────────────────────────────────────
const togglingFeatured = ref<string | null>(null)
const featuredResult = ref<{ ok: boolean; message: string } | null>(null)
let featuredResultTimer: ReturnType<typeof setTimeout> | null = null

async function toggleFeatured(proj: any) {
  togglingFeatured.value = proj.id
  featuredResult.value = null

  const newFeatured = !proj.featured

  // 1. 立即更新 localStorage（实时生效）
  setFeaturedOverride(proj.id, newFeatured)

  // 2. 乐观更新本地列表
  const updatedProjects = existingProjects.value.map(p =>
    p.id === proj.id ? { ...p, featured: newFeatured } : p
  )
  existingProjects.value = updatedProjects

  // 3. 异步提交 GitHub（持久化到仓库，供 Vercel 重建后其他访客可见）
  try {
    const res = await fetch('/api/saveData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: adminPassword.value,
        filePath: 'public/data/projects.json',
        content: updatedProjects,
        commitMessage: `feat: toggle featured for ${proj.id} → ${newFeatured}`,
      }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)

    featuredResult.value = {
      ok: true,
      message: `✓「${typeof proj.title === 'object' ? proj.title.zh : proj.title}」已${newFeatured ? '设为' : '取消'}精选（实时生效 + 已同步仓库）`,
    }
  } catch (err: any) {
    // localStorage 已更新，仅提示 GitHub 同步失败
    featuredResult.value = {
      ok: true,
      message: `✓「${typeof proj.title === 'object' ? proj.title.zh : proj.title}」已${newFeatured ? '设为' : '取消'}精选（本地生效，GitHub 同步失败）`,
    }
  } finally {
    togglingFeatured.value = null
    if (featuredResultTimer) clearTimeout(featuredResultTimer)
    featuredResultTimer = setTimeout(() => { featuredResult.value = null }, 3000)
  }
}

// ── Submit / Save ────────────────────────────────────────────────────────────
async function submitProject() {
  saving.value = true
  saveResult.value = null

  const tags = form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)

  const newEntry: any = {
    id: form.id,
    title: { zh: form.title_zh, en: form.title_en },
    subtitle: { zh: form.subtitle_zh, en: form.subtitle_en },
    description: { zh: form.desc_zh, en: form.desc_en },
    tags,
    cover: form.cover || `/assets/covers/${form.id}.png`,
    content_type: 'markdown',
    content_path: `/data/content/${form.id}.md`,
    featured: form.featured,
    date: form.date,
    media: [],
    external_links: [],
  }

  let updatedProjects: any[]
  if (activeTab.value === 'edit') {
    updatedProjects = existingProjects.value.map(p => p.id === form.id ? newEntry : p)
  } else {
    // Remove existing with same id (upsert)
    updatedProjects = [
      ...existingProjects.value.filter(p => p.id !== form.id),
      newEntry,
    ]
  }

  try {
    // 1. Write projects.json
    const r1 = await fetch('/api/saveData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: adminPassword.value,
        filePath: 'public/data/projects.json',
        content: updatedProjects,
        commitMessage: `feat: ${activeTab.value === 'edit' ? 'update' : 'add'} project ${form.id}`,
      }),
    })
    const d1 = await r1.json()
    if (!d1.success) throw new Error(d1.error)

    // 2. Write markdown content (if provided)
    if (form.markdown.trim()) {
      const r2 = await fetch('/api/saveData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword.value,
          filePath: `public/data/content/${form.id}.md`,
          content: form.markdown,
          commitMessage: `docs: update ${form.id}.md`,
        }),
      })
      const d2 = await r2.json()
      if (!d2.success) throw new Error(d2.error)
      saveResult.value = {
        ok: true,
        message: '项目与内容已写入仓库，Vercel 将自动重建！',
        commitUrl: d2.commitUrl,
      }
    } else {
      saveResult.value = {
        ok: true,
        message: '项目 JSON 已写入仓库，Vercel 将自动重建！',
        commitUrl: d1.commitUrl,
      }
    }

    existingProjects.value = updatedProjects
    if (activeTab.value !== 'edit') clearFormState()
  } catch (err: any) {
    saveResult.value = { ok: false, message: err.message || '保存失败' }
  } finally {
    saving.value = false
  }
}

// ── Edit / Delete ─────────────────────────────────────────────────────────────
function editProject(proj: any) {
  activeTab.value = 'edit'
  const t = proj.title
  const s = proj.subtitle
  const d = proj.description
  form.id = proj.id
  form.date = proj.date ?? ''
  form.title_zh = typeof t === 'object' ? t.zh : t
  form.title_en = typeof t === 'object' ? t.en : t
  form.subtitle_zh = typeof s === 'object' ? s.zh : (s ?? '')
  form.subtitle_en = typeof s === 'object' ? s.en : (s ?? '')
  form.desc_zh = typeof d === 'object' ? d.zh : d
  form.desc_en = typeof d === 'object' ? d.en : d
  form.tagsRaw = (proj.tags ?? []).join(', ')
  form.cover = proj.cover ?? ''
  form.featured = proj.featured ?? false
  form.markdown = ''
  saveResult.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  activeTab.value = 'manage'
  clearFormState()
}

async function deleteProject(id: string) {
  if (!confirm(`确定删除项目「${id}」？此操作将直接写入 GitHub！`)) return
  const updated = existingProjects.value.filter(p => p.id !== id)
  saving.value = true
  try {
    const res = await fetch('/api/saveData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: adminPassword.value,
        filePath: 'public/data/projects.json',
        content: updated,
        commitMessage: `chore: remove project ${id}`,
      }),
    })
    const data = await res.json()
    if (data.success) {
      existingProjects.value = updated
    } else {
      alert('删除失败：' + data.error)
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  // Note: saveData with markdown needs special handling — content is a string not JSON
  // We override the standard JSON stringify in saveData.js for .md files
})
</script>

<style scoped>
/* Admin input base styles (PurgeCSS safe via @apply equivalent) */
.admin-label {
  @apply block font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2;
}
.admin-input {
  @apply w-full border-[3px] border-ink bg-warm-white px-4 py-2.5
         font-sans text-sm text-ink placeholder-ink/30
         focus:outline-none focus:shadow-[4px_4px_0_0_#2979FF]
         transition-shadow duration-150;
}
</style>
