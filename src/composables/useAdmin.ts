import { ref } from 'vue'

/** 全局管理员/Pro 状态（口令解锁后持久化到 sessionStorage） */
const isAdmin = ref(sessionStorage.getItem('corealis_auth') === '1')

function unlockAdmin() {
  isAdmin.value = true
  sessionStorage.setItem('corealis_auth', '1')
}

function revokeAdmin() {
  isAdmin.value = false
  sessionStorage.removeItem('corealis_auth')
}

export function useAdmin() {
  return { isAdmin, unlockAdmin, revokeAdmin }
}
