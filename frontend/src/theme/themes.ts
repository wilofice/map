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
  },
  light: {
    canvas: '#eef0f3',
    bgDots: '#c8cdd4',
    bgVariant: 'dots',
    shell: '#ffffff',
    surface: '#f4f5f7',
    border: '#dde0e4',
    card: '#ffffff',
    cardBorder: '#dde0e4',
    handle: '#9ca3af',
    selectionRing: '#2563eb',
    textPrimary: '#111827',
    textMuted: '#6b7280',
    textUI: '#4b5563',
    textHeading: '#111827',
    textSecondary: '#374151',
    bgHover: 'rgba(0,0,0,0.05)',
    bgAccent: '#2563eb',
    progressTrack: '#e5e7eb',
    shadowCard: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    shadowRoot: '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)',
  },
};
