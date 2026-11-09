import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { BrandDNA, VisualStyle } from '../../lib/types';

const KEY = 'brandcam.brand.v1';

/** Deterministic palette suggestions per style (no AI call involved). */
export const PALETTES: Record<VisualStyle, [string, string, string, string][]> = {
  luxury: [
    ['#C8A24A', '#1A1A1F', '#F2E8CF', '#2B2B33'],
    ['#B08D57', '#0F1B2D', '#E8DCC4', '#1E2A3F'],
    ['#D4AF37', '#3A0F1A', '#F5E9DA', '#5A1F2E'],
  ],
  modern: [
    ['#4F7CFF', '#0D1220', '#9FB8FF', '#1B2438'],
    ['#00C2A8', '#0B1A1A', '#8CF0E0', '#16302F'],
    ['#FF5A5F', '#16161A', '#FFB3B5', '#26262C'],
  ],
  warm: [
    ['#E8833A', '#3B1F0F', '#FFD9A8', '#5A3320'],
    ['#C65D3B', '#2A1510', '#F4C7A1', '#4A2A20'],
    ['#E9A23B', '#33200A', '#FFE3A3', '#573A15'],
  ],
  minimal: [
    ['#F5F5F2', '#111111', '#BDBDB5', '#2A2A2A'],
    ['#E6E2D8', '#1B1B1B', '#9C978A', '#333333'],
    ['#FFFFFF', '#0A0A0A', '#8E8E93', '#222222'],
  ],
  playful: [
    ['#FF4FA3', '#2B0F3A', '#FFD93D', '#4B1F63'],
    ['#7C5CFF', '#10163A', '#6BFFB8', '#1F2A66'],
    ['#FF7A2F', '#0F2A3A', '#3DDCFF', '#1B4560'],
  ],
};

export function defaultBrand(): BrandDNA {
  return {
    businessName: '',
    businessType: 'cafe',
    logoUri: null,
    style: 'modern',
    palette: PALETTES.modern[0],
    font: 'modern',
    defaultFilter: 'brand',
    updatedAt: Date.now(),
  };
}

/** Copy a picked image into app storage so it survives cache clears. */
export function persistLogo(srcUri: string): string {
  const dir = new Directory(Paths.document, 'brand');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = srcUri.split('.').pop()?.split('?')[0] || 'png';
  const dest = new File(dir, `logo-${Date.now()}.${ext}`);
  new File(srcUri).copy(dest);
  return dest.uri;
}

type Ctx = {
  ready: boolean;
  brand: BrandDNA | null;
  save: (b: BrandDNA) => Promise<void>;
  reset: () => Promise<void>;
};

const BrandContext = createContext<Ctx>({ ready: false, brand: null, save: async () => {}, reset: async () => {} });

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [brand, setBrand] = useState<BrandDNA | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setBrand(JSON.parse(raw) as BrandDNA);
      } catch {
        // Corrupt or missing storage → treat as first launch.
      }
      setReady(true);
    })();
  }, []);

  const save = useCallback(async (b: BrandDNA) => {
    const next = { ...b, updatedAt: Date.now() };
    setBrand(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const reset = useCallback(async () => {
    setBrand(null);
    await AsyncStorage.removeItem(KEY);
  }, []);

  const value = useMemo(() => ({ ready, brand, save, reset }), [ready, brand, save, reset]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);
