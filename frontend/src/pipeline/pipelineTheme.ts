export type PipelineColorMode = 'dark' | 'light';

export interface PipelineTheme {
  bgMain: string;
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
  nodePendingBg: string;
  nodePendingBorder: string;
  nodePendingText: string;
  nodeInProgressBg: string;
  nodeInProgressBorder: string;
  nodeInProgressText: string;
  nodeDoneBg: string;
  nodeDoneBorder: string;
  nodeDoneText: string;
  edgeColor: string;
  overlayBg: string;
}

export const darkTheme: PipelineTheme = {
  bgMain:       '#131e32',
  bgSurface:    '#1a2540',
  bgCard:       '#1e2d48',
  bgInput:      '#1e2d48',
  border:       '#2c3d5c',
  textPrimary:  '#e2e8f0',
  textSecondary:'#94a3b8',
  textMuted:    '#64748b',
  accent:       '#6366f1',
  accentText:   '#818cf8',
  danger:       '#ef4444',
  nodePendingBg:     '#1e2b42',
  nodePendingBorder: '#3a4f72',
  nodePendingText:   '#94a3b8',
  nodeInProgressBg:     '#152d58',
  nodeInProgressBorder: '#3b82f6',
  nodeInProgressText:   '#93c5fd',
  nodeDoneBg:     '#0f3528',
  nodeDoneBorder: '#10b981',
  nodeDoneText:   '#6ee7b7',
  edgeColor:  '#3a4f72',
  overlayBg:  'rgba(26,37,64,0.92)',
};

export const lightTheme: PipelineTheme = {
  bgMain:       '#eef2fb',
  bgSurface:    '#ffffff',
  bgCard:       '#f6f8ff',
  bgInput:      '#eef2fb',
  border:       '#d0d9f0',
  textPrimary:  '#1e293b',
  textSecondary:'#475569',
  textMuted:    '#64748b',
  accent:       '#6366f1',
  accentText:   '#4f46e5',
  danger:       '#dc2626',
  nodePendingBg:     '#eef2fb',
  nodePendingBorder: '#b0bfe8',
  nodePendingText:   '#475569',
  nodeInProgressBg:     '#eff6ff',
  nodeInProgressBorder: '#3b82f6',
  nodeInProgressText:   '#1d4ed8',
  nodeDoneBg:     '#f0fdf4',
  nodeDoneBorder: '#10b981',
  nodeDoneText:   '#065f46',
  edgeColor:  '#b0bfe8',
  overlayBg:  'rgba(238,242,251,0.95)',
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
