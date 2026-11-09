export type LensId = 'cinema' | 'studio' | 'noir' | 'price';

export type Lens = {
  id: LensId;
  name: string;
  emoji: string;
  /** Colour wash laid over the viewfinder. */
  tint: string;
  tintOpacity: number;
  /** Edge darkening 0..1. */
  vignette: number;
  /** Extra darkening to fake contrast. */
  dim: number;
};

export const LENSES: Lens[] = [
  { id: 'cinema', name: 'Cinema Warm', emoji: '🎬', tint: '#FF8A3D', tintOpacity: 0.16, vignette: 0.35, dim: 0.04 },
  { id: 'studio', name: 'Studio Crisp', emoji: '🛍️', tint: '#BFE3FF', tintOpacity: 0.08, vignette: 0.08, dim: 0 },
  { id: 'noir', name: 'Barber Noir', emoji: '💈', tint: '#0B0B14', tintOpacity: 0.28, vignette: 0.6, dim: 0.14 },
  { id: 'price', name: 'Price Tag Live', emoji: '🏷️', tint: '#FFFFFF', tintOpacity: 0, vignette: 0.12, dim: 0 },
];

export type Category = 'restaurant' | 'barber' | 'clothing' | 'cars';

export const CATEGORIES: { id: Category; label: string; emoji: string; accent: string; lens: LensId }[] = [
  { id: 'restaurant', label: 'مطعم', emoji: '🍽️', accent: '#FFB05C', lens: 'cinema' },
  { id: 'barber', label: 'حلاق', emoji: '💈', accent: '#E8E8F0', lens: 'noir' },
  { id: 'clothing', label: 'ملابس', emoji: '👕', accent: '#7CC8FF', lens: 'studio' },
  { id: 'cars', label: 'سيارات', emoji: '🚗', accent: '#FF5C6C', lens: 'noir' },
];

export const lensById = (id: LensId) => LENSES.find((l) => l.id === id) ?? LENSES[0];
export const categoryById = (id: Category) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
