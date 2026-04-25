import { ref, computed } from 'vue'

const deepOverlayCount = ref(0)

export function useDeepOverlay() {
  function enterDeepOverlay() {
    deepOverlayCount.value++
  }
  function leaveDeepOverlay() {
    deepOverlayCount.value = Math.max(0, deepOverlayCount.value - 1)
  }
  const isDeepOverlayOpen = computed(() => deepOverlayCount.value > 0)

  return { isDeepOverlayOpen, enterDeepOverlay, leaveDeepOverlay }
}
