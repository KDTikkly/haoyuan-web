export type BrushTool = 'pencil' | 'marker' | 'highlighter' | 'eraser'

export const BRUSH_META: Record<BrushTool, { label: string; icon: string; hex: string }> = {
  pencil:      { label: 'PENCIL',      icon: '✏', hex: '#1A1A1A' },
  marker:      { label: 'MARKER',      icon: '🖊', hex: '#1A1A1A' },
  highlighter: { label: 'HIGHLIGHT',   icon: '✦', hex: '#FFD600' },
  eraser:      { label: 'ERASER',      icon: '⌫', hex: '#FAF8F5' },
}
