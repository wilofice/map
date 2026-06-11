export type ThemeKey = 'ibm' | 'dusk';

export interface AppTheme {
  canvas: string;
  bgDots: string;
  shell: string;
  surface: string;
  border: string;
  card: string;
  cardBorder: string;
  handle: string;
  selectionRing: string;
  textPrimary: string;
  textMuted: string;
}

export const themes: Record<ThemeKey, AppTheme> = {
  ibm: {
    canvas: '#111111',
    bgDots: '#2d2d2d',
    shell: '#111111',
    surface: '#161616',
    border: '#2a2a2a',
    card: '#1e1e1e',
    cardBorder: '#333333',
    handle: '#525252',
    selectionRing: '#4589ff',
    textPrimary: '#e8e8e8',
    textMuted: '#6f6f6f',
  },
  dusk: {
    canvas: '#1a1b27',
    bgDots: '#252645',
    shell: '#13142a',
    surface: '#1e2038',
    border: '#30325a',
    card: '#282a40',
    cardBorder: '#383a5a',
    handle: '#39c759',
    selectionRing: '#6c5fff',
    textPrimary: '#e0e2f8',
    textMuted: '#7272a8',
  },
};
