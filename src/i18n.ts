import { createI18n } from 'vue-i18n'
import zh from './locales/zh'
import en from './locales/en'

export type Locale = 'zh' | 'en'

const saved = (localStorage.getItem('locale') ?? 'zh') as Locale

export const i18n = createI18n({
  legacy: false,          // use Composition API mode
  locale: saved,
  fallbackLocale: 'zh',
  messages: { zh, en },
})

export function toggleLocale() {
  const current = i18n.global.locale.value as Locale
  const next: Locale = current === 'zh' ? 'en' : 'zh'
  i18n.global.locale.value = next
  localStorage.setItem('locale', next)
}
