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
  bgMain:       '#0f1724',
  bgCanvas: [
    'radial-gradient(ellipse at 50% 20%, rgba(99,102,241,0.08) 0%, transparent 60%)',
    'radial-gradient(circle, rgba(148,163,184,0.10) 1px, transparent 1px)',
  ].join(', '),
  bgSurface:    '#151f33',
  bgCard:       '#1e2d48',
  bgInput:      '#1e2d48',
  border:       '#2c3d5c',
  textPrimary:  '#e2e8f0',
  textSecondary:'#94a3b8',
  textMuted:    '#64748b',
  accent:       '#6366f1',
  accentText:   '#818cf8',
  danger:       '#ef4444',
  nodePendingBgTop:  '#253553',
  nodePendingBg:     '#192840',
  nodePendingBorder: '#4a6490',
  nodePendingText:   '#a8bdd6',
  nodeInProgressBgTop:  '#1a3d72',
  nodeInProgressBg:     '#0f2855',
  nodeInProgressBorder: '#3b82f6',
  nodeInProgressText:   '#93c5fd',
  nodeDoneBgTop:  '#14493a',
  nodeDoneBg:     '#0b3328',
  nodeDoneBorder: '#10b981',
  nodeDoneText:   '#6ee7b7',
  edgeColor:  '#3a4f72',
  overlayBg:  'rgba(26,37,64,0.92)',
};

export const lightTheme: PipelineTheme = {
  bgMain:       '#eef2fb',
  bgCanvas: [
    'radial-gradient(ellipse at 50% 20%, rgba(99,102,241,0.06) 0%, transparent 60%)',
    'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)',
  ].join(', '),
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
  nodePendingBgTop:  '#ffffff',
  nodePendingBg:     '#eef2fb',
  nodePendingBorder: '#99aed8',
  nodePendingText:   '#334155',
  nodeInProgressBgTop:  '#dbeafe',
  nodeInProgressBg:     '#eff6ff',
  nodeInProgressBorder: '#3b82f6',
  nodeInProgressText:   '#1d4ed8',
  nodeDoneBgTop:  '#dcfce7',
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
