export type ThemeKey = 'ibm' | 'dusk' | 'light';

export type BgVariant = 'dots' | 'lines' | 'cross';

export interface AppTheme {
  canvas: string;
  bgDots: string;
  bgVariant: BgVariant;
  shell: string;
  surface: string;
  border: string;
  card: string;
  cardBorder: string;
  handle: string;
  selectionRing: string;
  textPrimary: string;
  textMuted: string;
  // UI chrome tokens (toolbar, sidebar, header)
  textUI: string;
  textHeading: string;
  textSecondary: string;
  bgHover: string;
  bgAccent: string;
  progressTrack: string;
  // Node card shadows
  shadowCard: string;
  shadowRoot: string;
  // Edge colors by depth level [depth-1, depth-2, depth-3+]
  edgeColors: [string, string, string];
}

export const themes: Record<ThemeKey, AppTheme> = {
  ibm: {
    canvas: '#111111',
    bgDots: '#2d2d2d',
    bgVariant: 'dots',
    shell: '#111111',
    surface: '#161616',
    border: '#2a2a2a',
    card: '#1e1e1e',
    cardBorder: '#333333',
    handle: '#525252',
    selectionRing: '#4589ff',
    textPrimary: '#e8e8e8',
    textMuted: '#6f6f6f',
    textUI: '#8d8d8d',
    textHeading: '#e8e8e8',
    textSecondary: '#c6c6c6',
    bgHover: 'rgba(244,244,244,0.08)',
    bgAccent: '#0f62fe',
    progressTrack: '#2a2a2a',
    shadowCard: '0 1px 4px rgba(0,0,0,0.3)',
    shadowRoot: '0 2px 8px rgba(0,0,0,0.4)',
    edgeColors: ['rgba(69,137,255,0.6)', 'rgba(50,175,220,0.5)', 'rgba(139,106,240,0.45)'],
  },
  dusk: {
    canvas: '#1a1b27',
    bgDots: '#252645',
    bgVariant: 'lines',
    shell: '#13142a',
    surface: '#1e2038',
    border: '#30325a',
    card: '#282a40',
    cardBorder: '#383a5a',
    handle: '#39c759',
    selectionRing: '#6c5fff',
    textPrimary: '#e0e2f8',
    textMuted: '#7272a8',
    textUI: '#7272a8',
    textHeading: '#e0e2f8',
    textSecondary: '#9090c0',
    bgHover: 'rgba(255,255,255,0.05)',
    bgAccent: '#4a3fff',
    progressTrack: '#252645',
    shadowCard: '0 1px 4px rgba(0,0,0,0.4)',
    shadowRoot: '0 2px 8px rgba(0,0,0,0.5)',
    edgeColors: ['rgba(108,95,255,0.65)', 'rgba(50,175,220,0.5)', 'rgba(139,106,240,0.45)'],
  },
  light: {
    canvas: '#111827',
    bgDots: '#8896a6',
    bgVariant: 'dots',
    shell: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    handle: '#64748b',
    selectionRing: '#3b82f6',
    textPrimary: '#111827',
    textMuted: '#6b7280',
    textUI: '#94a3b8',
    textHeading: '#f1f5f9',
    textSecondary: '#cbd5e1',
    bgHover: 'rgba(255,255,255,0.07)',
    bgAccent: '#3b82f6',
    progressTrack: '#1e293b',
    shadowCard: '0 2px 12px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)',
    shadowRoot: '0 4px 20px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
    edgeColors: ['rgba(255,255,255,0.6)', 'rgba(200,215,255,0.5)', 'rgba(190,180,255,0.4)'],
  },
};
