import { Platform } from 'react-native';

export const colors = {
  bg: '#0A0A0F',
  surface: '#14141C',
  surfaceHigh: '#1D1D28',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',
  accent: '#8B5CF6',
  accentPressed: '#7C4DEB',
  accentGlow: 'rgba(139,92,246,0.35)',
  text: '#F5F5FA',
  textMuted: '#A3A3B8',
  textFaint: '#6B6B80',
  danger: '#FF5C7A',
  glass: 'rgba(20,20,28,0.55)',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const space = (n: number) => n * 4;

export const type = {
  display: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.5 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
} as const;

export const spring = { damping: 18, stiffness: 220, mass: 0.8 } as const;

export type FontToken = 'modern' | 'elegant' | 'friendly';
export const FONT_FAMILIES: Record<FontToken, string | undefined> = {
  modern: undefined, // platform sans
  elegant: Platform.select({ ios: 'Georgia', default: 'serif' }),
  friendly: Platform.select({ ios: 'Avenir Next', default: 'sans-serif-rounded' as string }),
};
