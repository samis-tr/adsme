import {
  FilterMode,
  matchFont,
  MipmapMode,
  Skia,
  TileMode,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { computeLayout, enter, type AdLayout } from '../../lib/adSpec';
import { buildUniforms, colorGradeEffect } from '../../lib/filters';
import type { AdDraft, BrandDNA } from '../../lib/types';
import { FONT_FAMILIES } from '../../ui/theme';

type Line = { text: string; width: number };

/**
 * Everything a frame needs, prepared on the JS thread.
 * Contains only plain data + Skia host objects so it can be captured by
 * worklets on the UI runtime (preview) and the export runtime.
 */
export type RenderSpec = {
  width: number;
  height: number;
  layout: AdLayout;
  goal: AdDraft['goal'];
  headline: Line[];
  subline: Line[];
  cta: Line | null;
  badgeText: Line[];
  brandName: Line;
  fonts: { headline: SkFont; subline: SkFont; cta: SkFont; badge: SkFont; endName: SkFont };
  primary: string;
  onPrimary: string;
  dark: string;
  uniforms: number[];
  effect: SkRuntimeEffect;
  logo: SkImage | null;
  showLogo: boolean;
  endCard: boolean;
  /** Seconds of real media before the outro card. */
  clipDuration: number;
  /** false → draw the settled state (still image export). */
  animated: boolean;
};

function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function font(family: string | undefined, size: number, weight: '400' | '600' | '700' | '800') {
  return matchFont({ fontFamily: family ?? Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }), fontSize: size, fontWeight: weight });
}

function wrap(f: SkFont, text: string, maxWidth: number, maxLines: number): Line[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: Line[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (f.measureText(next).width <= maxWidth || !cur) cur = next;
    else {
      lines.push({ text: cur, width: f.measureText(cur).width });
      cur = w;
    }
  }
  if (cur) lines.push({ text: cur, width: f.measureText(cur).width });
  return lines.slice(0, maxLines);
}

export async function loadLogo(uri: string | null): Promise<SkImage | null> {
  if (!uri) return null;
  try {
    const data = await Skia.Data.fromURI(uri);
    return Skia.Image.MakeImageFromEncoded(data);
  } catch {
    return null;
  }
}

export function buildRenderSpec(opts: {
  draft: AdDraft;
  brand: BrandDNA;
  width: number;
  height: number;
  logo: SkImage | null;
  clipDuration: number;
  animated: boolean;
}): RenderSpec {
  const { draft, brand, width, height } = opts;
  if (!colorGradeEffect) throw new Error('Colour grading shader failed to compile');
  const layout = computeLayout(draft.goal, width, height);
  const family = FONT_FAMILIES[brand.font];
  const fonts = {
    headline: font(family, layout.headlineSize, '800'),
    subline: font(family, layout.sublineSize, '600'),
    cta: font(family, layout.ctaSize, '700'),
    badge: font(family, Math.round(layout.sublineSize * 1.25), '800'),
    endName: font(family, Math.round(layout.headlineSize * 0.9), '800'),
  };
  const textWidth = width - layout.pad * 2;
  const isOffer = draft.goal === 'offer';
  const u = buildUniforms(draft.filterId, brand.palette[0]);
  u[6] = width;
  u[7] = height;
  const primary = brand.palette[0];
  return {
    width,
    height,
    layout,
    goal: draft.goal,
    headline: wrap(fonts.headline, draft.headline, textWidth, 3),
    // On the offer template the subline lives inside the badge.
    subline: isOffer ? [] : wrap(fonts.subline, draft.subline, textWidth, 2),
    badgeText: isOffer && layout.badge ? wrap(fonts.badge, draft.subline, layout.badge.r * 1.6, 3) : [],
    cta: draft.cta.trim() ? { text: draft.cta.trim(), width: fonts.cta.measureText(draft.cta.trim()).width } : null,
    brandName: { text: brand.businessName, width: fonts.endName.measureText(brand.businessName).width },
    fonts,
    primary,
    onPrimary: luminance(primary) > 0.45 ? '#111111' : '#FFFFFF',
    dark: brand.palette[1],
    uniforms: u,
    effect: colorGradeEffect,
    logo: opts.logo,
    showLogo: draft.showLogo,
    endCard: draft.endCard,
    clipDuration: opts.clipDuration,
    animated: opts.animated,
  };
}

