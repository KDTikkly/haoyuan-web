import { ref } from 'vue'

// 全局单例：画板"连续清空 3 次"彩蛋
const _show = ref(false)

export function useEasterEgg2() {
  function triggerEasterEgg2() {
    _show.value = true
  }
  function closeEasterEgg2() {
    _show.value = false
  }
  return { showEasterEgg2: _show, triggerEasterEgg2, closeEasterEgg2 }
}
