<template>
  <!-- ZZZ — 黑黄警示斜条纹 -->
  <div v-if="gameId === 'zenless-zone-zero'" class="zzz-cover absolute inset-0">
    <!-- 底色 + 条纹叠加 -->
    <div class="absolute inset-0 zzz-stripe"></div>
    <!-- 左上角大实心黑三角装饰 -->
    <div class="absolute top-0 left-0 zzz-triangle"></div>
    <!-- 右下角 WARNING 文字装饰 -->
    <span class="absolute bottom-3 right-3 font-mono font-black text-[10px] text-black/60 tracking-[0.3em] uppercase select-none">
      DANGER ZONE
    </span>
    <!-- 游戏名缩写装饰 -->
    <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                 font-display font-black text-[56px] text-black/15 select-none leading-none tracking-tight">
      ZZZ
    </span>
  </div>

  <!-- HI3 — 蓝底空心圆环 -->
  <div v-else-if="gameId === 'honkai-impact-3rd'" class="hi3-cover absolute inset-0">
    <div class="absolute inset-0" style="background: #2979FF;"></div>
    <!-- 大圆环 -->
    <div class="absolute hi3-ring-lg"></div>
    <!-- 中圆环 -->
    <div class="absolute hi3-ring-md"></div>
    <!-- 小圆环 右上 -->
    <div class="absolute hi3-ring-sm"></div>
    <!-- 横向扫描线装饰 -->
    <div class="absolute inset-0 hi3-scanlines pointer-events-none"></div>
    <!-- 游戏名缩写装饰 -->
    <span class="absolute bottom-3 right-3 font-mono font-black text-[10px] text-white/50 tracking-[0.25em] uppercase select-none">
      HI3
    </span>
  </div>

  <!-- Wuthering Waves — 浅灰底三角形 -->
  <div v-else-if="gameId === 'wuthering-waves'" class="wuwa-cover absolute inset-0">
    <div class="absolute inset-0" style="background: #F0EEE8;"></div>
    <!-- 三角形群 -->
    <div class="absolute wuwa-tri-1"></div>
    <div class="absolute wuwa-tri-2"></div>
    <div class="absolute wuwa-tri-3"></div>
    <div class="absolute wuwa-tri-4"></div>
    <!-- 细格线背景 -->
    <div class="absolute inset-0 wuwa-grid pointer-events-none"></div>
    <!-- 游戏名装饰 -->
    <span class="absolute bottom-3 right-3 font-mono font-black text-[10px] tracking-[0.25em] uppercase select-none"
          style="color: #3DD68C66;">WUWA</span>
  </div>

  <!-- HSR — 深底亮紫波浪+方块 -->
  <div v-else-if="gameId === 'honkai-star-rail'" class="hsr-cover absolute inset-0">
    <div class="absolute inset-0" style="background: #0D0D1A;"></div>
    <!-- 满天星点 -->
    <div class="absolute hsr-star s1"></div>
    <div class="absolute hsr-star s2"></div>
    <div class="absolute hsr-star s3"></div>
    <div class="absolute hsr-star s4"></div>
    <div class="absolute hsr-star s5"></div>
    <div class="absolute hsr-star s6"></div>
    <!-- 亮色浮动方块 -->
    <div class="absolute hsr-box b1"></div>
    <div class="absolute hsr-box b2"></div>
    <div class="absolute hsr-box b3"></div>
    <!-- SVG 波浪线 -->
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 320 176" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-20 60 Q40 30 80 60 Q120 90 160 60 Q200 30 240 60 Q280 90 340 60"
            fill="none" stroke="#A78BFA" stroke-width="2.5" opacity="0.7"/>
      <path d="M-20 100 Q40 70 80 100 Q120 130 160 100 Q200 70 240 100 Q280 130 340 100"
            fill="none" stroke="#7C3AED" stroke-width="1.5" opacity="0.5"/>
      <path d="M-20 130 Q60 110 100 130 Q140 150 180 130 Q220 110 260 130 Q300 150 340 130"
            fill="none" stroke="#C4B5FD" stroke-width="1" opacity="0.35"/>
    </svg>
    <!-- 游戏名装饰 -->
    <span class="absolute bottom-3 right-3 font-mono font-black text-[10px] tracking-[0.25em] uppercase select-none"
          style="color: #A78BFAaa;">HSR</span>
  </div>

  <!-- Fallback — 通用 accent 色块 -->
  <div v-else class="absolute inset-0 flex items-center justify-center"
       :style="{ background: '#cccccc' }">
    <span class="font-display font-black text-4xl text-black/20 select-none uppercase">{{ gameId }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ gameId: string }>()
