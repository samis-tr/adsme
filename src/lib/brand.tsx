import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Category, LensId } from './lenses';

export type Brand = {
  category: Category;
  shopName: string;
  logoUri: string | null;
  defaultLens: LensId;
};

type Ctx = {
  ready: boolean;
  brand: Brand | null;
  save: (b: Brand) => Promise<void>;
  reset: () => Promise<void>;
};

const KEY = 'adsme.brand.v1';
const BrandContext = createContext<Ctx>({
  ready: false,
  brand: null,
  save: async () => {},
  reset: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setBrand(JSON.parse(raw) as Brand);
      } catch {
        // First launch or corrupted storage: fall through to onboarding.
      }
      setReady(true);
    })();
  }, []);

  const save = useCallback(async (b: Brand) => {
    setBrand(b);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(b));
    } catch {}
  }, []);

  const reset = useCallback(async () => {
    setBrand(null);
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ ready, brand, save, reset }), [ready, brand, save, reset]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);