/** Cover-fit the media into the frame and run it through the colour-grade shader. */
export function drawMedia(canvas: SkCanvas, img: SkImage, rotationDeg: number, spec: RenderSpec) {
  'worklet';
  const W = spec.width;
  const H = spec.height;
  const iw = img.width();
  const ih = img.height();
  const swap = rotationDeg === 90 || rotationDeg === 270;
  const dw = swap ? ih : iw;
  const dh = swap ? iw : ih;
  const s = Math.max(W / dw, H / dh);
  const m = Skia.Matrix();
  m.translate(W / 2, H / 2);
  m.rotate((rotationDeg * Math.PI) / 180);
  m.scale(s, s);
  m.translate(-iw / 2, -ih / 2);
  const child = img.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None, m);
  const paint = Skia.Paint();
  paint.setShader(spec.effect.makeShaderWithChildren(spec.uniforms, [child]));
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), paint);
}

function drawLines(
  canvas: SkCanvas,
  lines: { text: string; width: number }[],
  f: SkFont,
  size: number,
  lastBaseline: number,
  spec: RenderSpec,
  alpha: number,
  dy: number,
) {
  'worklet';
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#FFFFFF'));
  paint.setAlphaf(alpha);
  const lh = size * 1.08;
  for (let i = 0; i < lines.length; i++) {
    const y = lastBaseline - (lines.length - 1 - i) * lh + dy;
    const x = spec.layout.align === 'center' ? (spec.width - lines[i].width) / 2 : spec.layout.pad;
    canvas.drawText(lines[i].text, x, y, paint, f);
  }
}

function drawLogo(canvas: SkCanvas, spec: RenderSpec, cx: number, cy: number, size: number, alpha: number) {
  'worklet';
  if (!spec.logo) return;
  const lw = spec.logo.width();
  const lh = spec.logo.height();
  const s = size / Math.max(lw, lh);
  const w = lw * s;
  const h = lh * s;
  const paint = Skia.Paint();
  paint.setAlphaf(alpha);
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(cx - w / 2, cy - h / 2, w, h), size * 0.18, size * 0.18), 1, true);
  canvas.drawImageRect(spec.logo, Skia.XYWHRect(0, 0, lw, lh), Skia.XYWHRect(cx - w / 2, cy - h / 2, w, h), paint);
  canvas.restore();
}

function drawCta(canvas: SkCanvas, spec: RenderSpec, x: number, baselineTop: number, alpha: number) {
  'worklet';
  if (!spec.cta) return 0;
  const size = spec.layout.ctaSize;
  const padX = size * 0.9;
  const h = size * 2.1;
  const w = spec.cta.width + padX * 2;
  const left = spec.layout.align === 'center' ? (spec.width - w) / 2 : x;
  const bg = Skia.Paint();
  bg.setColor(Skia.Color(spec.primary));
  bg.setAlphaf(alpha);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(left, baselineTop, w, h), h / 2, h / 2), bg);
  const tp = Skia.Paint();
  tp.setColor(Skia.Color(spec.onPrimary));
  tp.setAlphaf(alpha);
  canvas.drawText(spec.cta.text, left + padX, baselineTop + h / 2 + size * 0.36, tp, spec.fonts.cta);
  return h;
}

/**
 * Draws one finished ad frame. Shared by the live preview, the MP4 export and the JPEG export,
 * so what the user previews is exactly what gets written to the file.
 */
