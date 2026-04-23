import { ref } from 'vue'

const STORAGE_KEY = 'corealis_auth'

/** 全局管理员/Pro 状态（口令解锁后持久化到 localStorage，刷新不丢失） */
const isAdmin = ref(localStorage.getItem(STORAGE_KEY) === '1')

function unlockAdmin() {
  isAdmin.value = true
  localStorage.setItem(STORAGE_KEY, '1')
}

function revokeAdmin() {
  isAdmin.value = false
  localStorage.removeItem(STORAGE_KEY)
}

export function useAdmin() {
  return { isAdmin, unlockAdmin, revokeAdmin }
}
