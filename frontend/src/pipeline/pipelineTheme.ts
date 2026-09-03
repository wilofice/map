export type PipelineColorMode = 'dark' | 'light';

export interface PipelineTheme {
  bgMain: string;
  bgCanvas: string;        // canvas area background (gradient + pattern)
  bgSurface: string;
  bgCard: string;
  bgInput: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  danger: string;
  // Cytoscape node colors
  nodePendingBgTop: string;
  nodePendingBg: string;
  nodePendingBorder: string;
  nodePendingText: string;
  nodeInProgressBgTop: string;
  nodeInProgressBg: string;
  nodeInProgressBorder: string;
  nodeInProgressText: string;
  nodeDoneBgTop: string;
  nodeDoneBg: string;
  nodeDoneBorder: string;
  nodeDoneText: string;
  edgeColor: string;
  overlayBg: string;
}

export const darkTheme: PipelineTheme = {
  bgMain:       '#111318',
  bgCanvas: 'radial-gradient(circle, rgba(148,163,184,0.14) 1.5px, transparent 1.5px)',
  bgSurface:    '#1a1c24',
  bgCard:       '#20222e',
  bgInput:      '#20222e',
  border:       '#2e3040',
  textPrimary:  '#e2e8f0',
  textSecondary:'#94a3b8',
  textMuted:    '#64748b',
  accent:       '#6366f1',
  accentText:   '#818cf8',
  danger:       '#ef4444',
  nodePendingBgTop:  '#2b2f3a',
  nodePendingBg:     '#252830',
  nodePendingBorder: '#52586a',
  nodePendingText:   '#c8cdd8',
  nodeInProgressBgTop:  '#2b2f3a',
  nodeInProgressBg:     '#252830',
  nodeInProgressBorder: '#3b82f6',
  nodeInProgressText:   '#93c5fd',
  nodeDoneBgTop:  '#2b2f3a',
  nodeDoneBg:     '#252830',
  nodeDoneBorder: '#10b981',
  nodeDoneText:   '#6ee7b7',
  edgeColor:  '#383b4a',
  overlayBg:  'rgba(17,19,24,0.92)',
};

export const lightTheme: PipelineTheme = {
  bgMain:       '#ffffff',
  bgCanvas: 'radial-gradient(circle, rgba(156,163,175,0.55) 1.5px, transparent 1.5px)',
  bgSurface:    '#f8f9fa',
  bgCard:       '#ffffff',
  bgInput:      '#f1f3f5',
  border:       '#e2e5ec',
  textPrimary:  '#111827',
  textSecondary:'#374151',
  textMuted:    '#6b7280',
  accent:       '#6366f1',
  accentText:   '#4f46e5',
  danger:       '#dc2626',
  nodePendingBgTop:  '#ffffff',
  nodePendingBg:     '#f4f5f7',
  nodePendingBorder: '#9ca3af',
  nodePendingText:   '#111827',
  nodeInProgressBgTop:  '#ffffff',
  nodeInProgressBg:     '#f4f5f7',
  nodeInProgressBorder: '#3b82f6',
  nodeInProgressText:   '#1d4ed8',
  nodeDoneBgTop:  '#ffffff',
  nodeDoneBg:     '#f4f5f7',
  nodeDoneBorder: '#10b981',
  nodeDoneText:   '#065f46',
  edgeColor:  '#d1d5db',
  overlayBg:  'rgba(255,255,255,0.92)',
};

export function getTheme(mode: PipelineColorMode): PipelineTheme {
  return mode === 'light' ? lightTheme : darkTheme;
}

const STORAGE_KEY = 'pipeline_color_mode';

export function loadColorMode(): PipelineColorMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* */ }
  return 'dark';
}

export function saveColorMode(mode: PipelineColorMode) {
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* */ }
}