export function drawAd(canvas: SkCanvas, media: SkImage | null, rotationDeg: number, t: number, spec: RenderSpec) {
  'worklet';
  const W = spec.width;
  const H = spec.height;
  const L = spec.layout;
  const time = spec.animated ? t : 1000;

  canvas.clear(Skia.Color(spec.dark));
  if (media) drawMedia(canvas, media, rotationDeg, spec);

  // Bottom scrim for legibility.
  const scrim = Skia.Paint();
  scrim.setShader(
    Skia.Shader.MakeLinearGradient(
      Skia.Point(0, H * (1 - L.scrim)),
      Skia.Point(0, H),
      [Skia.Color('rgba(0,0,0,0)'), Skia.Color('rgba(0,0,0,0.78)')],
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(Skia.XYWHRect(0, H * (1 - L.scrim), W, H * L.scrim), scrim);

  const a1 = enter(time, 0.2, 0.6);
  const a2 = enter(time, 0.45, 0.6);
  const a3 = enter(time, 0.8, 0.5);
  const lift = (1 - a1) * L.headlineSize * 0.5;

  // Brand mark.
  if (spec.showLogo) {
    if (spec.logo) {
      const cx = L.align === 'center' ? W / 2 : L.pad + L.logoSize / 2;
      drawLogo(canvas, spec, cx, L.pad + L.logoSize / 2 + (H / W > 1.5 ? L.logoSize * 0.6 : 0), L.logoSize, a2);
    } else {
      const p = Skia.Paint();
      p.setColor(Skia.Color('#FFFFFF'));
      p.setAlphaf(a2 * 0.95);
      const x = L.align === 'center' ? (W - spec.brandName.width * 0.5) / 2 : L.pad;
      canvas.save();
      canvas.translate(x, L.pad + L.sublineSize * 1.2 + (H / W > 1.5 ? L.logoSize * 0.6 : 0));
      canvas.scale(0.5, 0.5);
      canvas.drawText(spec.brandName.text, 0, 0, p, spec.fonts.endName);
      canvas.restore();
    }
  }

  // Offer badge.
  if (L.badge && spec.badgeText.length) {
    const s = 0.6 + 0.4 * enter(time, 0.1, 0.5);
    const bp = Skia.Paint();
    bp.setColor(Skia.Color(spec.primary));
    bp.setAlphaf(a1);
    canvas.save();
    canvas.translate(L.badge.cx, L.badge.cy);
    canvas.scale(s, s);
    canvas.rotate(-8, 0, 0);
    canvas.drawCircle(0, 0, L.badge.r, bp);
    const tp = Skia.Paint();
    tp.setColor(Skia.Color(spec.onPrimary));
    tp.setAlphaf(a1);
    const size = L.sublineSize * 1.25 * 1.1;
    const n = spec.badgeText.length;
    for (let i = 0; i < n; i++) {
      const line = spec.badgeText[i];
      canvas.drawText(line.text, -line.width / 2, (i - (n - 1) / 2) * size + size * 0.35, tp, spec.fonts.badge);
    }
    canvas.restore();
  }

  // Text block: subline under headline, CTA under both.
  const ctaH = spec.cta ? L.ctaSize * 2.1 : 0;
  const subH = spec.subline.length * L.sublineSize * 1.2;
  const headBaseline = L.textBottom - ctaH - subH - (spec.cta ? L.ctaSize : 0);
  if (L.align === 'left') {
    const bar = Skia.Paint();
    bar.setColor(Skia.Color(spec.primary));
    bar.setAlphaf(a1);
    const top = headBaseline - spec.headline.length * L.headlineSize * 1.08 + lift;
    canvas.drawRect(Skia.XYWHRect(L.pad, top - L.headlineSize * 0.35, L.headlineSize * 0.9, L.headlineSize * 0.12), bar);
  }
  drawLines(canvas, spec.headline, spec.fonts.headline, L.headlineSize, headBaseline, spec, a1, lift);
  if (spec.subline.length) {
    drawLines(canvas, spec.subline, spec.fonts.subline, L.sublineSize, headBaseline + subH + L.sublineSize * 0.2, spec, a2 * 0.92, (1 - a2) * 20);
  }
  drawCta(canvas, spec, L.pad, L.textBottom - ctaH, a3);

  // Branded outro card, cross-faded in after the clip.
  if (spec.endCard && spec.animated && t > spec.clipDuration) {
    const e = enter(t, spec.clipDuration, 0.45);
    const bg = Skia.Paint();
    bg.setColor(Skia.Color(spec.dark));
    bg.setAlphaf(e);
    canvas.drawRect(Skia.XYWHRect(0, 0, W, H), bg);
    const cy = H * 0.42;
    if (spec.logo) drawLogo(canvas, spec, W / 2, cy, L.logoSize * 2, e);
    const np = Skia.Paint();
    np.setColor(Skia.Color('#FFFFFF'));
    np.setAlphaf(e);
    const nameY = cy + (spec.logo ? L.logoSize * 1.5 : 0) + L.headlineSize * 0.4;
    canvas.drawText(spec.brandName.text, (W - spec.brandName.width) / 2, nameY, np, spec.fonts.endName);
    if (spec.cta) {
      const size = L.ctaSize;
      const w = spec.cta.width + size * 1.8;
      const h = size * 2.1;
      const left = (W - w) / 2;
      const top = nameY + L.headlineSize * 0.6;
      const cp = Skia.Paint();
      cp.setColor(Skia.Color(spec.primary));
      cp.setAlphaf(e);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(left, top, w, h), h / 2, h / 2), cp);
      const tp = Skia.Paint();
      tp.setColor(Skia.Color(spec.onPrimary));
      tp.setAlphaf(e);
      canvas.drawText(spec.cta.text, left + size * 0.9, top + h / 2 + size * 0.36, tp, spec.fonts.cta);
    }
  }
}
