<template>
  <!-- Memphis geometric placeholder for cards without cover images -->
  <svg
    viewBox="0 0 320 180"
    xmlns="http://www.w3.org/2000/svg"
    class="w-full h-full"
    aria-hidden="true"
  >
    <!-- Background -->
    <rect width="320" height="180" fill="#F5F0E8" />

    <!-- Grid dots -->
    <g fill="#1A1A1A" opacity="0.12">
      <circle v-for="(dot, i) in dots" :key="i" :cx="dot.x" :cy="dot.y" r="2" />
    </g>

    <!-- Memphis shapes -->
    <!-- Large circle outline -->
    <circle cx="260" cy="40" r="50" fill="none" :stroke="color" stroke-width="3" opacity="0.6" />
    <!-- Filled half-circle -->
    <path d="M40,140 A40,40 0 0,1 120,140 Z" :fill="color" opacity="0.8" />
    <!-- Triangle outline -->
    <polygon points="160,30 200,100 120,100" fill="none" stroke="#1A1A1A" stroke-width="2.5" />
    <!-- Wave line -->
    <path
      d="M10,80 Q40,55 70,80 Q100,105 130,80 Q160,55 190,80 Q220,105 250,80 Q280,55 310,80"
      fill="none" stroke="#1A1A1A" stroke-width="2.5"
    />
    <!-- Small filled circle -->
    <circle cx="200" cy="150" r="16" fill="#1A1A1A" />
    <!-- Accent square -->
    <rect x="50" y="30" width="30" height="30" :fill="color" stroke="#1A1A1A" stroke-width="2" />
    <!-- Cross / plus -->
    <line x1="270" y1="120" x2="270" y2="170" stroke="#1A1A1A" stroke-width="2.5" />
    <line x1="245" y1="145" x2="295" y2="145" stroke="#1A1A1A" stroke-width="2.5" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  color: { type: String, default: '#FFD600' }
})

// Generate dot grid
const dots = computed(() => {
  const d = []
  for (let x = 20; x <= 300; x += 40) {
    for (let y = 20; y <= 160; y += 40) {
      d.push({ x, y })
    }
  }
  return d
})
</script>
