import type { FilterId } from './types';

export type FilterParams = {
  warmth: number;
  contrast: number;
  saturation: number;
  fade: number;
  vignette: number;
  tintAmount: number;
};

export const FILTER_PARAMS: Record<FilterId, FilterParams> = {
  natural: { warmth: 0, contrast: 1, saturation: 1, fade: 0, vignette: 0, tintAmount: 0 },
  warm: { warmth: 0.7, contrast: 1.05, saturation: 1.12, fade: 0.02, vignette: 0.25, tintAmount: 0 },
  crisp: { warmth: -0.1, contrast: 1.18, saturation: 1.2, fade: 0, vignette: 0.08, tintAmount: 0 },
  film: { warmth: 0.25, contrast: 0.95, saturation: 0.85, fade: 0.08, vignette: 0.35, tintAmount: 0.25 },
  noir: { warmth: 0, contrast: 1.35, saturation: 0, fade: 0.01, vignette: 0.55, tintAmount: 0 },
  brand: { warmth: 0.1, contrast: 1.08, saturation: 1.05, fade: 0.03, vignette: 0.3, tintAmount: 1 },
};

export const FILTER_ORDER: FilterId[] = ['natural', 'brand', 'warm', 'crisp', 'film', 'noir'];

export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Flat uniform array in shader declaration order (size is filled in per frame). */
export function buildUniforms(filter: FilterId, brandPrimary: string): number[] {
  const p = FILTER_PARAMS[filter];
  const [r, g, b] = hexToRgb01(brandPrimary);
  return [p.warmth, p.contrast, p.saturation, p.fade, p.vignette, p.tintAmount, 0, 0, r, g, b];
}
