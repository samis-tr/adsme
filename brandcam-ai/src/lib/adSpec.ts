/**
 * Pure, deterministic ad template logic (no Skia, no React) — unit-testable.
 * Rendering (src/features/studio/render.ts) consumes these numbers.
 */
import type { AdDraft, AdGoal, AspectId, BrandDNA, BusinessType, Project } from './types';

export const ASPECTS: Record<AspectId, { width: number; height: number; label: string }> = {
  '9:16': { width: 1080, height: 1920, label: 'Story / Reel' },
  '4:5': { width: 1080, height: 1350, label: 'Feed' },
  '1:1': { width: 1080, height: 1080, label: 'Quadrat' },
};

export const ASPECT_ORDER: AspectId[] = ['9:16', '4:5', '1:1'];
export const END_CARD_SECONDS = 1.6;
export const MAX_AD_SECONDS = 60;

/** Deterministic German copy suggestions. Real AI copy arrives in phase 3. */
const TYPE_NOUN: Record<BusinessType, string> = {
  cafe: 'Kaffee',
  restaurant: 'Küche',
  bakery: 'Backstube',
  salon: 'Salon',
  fashion: 'Kollektion',
  auto: 'Modelle',
  other: 'Angebot',
};

export function suggestCopy(goal: AdGoal, brand: BrandDNA): Pick<AdDraft, 'headline' | 'subline' | 'cta'> {
  const noun = TYPE_NOUN[brand.businessType];
  switch (goal) {
    case 'product':
      return { headline: 'Neu bei uns', subline: `Frisch aus unserer ${noun}`, cta: 'Jetzt entdecken' };
    case 'offer':
      return { headline: 'Nur diese Woche', subline: '−20 % auf alles', cta: 'Vorbeikommen' };
    case 'brand':
      return { headline: brand.businessName, subline: `Deine ${noun} um die Ecke`, cta: 'Besuch uns' };
  }
}

export function defaultDraft(project: Project, brand: BrandDNA, goal: AdGoal): AdDraft {
  const duration = project.durationSec ?? 0;
  return {
    goal,
    ...suggestCopy(goal, brand),
    // Photos captured in-app already carry their filter; don't grade them twice.
    filterId: project.kind === 'photo' && project.filterBaked ? 'natural' : project.filterId,
    aspect: '9:16',
    showLogo: true,
    endCard: project.kind === 'video',
    trimStart: 0,
    trimEnd: Math.min(duration > 0 ? duration : MAX_AD_SECONDS, MAX_AD_SECONDS),
    originalAudio: true,
    updatedAt: Date.now(),
  };
}

export function clampTrim(start: number, end: number, duration: number, minLen = 1): { start: number; end: number } {
  const d = Math.max(duration, minLen);
  let s = Math.max(0, Math.min(start, d - minLen));
  let e = Math.max(s + minLen, Math.min(end, d));
  if (e - s > MAX_AD_SECONDS) e = s + MAX_AD_SECONDS;
  return { start: s, end: e };
}

/** Layout in output pixels, scaled from a 1080-wide reference. */
export type AdLayout = {
  pad: number;
  headlineSize: number;
  sublineSize: number;
  ctaSize: number;
  logoSize: number;
  /** Baseline of the last headline line. */
  textBottom: number;
  align: 'left' | 'center';
  /** Height of the bottom gradient scrim (0..1 of height). */
  scrim: number;
  /** Offer badge (offer goal only). */
  badge: { cx: number; cy: number; r: number } | null;
};

export function computeLayout(goal: AdGoal, width: number, height: number): AdLayout {
  const k = width / 1080;
  const tall = height / width > 1.5;
  const pad = Math.round(64 * k);
  const base = {
    pad,
    headlineSize: Math.round((tall ? 96 : 84) * k),
    sublineSize: Math.round(40 * k),
    ctaSize: Math.round(36 * k),
    logoSize: Math.round(120 * k),
    textBottom: height - Math.round((tall ? 300 : 210) * k),
    scrim: tall ? 0.5 : 0.6,
  };
  switch (goal) {
    case 'product':
      return { ...base, align: 'left', badge: null };
    case 'offer':
      return {
        ...base,
        align: 'left',
        badge: { cx: width - pad - Math.round(150 * k), cy: pad + Math.round(150 * k) + (tall ? Math.round(120 * k) : 0), r: Math.round(150 * k) },
      };
    case 'brand':
      return { ...base, align: 'center', headlineSize: Math.round((tall ? 104 : 90) * k), badge: null };
  }
}

/** Ease-out cubic progress of an element that starts at `start` and lasts `len` seconds. */
export function enter(t: number, start: number, len = 0.5): number {
  'worklet';
  const p = Math.min(1, Math.max(0, (t - start) / len));
  return 1 - Math.pow(1 - p, 3);
}

/** Total composition length in seconds. */
export function compositionDuration(draft: AdDraft): number {
  return draft.trimEnd - draft.trimStart + (draft.endCard ? END_CARD_SECONDS : 0);
}
