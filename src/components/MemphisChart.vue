<template>
  <!--
    MemphisChart.vue
    Memphis × Brutalist 风格 ECharts 图表封装
    · 纯色块填充，3px 黑色描边，无背景网格
    · 滚动进入视口触发渲染动画
    · 支持 bar / line / pie / scatter 类型
  -->
  <div
    ref="containerRef"
    class="border-[3px] border-ink bg-warm-beige shadow-[5px_5px_0_0_#1A1A1A] overflow-hidden"
  >
    <!-- Header -->
    <div v-if="title" class="flex items-center gap-3 px-4 py-3 border-b-[3px] border-ink bg-ink">
      <div class="w-3 h-3 rotate-45 border-2 border-warm-white/60" :style="{ background: accentColor }"></div>
      <span class="font-display font-bold text-sm text-warm-white">{{ title }}</span>
      <span v-if="subtitle" class="ml-auto font-mono text-[10px] text-warm-white/40">{{ subtitle }}</span>
    </div>

    <!-- Chart area -->
    <div ref="chartEl" :style="{ height: height + 'px' }" class="w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
// Dynamic import to keep bundle lean — ECharts is large
// Run: npm install echarts
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, DataZoomComponent,
  CanvasRenderer,
])

// ── Memphis Palette ────────────────────────────────────────────────────────────
const MEMPHIS_COLORS = ['#FFD600', '#2979FF', '#FF6B6B', '#00E5A0', '#FF4081', '#7C4DFF', '#1A1A1A']
const INK = '#1A1A1A'

// ── Memphis base option factory ────────────────────────────────────────────────
function buildBaseOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    color: MEMPHIS_COLORS,
    textStyle: { fontFamily: '"JetBrains Mono", monospace', color: INK },
    grid: {
      top: 16, right: 24, bottom: 40, left: 56,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: INK, width: 3 } },
      axisTick: { lineStyle: { color: INK, width: 2 } },
      axisLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: INK },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: true, lineStyle: { color: INK, width: 3 } },
      axisTick: { show: true, lineStyle: { color: INK, width: 2 } },
      axisLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: INK },
      splitLine: { show: false },  // 不要网格线 — Memphis 纯粹感
    },
    tooltip: {
      backgroundColor: INK,
      borderColor: INK,
      borderWidth: 3,
      textStyle: { color: '#FAF8F5', fontFamily: '"JetBrains Mono", monospace', fontSize: 11 },
      extraCssText: 'box-shadow: 4px 4px 0 0 rgba(0,0,0,0.3); border-radius: 0;',
    },
    legend: {
      textStyle: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: INK },
      itemWidth: 14,
      itemHeight: 14,
      icon: 'rect',
    },
  }
}

// ── Bar series decorator ───────────────────────────────────────────────────────
function decorateBarSeries(series: any[]): any[] {
  return series.map((s, i) => ({
    type: 'bar',
    barMaxWidth: 60,
    itemStyle: {
      color: MEMPHIS_COLORS[i % MEMPHIS_COLORS.length],
      borderColor: INK,
      borderWidth: 3,
    },
    emphasis: {
      itemStyle: {
        color: MEMPHIS_COLORS[i % MEMPHIS_COLORS.length],
        borderColor: INK,
        borderWidth: 3,
        shadowBlur: 0,
        shadowOffsetX: 4,
        shadowOffsetY: 4,
        shadowColor: INK,
      },
    },
    ...s,
  }))
}

// ── Line series decorator ──────────────────────────────────────────────────────
function decorateLineSeries(series: any[]): any[] {
  return series.map((s, i) => ({
    type: 'line',
    symbol: 'rect',
    symbolSize: 10,
    lineStyle: {
      color: MEMPHIS_COLORS[i % MEMPHIS_COLORS.length],
      width: 3,
    },
    itemStyle: {
      color: MEMPHIS_COLORS[i % MEMPHIS_COLORS.length],
      borderColor: INK,
      borderWidth: 2,
    },
    areaStyle: s.area
      ? { color: MEMPHIS_COLORS[i % MEMPHIS_COLORS.length] + '22', origin: 'auto' }
      : undefined,
    ...s,
  }))
}

// ── Pie series decorator ───────────────────────────────────────────────────────
function decoratePieSeries(series: any[]): any[] {
  return series.map(s => ({
    type: 'pie',
    radius: ['35%', '65%'],
    label: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 10,
      color: INK,
      formatter: '{b}: {d}%',
    },
    itemStyle: {
      borderColor: INK,
      borderWidth: 3,
    },
    data: (s.data ?? []).map((d: any, i: number) => ({
      ...d,
      itemStyle: { color: MEMPHIS_COLORS[i % MEMPHIS_COLORS.length] },
    })),
    ...s,
  }))
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  type?: 'bar' | 'line' | 'pie' | 'scatter'
  option: Record<string, any>   // Raw ECharts option (partial, gets merged)
  title?: string
  subtitle?: string
  height?: number
  accentColor?: string
  animate?: boolean             // Trigger on scroll-into-view
}

const props = withDefaults(defineProps<Props>(), {
  type: 'bar',
  height: 300,
  accentColor: '#FFD600',
  animate: true,
})

// ── Setup ──────────────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const chartEl = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let observer: IntersectionObserver | null = null
let rendered = false

function buildOption(): echarts.EChartsOption {
  const base = buildBaseOption()
  const userOption = { ...props.option }

  // Decorate series based on type
  if (Array.isArray(userOption.series)) {
    if (props.type === 'bar') {
      userOption.series = decorateBarSeries(userOption.series)
    } else if (props.type === 'line') {
      userOption.series = decorateLineSeries(userOption.series)
    } else if (props.type === 'pie') {
      userOption.series = decoratePieSeries(userOption.series)
      // Pie needs no axes
      delete base.xAxis
      delete base.yAxis
      delete (base as any).grid
    }
  }

  return echarts.util.merge(base, userOption, true) as echarts.EChartsOption
}

function initChart() {
  if (!chartEl.value || rendered) return
  rendered = true
  chart = echarts.init(chartEl.value, undefined, { renderer: 'canvas' })
  chart.setOption(buildOption())
  window.addEventListener('resize', () => chart?.resize())
}

onMounted(() => {
  if (!props.animate) {
    nextTick(initChart)
    return
  }
  // Observe scroll
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        nextTick(initChart)
        observer?.disconnect()
      }
    },
    { threshold: 0.2 }
  )
  if (containerRef.value) observer.observe(containerRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
  chart?.dispose()
  window.removeEventListener('resize', () => chart?.resize())
})

watch(() => props.option, () => {
  chart?.setOption(buildOption(), true)
}, { deep: true })
</script>
