/// <reference types="jest" />
import { ASPECTS, clampTrim, compositionDuration, computeLayout, defaultDraft, END_CARD_SECONDS, enter, MAX_AD_SECONDS, suggestCopy } from '../adSpec';
import type { BrandDNA, Project } from '../types';

const brand: BrandDNA = {
  businessName: 'Café Linde',
  businessType: 'cafe',
  logoUri: null,
  style: 'warm',
  palette: ['#E8833A', '#3B1F0F', '#FFD9A8', '#5A3320'],
  font: 'modern',
  defaultFilter: 'brand',
  updatedAt: 0,
};

const video: Project = {
  id: 'v1',
  kind: 'video',
  mediaUri: 'file:///x/original.mp4',
  filterId: 'warm',
  filterBaked: false,
  status: 'draft',
  durationSec: 12.5,
  createdAt: 0,
};

describe('aspects', () => {
  it('exports 1080-wide frames with the right ratios', () => {
    expect(ASPECTS['9:16']).toMatchObject({ width: 1080, height: 1920 });
    expect(ASPECTS['4:5']).toMatchObject({ width: 1080, height: 1350 });
    expect(ASPECTS['1:1']).toMatchObject({ width: 1080, height: 1080 });
  });
});

describe('copy suggestions', () => {
  it('are German and goal-specific', () => {
    expect(suggestCopy('offer', brand).headline).toBe('Nur diese Woche');
    expect(suggestCopy('brand', brand).headline).toBe('Café Linde');
    expect(suggestCopy('product', brand).subline).toContain('Kaffee');
  });
});

describe('defaultDraft', () => {
  it('keeps the capture filter for videos and trims to the clip', () => {
    const d = defaultDraft(video, brand, 'product');
    expect(d.filterId).toBe('warm');
    expect(d.trimStart).toBe(0);
    expect(d.trimEnd).toBe(12.5);
    expect(d.endCard).toBe(true);
  });
  it('does not grade an in-camera photo twice', () => {
    const d = defaultDraft({ ...video, kind: 'photo', filterBaked: true }, brand, 'offer');
    expect(d.filterId).toBe('natural');
    expect(d.endCard).toBe(false);
  });
  it('caps long clips', () => {
    expect(defaultDraft({ ...video, durationSec: 300 }, brand, 'brand').trimEnd).toBe(MAX_AD_SECONDS);
  });
});

describe('clampTrim', () => {
  it('keeps at least 1 s and stays inside the clip', () => {
    expect(clampTrim(-3, 50, 10)).toEqual({ start: 0, end: 10 });
    expect(clampTrim(9.8, 9.9, 10)).toEqual({ start: 9, end: 10 });
    expect(clampTrim(4, 2, 10)).toEqual({ start: 4, end: 5 });
  });
});

describe('composition', () => {
  it('adds the outro card length', () => {
    const d = { ...defaultDraft(video, brand, 'product'), trimStart: 2, trimEnd: 7 };
    expect(compositionDuration(d)).toBeCloseTo(5 + END_CARD_SECONDS);
    expect(compositionDuration({ ...d, endCard: false })).toBe(5);
  });
});

describe('layout & motion', () => {
  it('only the offer goal gets a badge, inside the frame', () => {
    const l = computeLayout('offer', 1080, 1920);
    expect(l.badge).not.toBeNull();
    expect(l.badge!.cx + l.badge!.r).toBeLessThanOrEqual(1080);
    expect(computeLayout('product', 1080, 1350).badge).toBeNull();
    expect(computeLayout('brand', 1080, 1080).align).toBe('center');
  });
  it('enter() eases 0→1 and clamps', () => {
    expect(enter(0, 1)).toBe(0);
    expect(enter(5, 1)).toBe(1);
    const mid = enter(1.25, 1, 0.5);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(1);
  });
});
