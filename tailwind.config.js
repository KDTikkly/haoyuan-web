/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Memphis + Claude palette
        'warm-white': '#FAF8F5',
        'warm-beige': '#F5F0E8',
        'ink': '#1A1A1A',
        'ink-light': '#3A3A3A',
        // Memphis accent colors
        'memphis-yellow': '#FFD600',
        'memphis-blue': '#2979FF',
        'memphis-coral': '#FF6B6B',
        'memphis-mint': '#00E5A0',
        'memphis-pink': '#FF4081',
        'memphis-purple': '#7C4DFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        // Hard offset shadows — Memphis core
        'hard-sm': '3px 3px 0 0 #1A1A1A',
        'hard': '5px 5px 0 0 #1A1A1A',
        'hard-lg': '8px 8px 0 0 #1A1A1A',
        'hard-xl': '12px 12px 0 0 #1A1A1A',
        'hard-yellow': '5px 5px 0 0 #FFD600',
        'hard-blue': '5px 5px 0 0 #2979FF',
        'hard-coral': '5px 5px 0 0 #FF6B6B',
        'hard-mint': '5px 5px 0 0 #00E5A0',
      },
      borderWidth: {
        '3': '3px',
      },
    }
  },
  plugins: []
}