</script>

<style scoped>
/* ═══════════════════════════════════════
   ZZZ — 黑黄斜条纹
═══════════════════════════════════════ */
.zzz-stripe {
  background-color: #FFD600;
  background-image: repeating-linear-gradient(
    45deg,
    #1A1A1A 0px,
    #1A1A1A 12px,
    transparent 12px,
    transparent 26px
  );
}

.zzz-triangle {
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 72px 72px 0 0;
  border-color: #1A1A1A transparent transparent transparent;
}

/* ═══════════════════════════════════════
   HI3 — 蓝底空心圆环
═══════════════════════════════════════ */
.hi3-ring-lg {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.5);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.12);
}

.hi3-ring-md {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.75);
  bottom: 12px;
  left: 18px;
  box-shadow: 4px 4px 0 0 #1A1A1A;
}

.hi3-ring-sm {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid #FFD600;
  top: 14px;
  right: 24px;
  box-shadow: 3px 3px 0 0 #1A1A1A;
}

.hi3-scanlines {
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.06) 3px,
    rgba(0, 0, 0, 0.06) 4px
  );
}

/* ═══════════════════════════════════════
   Wuthering Waves — 浅灰底三角
═══════════════════════════════════════ */
.wuwa-grid {
  background-image:
    linear-gradient(rgba(26,26,26,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(26,26,26,0.07) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* CSS 三角形用 border trick */
.wuwa-tri-1 {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 40px 70px 40px;
  border-color: transparent transparent #3DD68C transparent;
  top: 16px;
  left: 28px;
  filter: drop-shadow(3px 3px 0 #1A1A1A);
}

.wuwa-tri-2 {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 50px 28px 0 28px;
  border-color: #1A1A1A transparent transparent transparent;
  top: 18px;
  right: 36px;
  opacity: 0.18;
}

.wuwa-tri-3 {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 22px 38px 22px;
  border-color: transparent transparent #3DD68C transparent;
  bottom: 20px;
  right: 60px;
  opacity: 0.55;
  filter: drop-shadow(2px 2px 0 #1A1A1A);
}

.wuwa-tri-4 {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 32px 18px 0 18px;
  border-color: #1A1A1A transparent transparent transparent;
  bottom: 28px;
  left: 52px;
  opacity: 0.12;
}

/* ═══════════════════════════════════════
   HSR — 深底星点 + 亮色方块
═══════════════════════════════════════ */
.hsr-star {
  width: 3px;
  height: 3px;
  background: #fff;
  border-radius: 50%;
}
.hsr-star.s1 { top: 18px; left: 22px;  opacity: 0.9; }
.hsr-star.s2 { top: 35px; left: 88px;  opacity: 0.6; width: 2px; height: 2px; }
.hsr-star.s3 { top: 14px; right: 50px; opacity: 0.8; }
.hsr-star.s4 { top: 55px; left: 140px; opacity: 0.5; width: 2px; height: 2px; }
.hsr-star.s5 { top: 28px; right: 80px; opacity: 0.7; }
.hsr-star.s6 { top: 70px; left: 200px; opacity: 0.4; width: 4px; height: 4px; border-radius: 50%; }

.hsr-box {
  border: 3px solid;
}
.hsr-box.b1 {
  width: 30px;
  height: 30px;
  border-color: #A78BFA;
  top: 20px;
  left: 30px;
  box-shadow: 3px 3px 0 0 #7C3AED;
  background: transparent;
  transform: rotate(15deg);
}
.hsr-box.b2 {
  width: 18px;
  height: 18px;
  border-color: #FFD600;
  bottom: 28px;
  left: 55px;
  box-shadow: 2px 2px 0 0 #B8960A;
  background: transparent;
  transform: rotate(-8deg);
}
.hsr-box.b3 {
  width: 22px;
  height: 22px;
  border-color: #C4B5FD;
  top: 30px;
  right: 40px;
  box-shadow: 3px 3px 0 0 #7C3AED;
  background: #A78BFA22;
  transform: rotate(25deg);
}
</style>
